//go:build unix

package main

import "syscall"

// statfsFree reports the bytes available to an unprivileged writer on the filesystem
// backing dir. It is the production probe for guardDisk.
//
// Unix-only: syscall.Statfs has no Windows equivalent. The Windows probe lives in
// diskguard_windows.go and reports the same quantity via GetDiskFreeSpaceEx.
func statfsFree(dir string) (uint64, error) {
	var st syscall.Statfs_t
	if err := syscall.Statfs(dir, &st); err != nil {
		return 0, err
	}
	// Bavail (not Bfree) is the space usable by non-root writers — what Meilisearch
	// actually gets.
	return st.Bavail * uint64(st.Bsize), nil
}
