//go:build windows

package main

import (
	"fmt"

	"golang.org/x/sys/windows"
)

// statfsFree reports the bytes available to an unprivileged writer on the filesystem
// backing dir. It is the production probe for guardDisk.
//
// Windows counterpart of the Unix statfs probe: syscall.Statfs does not exist there,
// so the free space comes from GetDiskFreeSpaceEx. freeBytesAvailableToCaller is the
// same quantity as Unix's Bavail — space usable by a non-administrator writer — so the
// guard compares like with like across platforms.
func statfsFree(dir string) (uint64, error) {
	path, err := windows.UTF16PtrFromString(dir)
	if err != nil {
		return 0, fmt.Errorf("windows path %q: %w", dir, err)
	}
	var freeAvailable, total, totalFree uint64
	if err := windows.GetDiskFreeSpaceEx(path, &freeAvailable, &total, &totalFree); err != nil {
		return 0, err
	}
	return freeAvailable, nil
}
