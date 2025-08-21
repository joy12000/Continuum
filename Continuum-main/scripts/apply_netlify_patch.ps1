$ErrorActionPreference = "Stop"
$root = Get-Location
Write-Host "Applying Netlify proxy delta patch in $root"

function Ensure-Dir($p){ if (-not (Test-Path $p)) { New-Item -ItemType Directory -Force -Path $p | Out-Null } }

# 1) netlify.toml
Copy-Item -LiteralPath (Join-Path $PSScriptRoot "..\netlify.toml") -Destination (Join-Path $root "netlify.toml") -Force
Write-Host "  + netlify.toml"

# 2) function
$fnDir = Join-Path $root "netlify\functions"
Ensure-Dir $fnDir
Copy-Item -LiteralPath (Join-Path $PSScriptRoot "..\netlify\functions\generate.js") -Destination (Join-Path $fnDir "generate.js") -Force
Write-Host "  + netlify/functions/generate.js"

# 3) SPA redirects
$pubDir = Join-Path $root "public"
Ensure-Dir $pubDir
Copy-Item -LiteralPath (Join-Path $PSScriptRoot "..\public\_redirects") -Destination (Join-Path $pubDir "_redirects") -Force
Write-Host "  + public/_redirects"

# 4) default endpoint -> /api/generate
$configPath = Join-Path $root "src\lib\config.ts"
if (Test-Path $configPath) {
  $c = Get-Content -LiteralPath $configPath -Raw
  if ($c -match "genEndpoint:\s*null") {
    $c = $c -replace "genEndpoint:\s*null", "genEndpoint: \"/api/generate\""
    Set-Content -LiteralPath $configPath -Value $c -Encoding UTF8
    Write-Host "  * updated default genEndpoint -> /api/generate"
  } else {
    Write-Host "  = genEndpoint default already set"
  }
} else {
  Write-Host "  ! src/lib/config.ts not found (skipped)"
}

Write-Host "Done. Set Netlify env: API_KEY, MODEL_ENDPOINT, NODE_VERSION=20"
