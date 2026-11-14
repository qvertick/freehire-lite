package handler

import (
	"os"
	"os/exec"
	"testing"
)

// requirePDFTool skips a poppler-dependent test when pdftotext is not on PATH —
// a stock Windows host has no poppler, and the rest of the suite still runs
// there. Under CI it fails instead: .github/workflows/ci.yml installs
// poppler-utils in every job that runs tests, so a missing binary means that
// step broke, and a silent skip would hide it rather than surface it.
//
// A missing pdftotext says nothing about the PDF parser itself: this helper only
// gates the tests that need the external tool, so a parser regression still
// fails the tests that do not.
func requirePDFTool(t *testing.T) {
	t.Helper()
	if _, err := exec.LookPath("pdftotext"); err != nil {
		if os.Getenv("CI") != "" {
			t.Fatalf("pdftotext not on PATH although CI is set (the poppler-utils install step in .github/workflows/ci.yml did not take effect): %v", err)
		}
		t.Skipf("pdftotext not on PATH (%v); install poppler-utils to run this test", err)
	}
}
