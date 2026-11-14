# Run the Job Searcher API natively on Windows.
#
#   powershell -ExecutionPolicy Bypass -File scripts/windows-api.ps1
#
# Sets every variable the server needs for a local run against the Windows-local
# service stack (DockerCompose.windows.yml) and execs the binary. The services are
# reached on localhost because WSL2 forwards their published ports.
#
# Override any value from the calling shell before running this script — the
# assignments below only fill in what is not already set.

param(
  [switch]$Build,   # rebuild bin/hire.exe before starting
  [switch]$Run      # run the built binary (default when it exists)
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Set-DefaultEnv([string]$name, [string]$value) {
  if ([string]::IsNullOrEmpty([Environment]::GetEnvironmentVariable($name))) {
    [Environment]::SetEnvironmentVariable($name, $value)
  }
}

Set-DefaultEnv 'DATABASE_URL'  'postgres://hire:hire@127.0.0.1:5432/hire?sslmode=disable'
Set-DefaultEnv 'REDIS_URL'     'redis://127.0.0.1:6379/0'
Set-DefaultEnv 'MEILI_URL'     'http://127.0.0.1:7700'
Set-DefaultEnv 'MEILI_MASTER_KEY' 'dev-insecure-meili-key'
Set-DefaultEnv 'JWT_SECRET'    'dev-insecure-secret-change-me-0123456789'
Set-DefaultEnv 'PORT'          '8080'
Set-DefaultEnv 'FRONTEND_ORIGIN' 'http://localhost:5173'
Set-DefaultEnv 'ENV'           'development'

if ($Build) {
  Write-Host 'building bin/hire.exe ...'
  go build -o bin/hire.exe ./cmd/server
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

$binary = Join-Path $root 'bin\hire.exe'
if (-not (Test-Path $binary)) {
  Write-Host 'building bin/hire.exe ...'
  go build -o bin/hire.exe ./cmd/server
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host "Job Searcher API -> http://127.0.0.1:$($env:PORT)"
& $binary
exit $LASTEXITCODE
