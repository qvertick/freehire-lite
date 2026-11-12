package main

import (
	"go/ast"
	"go/parser"
	"go/token"
	"testing"
)

// TestJobSearcherConfigIsWiredThrough guards the hand-written copy from config.Settings
// into handler.Config. A field the server forgets here compiles, passes vet and passes
// every test that builds a handler directly — and reaches production as a zero value.
//
// The literal is inspected as source rather than exercised, because building it needs a
// database, Redis and Meilisearch — none of which this invariant depends on.
func TestJobSearcherConfigIsWiredThrough(t *testing.T) {
	wired := fieldsSetInHandlerConfigLiteral(t)

	for _, name := range []string{
		"Pool",
		"Throttler",
		"Cache",
		"RateTiers",
		"FrontendOrigin",
		"PublicAnonStrict",
		"VerifiedBotSecret",
		"Search",
		"Suggest",
		"RecentJobsFeed",
	} {
		if !wired[name] {
			t.Errorf("handler.Config{...} in main.go never sets %s — the Job Searcher "+
				"catalogue surface reads it, so it would run on the zero value", name)
		}
	}
}

// fieldsSetInHandlerConfigLiteral reads main.go and reports which fields the handler.Config
// composite literal names.
func fieldsSetInHandlerConfigLiteral(t *testing.T) map[string]bool {
	t.Helper()
	file, err := parser.ParseFile(token.NewFileSet(), "main.go", nil, 0)
	if err != nil {
		t.Fatalf("parse main.go: %v", err)
	}
	set := map[string]bool{}
	ast.Inspect(file, func(n ast.Node) bool {
		lit, ok := n.(*ast.CompositeLit)
		if !ok {
			return true
		}
		sel, ok := lit.Type.(*ast.SelectorExpr)
		if !ok || sel.Sel.Name != "Config" {
			return true
		}
		if pkg, ok := sel.X.(*ast.Ident); !ok || pkg.Name != "handler" {
			return true
		}
		for _, elt := range lit.Elts {
			if kv, ok := elt.(*ast.KeyValueExpr); ok {
				if key, ok := kv.Key.(*ast.Ident); ok {
					set[key.Name] = true
				}
			}
		}
		return true
	})
	if len(set) == 0 {
		t.Fatal("found no handler.Config literal in main.go — the test cannot see what it checks")
	}
	return set
}
