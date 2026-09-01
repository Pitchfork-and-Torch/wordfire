# Deploy Wordfire to Cloudflare Pages (wordfire.jonbailey.xyz)
# Remote circle needs DATABASE_URL on Pages (secret) + Neon serverless driver in build.
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Project = "wordfire-jonbailey"

# Build-time migrate uses DATABASE_URL from the process environment.
# Pages runtime uses the wrangler secret. Exit if unset.
if ([string]::IsNullOrWhiteSpace($env:DATABASE_URL)) {
  throw "DATABASE_URL is not set in the environment."
}

Push-Location $Root
try {
  Write-Host "[DEPLOY] Building Wordfire (cloudflare_pages)..." -ForegroundColor Cyan
  $env:NITRO_PRESET = "cloudflare_pages"
  npm run build
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  Write-Host "[DEPLOY] Pages deploy project=$Project" -ForegroundColor Cyan
  npx --yes wrangler pages deploy dist --project-name=$Project --commit-dirty=true
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally {
  Pop-Location
}

Write-Host ""
Write-Host "Site:    https://wordfire.jonbailey.xyz/"
Write-Host "Preview: https://$Project.pages.dev/"
Write-Host "Remote:  https://wordfire.jonbailey.xyz/remote"
Write-Host "RTC:     https://wordfire.jonbailey.xyz/api/rtc"
Write-Host "ICE:     https://wordfire.jonbailey.xyz/api/ice  (STUN unless TURN_KEY_* Pages secrets)"
