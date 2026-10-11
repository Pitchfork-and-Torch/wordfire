# Deploy Wordfire to Cloudflare Pages (wordfire.jonbailey.xyz)
# Remote circle needs DATABASE_URL on Pages (secret) + Neon serverless driver in build.
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Project = "wordfire-jonbailey"

# Build-time migrate uses DATABASE_URL when this process has it.
# Pages runtime uses the wrangler secret. migrate.mjs skips when unset,
# which is safe for a build that does not add SQL.
if ([string]::IsNullOrWhiteSpace($env:DATABASE_URL)) {
  Write-Host "[WARN] DATABASE_URL unset. Remote migrate skipped. Pages secret unchanged." -ForegroundColor Yellow
}

Push-Location $Root
try {
  Write-Host "[DEPLOY] Building Wordfire (cloudflare_pages)..." -ForegroundColor Cyan
  $env:NITRO_PRESET = "cloudflare_pages"
  npm run build
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  Write-Host "[DEPLOY] Pages deploy project=$Project" -ForegroundColor Cyan
  npx --yes wrangler@4 pages deploy dist --project-name=$Project --branch main --commit-dirty=true
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
