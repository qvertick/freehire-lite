package handler

import (
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
)

func TestRegisterJobSearcherExposesOnlyCatalogueRoutes(t *testing.T) {
	app := fiber.New()
	RegisterJobSearcher(app, Config{})

	routes := map[string]bool{}
	for _, route := range app.GetRoutes(true) {
		routes[route.Method+" "+route.Path] = true
	}

	for _, route := range []string{
		"GET /health",
		"GET /api/v1/jobs/search",
		"GET /api/v1/jobs/facets",
		"GET /api/v1/jobs/:slug/similar",
		"GET /api/v1/jobs",
		"GET /api/v1/jobs/:slug",
		"GET /api/v1/jobs/:slug/copies",
		"GET /api/v1/companies",
		"GET /api/v1/companies/subindustries",
		"GET /api/v1/companies/:slug",
		"GET /api/v1/companies/:slug/hiring",
		"GET /api/v1/companies/:slug/closed-jobs",
		"GET /api/v1/geo/cities",
		"GET /api/v1/suggest",
		"GET /api/v1/feed/recent",
		"GET /api/v1/jobs/sitemap",
		"GET /api/v1/jobs/sitemap/fresh",
		"GET /api/v1/jobs/sitemap/boundaries",
		"GET /api/v1/companies/sitemap",
		"GET /api/v1/companies/sitemap/boundaries",
		"GET /api/v1/stats/catalog",
	} {
		if !routes[route] {
			t.Errorf("missing public route %q", route)
		}
	}

	for route := range routes {
		if strings.Contains(route, "/auth") ||
			strings.Contains(route, "/me/") ||
			strings.Contains(route, "/jobs/find") ||
			strings.Contains(route, "/direct-apply") ||
			strings.Contains(route, "/auto-apply") ||
			strings.Contains(route, "/apply-form") ||
			strings.Contains(route, "/employer") ||
			strings.Contains(route, "/referral") {
			t.Errorf("unexpected account or recruitment route %q", route)
		}
	}
}
