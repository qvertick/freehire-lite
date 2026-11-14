package config

import (
	"runtime"
	"testing"
)

func TestResolveTypstBin(t *testing.T) {
	if got := resolveTypstBin(""); got != "" {
		t.Errorf("empty name should resolve to empty, got %q", got)
	}
	if got := resolveTypstBin("definitely-not-a-real-binary-xyz-123"); got != "" {
		t.Errorf("missing binary should resolve to empty (disables rendering), got %q", got)
	}
	// A binary that is present on every runner: "sh" on unix, "cmd" on Windows
	// (LookPath only finds an executable by its PATHEXT extension there). A
	// resolvable name yields an absolute path.
	onPath := "sh"
	if runtime.GOOS == "windows" {
		onPath = "cmd"
	}
	if got := resolveTypstBin(onPath); got == "" {
		t.Errorf("an on-PATH binary should resolve to a non-empty path (looked for %q)", onPath)
	}
}
