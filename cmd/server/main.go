package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/logger"
	recovermiddleware "github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/redis/go-redis/v9"

	"github.com/strelov1/freehire/internal/api/handler"
	"github.com/strelov1/freehire/internal/api/ratelimit"
	"github.com/strelov1/freehire/internal/job/recentfeed"
	"github.com/strelov1/freehire/internal/platform/cache"
	"github.com/strelov1/freehire/internal/platform/config"
	"github.com/strelov1/freehire/internal/platform/database"
	"github.com/strelov1/freehire/internal/platform/db"
	"github.com/strelov1/freehire/internal/platform/observability"
	"github.com/strelov1/freehire/internal/search/search"
	"github.com/strelov1/freehire/internal/search/suggest"
)

func main() { os.Exit(runMain()) }

func runMain() int {
	cfg := config.Load()
	shutdown, err := observability.InitLogs("freehire-api")
	if err != nil {
		log.Printf("exception reporting: %v", err)
		return 1
	}
	defer shutdown()
	defer func() {
		if value := recover(); value != nil {
			observability.CapturePanic(context.Background(), value)
			panic(value)
		}
	}()
	if err := runServer(cfg); err != nil {
		observability.CaptureError(context.Background(), err)
		log.Print(err)
		return 1
	}
	return 0
}

func runServer(cfg config.Settings) error {
	if err := cfg.ValidateJobSearcher(); err != nil {
		return fmt.Errorf("invalid configuration: %w", err)
	}
	// API_RATE_<TIER>_PER_MINUTE/_PER_DAY apply here, before the pool opens, so a typo
	// fails the boot instead of silently enforcing a different figure than the operator
	// set. RegisterJobSearcher only falls back to DefaultRateTiers when this is nil, and
	// that fallback exists for tests, not for the server.
	rateTiers, err := handler.RateTiersFromEnv(os.Getenv, cfg.StrictAnonLimits())
	if err != nil {
		return fmt.Errorf("invalid configuration: %w", err)
	}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	pool, err := database.Connect(ctx, cfg.DatabaseURL, database.WithStatementTimeout(apiStatementTimeout))
	if err != nil {
		return fmt.Errorf("database: %w", err)
	}
	defer pool.Close()

	redisOpts, err := redis.ParseURL(cfg.RedisURL)
	if err != nil {
		return fmt.Errorf("redis: %w", err)
	}
	redisClient := redis.NewClient(redisOpts)
	defer func() { _ = redisClient.Close() }()

	app := fiber.New(fiber.Config{
		AppName:                 "Job Searcher",
		ReadTimeout:             10 * time.Second,
		WriteTimeout:            10 * time.Second,
		ReadBufferSize:          16 * 1024,
		ErrorHandler:            observability.CountErrors(handler.RenderError),
		ProxyHeader:             "X-Real-IP",
		EnableTrustedProxyCheck: true,
		TrustedProxies:          ratelimit.TrustedCIDRs,
	})
	app.Use(observability.HTTPMetrics())
	app.Use(observability.RequestIDs())
	app.Use(recovermiddleware.New(recovermiddleware.Config{
		EnableStackTrace:  true,
		StackTraceHandler: handler.ReportPanic,
	}))
	app.Use(logger.New(logger.Config{
		DisableColors: true,
		Format:        "${time} | ${status} | ${latency} | ${ip} | ${method} | ${path} | ${error} | request_id=${locals:diagnostics.request_id}\n",
	}))

	var searchClient *search.Client
	var suggestSvc *suggest.Service
	if cfg.MeiliKey != "" {
		searchClient = search.NewClient(cfg.MeiliURL, cfg.MeiliKey)
		suggestSvc = suggest.New(suggest.NewIndex(searchClient))
		startSuggestRefresh(ctx, suggestSvc)
	}

	recentFeedBroadcaster := recentfeed.NewBroadcaster(recentFeedRingBufferSize)
	recentFeedPoller := recentfeed.NewPoller(db.New(pool), recentFeedBroadcaster, recentFeedBatchSize)
	go recentFeedPoller.Run(ctx, recentFeedPollInterval)

	handler.RegisterJobSearcher(app, handler.Config{
		Pool:              pool,
		Throttler:         ratelimit.NewRedisThrottler(redisClient),
		Cache:             cache.NewRedisCache(redisClient),
		RateTiers:         rateTiers,
		FrontendOrigin:    cfg.FrontendOrigin,
		PublicAnonStrict:  cfg.StrictAnonLimits(),
		VerifiedBotSecret: cfg.VerifiedBotSecret,
		Search:            searchClient,
		Suggest:           suggestSvc,
		RecentJobsFeed:    recentFeedBroadcaster,
	})

	prometheus.MustRegister(observability.NewPoolCollector(pool))
	observability.StartMetricsServer(cfg.MetricsPort)

	serveErr := make(chan error, 1)
	go func() { serveErr <- app.Listen(":" + cfg.Port) }()
	log.Printf("Job Searcher API listening on :%s", cfg.Port)

	select {
	case <-ctx.Done():
	case err := <-serveErr:
		if err != nil {
			return fmt.Errorf("listen: %w", err)
		}
	}
	log.Println("shutting down...")
	if err := app.ShutdownWithTimeout(10 * time.Second); err != nil {
		return fmt.Errorf("shutdown: %w", err)
	}
	return nil
}

const (
	apiStatementTimeout      = 30 * time.Second
	recentFeedRingBufferSize = 15
	recentFeedPollInterval   = 10 * time.Second
	recentFeedBatchSize      = 500
	suggestRefreshInterval   = time.Hour
)

func startSuggestRefresh(ctx context.Context, svc *suggest.Service) {
	go func() {
		t := time.NewTicker(suggestRefreshInterval)
		defer t.Stop()
		for {
			if err := svc.Refresh(ctx); err != nil {
				log.Printf("suggest: refresh: %v", err)
			}
			select {
			case <-ctx.Done():
				return
			case <-t.C:
			}
		}
	}()
}
