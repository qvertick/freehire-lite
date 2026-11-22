package main

import "github.com/strelov1/freehire/internal/dict/skilltag"

// Two vocabularies that are too big to sit in contracts.ts.
//
// contracts.ts holds the wire types and the closed vocabularies, and nearly every
// module in the app imports something from it — so it is on the critical path of
// every page. Two of the things inside it are not three words each:
//
//   - SKILL_LABELS is the slug→display-name catalog of every skill the dictionary
//     knows (~31 kB of source).
//   - FACET_ALIASES is the shorthand→role table the facet picker's search reads
//     (~96 kB of source, mostly job titles in a dozen languages).
//
// Together they were a third of the module, and a page that wanted one three-word
// constant paid for both. They are split the way skillDescriptions.ts and
// skillAliases.ts already are: one vocabulary, one module.
//
// The consumers move with them, and that is the whole trick: a re-export from
// contracts.ts would be a static import, and the tables would ride along exactly
// as before. Importing from the new modules is what actually keeps them out of a
// page that does not read them.
//
// The split is a size decision, not a correctness one. The values are the same
// values read from the same dictionaries, so nothing can drift; the type aliases
// come along with the constants (emitMap and emitMapOfSlices emit both).

const skillLabelsPath = "web/src/lib/generated/skillLabels.ts"

// genSkillLabels renders the skill slug→display-name catalog as a standalone module.
func genSkillLabels() string {
	return header + emitMap("SkillLabels", "SKILL_LABELS", skilltag.Labels())
}

const facetAliasesPath = "web/src/lib/generated/facetAliases.ts"

// genFacetAliases renders the facet shorthand→role table as a standalone module.
func genFacetAliases() string {
	return header + emitMapOfSlices("FacetAliases", "FACET_ALIASES", facetAliases())
}
