package handler

import (
	"strings"

	"github.com/gofiber/fiber/v2"

	"github.com/strelov1/freehire/internal/ingest/sources"
	"github.com/strelov1/freehire/internal/platform/db"
)

// RegisterJobSearcher mounts only the public catalogue API used by the job-search
// application. Account, application, and recruiting routes remain unavailable.
func RegisterJobSearcher(app *fiber.App, cfg Config) {
	tiers := cfg.RateTiers
	if tiers == nil {
		tiers = DefaultRateTiers()
	}
	tiers = tiers.inForce(cfg.PublicAnonStrict)

	queries := db.New(cfg.Pool)
	app.Get("/health", (&API{pool: cfg.Pool}).Health)
	gate := newPublicGate(cfg.Throttler, nil, publicGateConfig{
		Strict:    cfg.PublicAnonStrict,
		Tiers:     tiers,
		BotSecret: cfg.VerifiedBotSecret,
		Origin:    strings.TrimRight(cfg.FrontendOrigin, "/"),
	})
	mw := middleware{public: gate, throttler: cfg.Throttler}
	api := app.Group("/api/v1")
	readLimit := publicReadLimiter(gate)
	public := func(c *fiber.Ctx) error { return c.Next() }

	var jobSearch searcher
	var facets facetCounter
	var companySearch companySearcher
	var sitemapJobs, sitemapCompanies sitemapLister
	var sitemapFreshJobs freshSitemapLister
	if cfg.Search != nil {
		jobSearch = cfg.Search
		facets = cfg.Search
		companySearch = cfg.Search
		sitemapJobs = cfg.Search
		sitemapCompanies = companySitemapIndex{c: cfg.Search}
		sitemapFreshJobs = cfg.Search
	}
	searchH := newSearchHandlers(jobSearch, facets, queries, cfg.Cache, nil)
	searchH.removals = queries

	jobsH := newJobsHandlers(
		queries,
		nil,
		sources.PostingURLResolver{},
		cfg.Cache,
	)
	companiesH := newCompaniesHandlers(queries, companySearch)
	sitemapH := newSitemapHandlers(sitemapJobs, sitemapCompanies, sitemapFreshJobs)
	statsH := newStatsHandlers(queries, cfg.Cache, cfg.Pool)
	recentFeedH := newRecentFeedHandlers(cfg.RecentJobsFeed, cfg.Throttler)
	geoH := newGeoHandlers()
	suggestH := &suggestHandlers{suggest: cfg.Suggest}

	// Register literal routes before /jobs/:slug to keep them from being treated
	// as job identifiers.
	sitemapH.register(api, mw)
	api.Get("/jobs/search", readLimit, public, searchH.SearchJobs)
	api.Get("/jobs/facets", readLimit, searchH.JobFacets)
	api.Get("/jobs/:slug/similar", readLimit, searchH.SimilarJobs)
	api.Get("/jobs", readLimit, jobsH.ListJobs)
	api.Get("/jobs/:slug", readLimit, jobsH.GetJob)
	api.Get("/jobs/:slug/copies", readLimit, jobsH.JobCopies)

	// The companies endpoints are public catalogue reads. The pass-through optional
	// handler keeps their existing registration helper independent from auth.
	mw.optional = public
	companiesH.register(api, mw)

	api.Get("/stats/catalog", statsH.CatalogScale)
	suggestH.register(api, mw)
	geoH.register(api, mw)
	recentFeedH.register(api)
}
