# Smoke test for the Job Searcher API routes on a local Windows run.
#
#   powershell -ExecutionPolicy Bypass -File scripts/windows-smoke.ps1
#
# Assumes the API is already listening on $BaseUrl (default http://127.0.0.1:8080).
# Exits non-zero if any route answers with a 5xx or a connection error; a 4xx counts
# as "route is mounted and answered" — the public catalogue is empty on a fresh
# database, so some reads legitimately return no rows.

param(
  [string]$BaseUrl = 'http://127.0.0.1:8080'
)

$ErrorActionPreference = 'Stop'

$routes = @(
  @{ Name = 'health';                 Path = '/health' }
  @{ Name = 'jobs list';              Path = '/api/v1/jobs' }
  @{ Name = 'jobs search';            Path = '/api/v1/jobs/search?q=golang' }
  @{ Name = 'jobs facets';            Path = '/api/v1/jobs/facets' }
  @{ Name = 'companies list';         Path = '/api/v1/companies' }
  @{ Name = 'company subindustries';  Path = '/api/v1/companies/subindustries' }
  @{ Name = 'catalog stats';          Path = '/api/v1/stats/catalog' }
  @{ Name = 'suggest';                Path = '/api/v1/suggest?q=go' }
  @{ Name = 'geo cities';             Path = '/api/v1/geo/cities?q=Warsaw' }
  @{ Name = 'jobs sitemap';           Path = '/api/v1/jobs/sitemap' }
  @{ Name = 'jobs sitemap fresh';     Path = '/api/v1/jobs/sitemap/fresh' }
  @{ Name = 'jobs sitemap bounds';    Path = '/api/v1/jobs/sitemap/boundaries' }
)

$failed = 0

foreach ($route in $routes) {
  $url = $BaseUrl + $route.Path
  try {
    $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 20
    $status = $response.StatusCode
    $body = $response.Content
  } catch {
    if ($_.Exception.Response) {
      $status = [int]$_.Exception.Response.StatusCode
      $body = ''
    } else {
      Write-Host ("FAIL  {0,-22} {1} -> {2}" -f $route.Name, $route.Path, $_.Exception.Message) -ForegroundColor Red
      $failed++
      continue
    }
  }

  if ($status -ge 500) {
    Write-Host ("FAIL  {0,-22} {1} -> HTTP {2}" -f $route.Name, $route.Path, $status) -ForegroundColor Red
    $failed++
    continue
  }

  $preview = if ($body) { ($body -replace '\s+', ' ').Substring(0, [Math]::Min(90, $body.Length)) } else { '(empty body)' }
  Write-Host ("OK    {0,-22} {1} -> HTTP {2}  {3}" -f $route.Name, $route.Path, $status, $preview) -ForegroundColor Green
}

Write-Host ''
if ($failed -gt 0) {
  Write-Host "$failed route(s) failed." -ForegroundColor Red
  exit 1
}
Write-Host 'All routes answered.' -ForegroundColor Green
