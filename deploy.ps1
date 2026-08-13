# Deploy Wordfire to Cloudflare Pages (wordfire.jonbailey.xyz)
# Remote circle needs DATABASE_URL on Pages (secret) + Neon serverless driver in build.
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Project = "wordfire-jonbailey"
$NeonSecret = Join-Path $env:USERPROFILE ".grok\secrets\neon-wordfire.env"

# Load DATABASE_URL for build-time migrate (Pages runtime uses wrangler secret).
if (-not $env:DATABASE_URL -and (Test-Path $NeonSecret)) {
  Get-Content $NeonSecret | ForEach-Object {
    if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
    if ($_ -match '^(DATABASE_URL)=(.*)$') {
      $env:DATABASE_URL = $Matches[2].Trim().Trim('"').Trim("'")
    }
  }
  if ($env:DATABASE_URL) {
    Write-Host "[DEPLOY] DATABASE_URL loaded for migrations (from neon-wordfire.env)" -ForegroundColor DarkGray
  }
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
