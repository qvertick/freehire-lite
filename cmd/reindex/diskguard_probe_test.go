package main

import "testing"

// TestStatfsFree_MeasuresARealDirectory exercises the platform probe itself; the tests
// above inject one. Both failure modes the injected probes cannot catch are visible
// here: a 0-byte answer would make guardDisk refuse every rebuild, and a faked large
// answer would silently disable the guard. Every supported build tag (unix, windows)
// provides an implementation — diskguard_other.go exists only for platforms cmd/reindex
// does not build on.
func TestStatfsFree_MeasuresARealDirectory(t *testing.T) {
	dir := t.TempDir()

	free, err := statfsFree(dir)
	if err != nil {
		t.Fatalf("statfsFree(%q): %v", dir, err)
	}
	if free == 0 {
		t.Fatalf("statfsFree(%q) reported 0 bytes free; guardDisk would refuse every rebuild", dir)
	}
}
