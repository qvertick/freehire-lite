//go:build !unix && !windows

package main

import "fmt"

// statfsFree is the fallback probe for platforms with neither statfs(2) nor the
// Windows GetDiskFreeSpaceEx API. It always fails, which makes guardDisk fail open
// (it logs and skips the guard) — the documented behaviour for a dir it cannot
// measure.
func statfsFree(dir string) (uint64, error) {
	return 0, fmt.Errorf("free-space probe is not implemented on this platform")
}
