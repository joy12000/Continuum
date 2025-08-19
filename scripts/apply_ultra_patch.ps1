
$ErrorActionPreference = "Stop"
$root = Get-Location
Write-Host "== Ultra delta patch =="

function Read-All($p){ if(Test-Path $p){ Get-Content -LiteralPath $p -Raw } else { $null } }
function Write-All($p,$s){ New-Item -ItemType Directory -Force -Path ([IO.Path]::GetDirectoryName($p)) | Out-Null; Set-Content -LiteralPath $p -Value $s -Encoding UTF8 }

# 1) vite.config.ts: exclude .wasm from PWA precache (Workbox 2MiB error fix)
$vite = Join-Path $root "vite.config.ts"
$txt = Read-All $vite
if ($txt) {
  if ($txt -match "VitePWA\(\s*\{") {
    if ($txt -notmatch "strategies\s*:\s*['""]injectManifest['""]") {
      $txt = $txt -replace "VitePWA\(\s*\{", "VitePWA({`n      strategies: `"injectManifest`","
    }
    if ($txt -notmatch "injectManifest\s*:") {
      $txt = $txt -replace "VitePWA\(\s*\{", "VitePWA({`n      injectManifest: { maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'], globIgnores: ['**/*.wasm','**/*.map'] },"
    } else {
      # merge/override core fields (idempotent-ish)
      $txt = $txt -replace "injectManifest\s*:\s*\{", "injectManifest: { maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'], globIgnores: ['**/*.wasm','**/*.map'],"
    }
    Write-All $vite $txt
    Write-Host "  * Patched vite.config.ts (WASM excluded from precache)."
  } else {
    Write-Host "  ! VitePWA call not found in vite.config.ts (skipped)."
  }
} else {
  Write-Host "  ! vite.config.ts not found (skipped)."
}

# 2) src/sw.ts: runtime cache for WASM
$sw = Join-Path $root "src\sw.ts"
$swTxt = Read-All $sw
if ($swTxt) {
  if ($swTxt -notmatch "from 'workbox-routing'") { $swTxt = "import { registerRoute } from 'workbox-routing';`n" + $swTxt }
  if ($swTxt -notmatch "from 'workbox-strategies'") { $swTxt = "import { CacheFirst } from 'workbox-strategies';`n" + $swTxt }
  if ($swTxt -notmatch "request\.destination === 'wasm'") {
$rule = @"
// runtime cache for large WASM (onnxruntime-web)
registerRoute(
  ({request, url}) => request.destination === 'wasm' || url.pathname.endsWith('.wasm'),
  new CacheFirst({ cacheName: 'wasm' })
);
"@
    $swTxt = $swTxt + "`n" + $rule
    Write-All $sw $swTxt
    Write-Host "  * Patched src/sw.ts (runtime WASM CacheFirst)."
  } else {
    Write-Host "  = src/sw.ts already has WASM runtime cache."
  }
} else {
  Write-Host "  ! src/sw.ts not found (skipped)."
}

# 3) Netlify config + redirects
$ntl = Join-Path $root "netlify.toml"
$ntlTxt = Read-All $ntl
if (-not $ntlTxt) {
$ntlTxt = @"
[build]
  command = "npm ci && npm run build"
  publish = "dist"
  functions = "netlify/functions"

[build.environment]
  NODE_VERSION = "20"

[[redirects]]
  from = "/api/generate"
  to = "/.netlify/functions/generate"
  status = 200
"@
  Write-All $ntl $ntlTxt
  Write-Host "  + Created netlify.toml"
} elseif ($ntlTxt -notmatch "/api/generate") {
  $ntlTxt += @"

[[redirects]]
  from = "/api/generate"
  to = "/.netlify/functions/generate"
  status = 200
"
  Write-All $ntl $ntlTxt
  Write-Host "  * Updated netlify.toml (redirects)."
}

$redir = Join-Path $root "public\_redirects"
if (-not (Test-Path $redir)) {
  Write-All $redir "/*  /index.html  200`n"
  Write-Host "  + Added public/_redirects"
}

# 4) Gemini paid proxy function
$fn = Join-Path $root "netlify\functions\generate.js"
if (-not (Test-Path (Split-Path $fn))) { New-Item -ItemType Directory -Force -Path (Split-Path $fn) | Out-Null }
Copy-Item -LiteralPath (Join-Path $PSScriptRoot "..\netlify\functions\generate.js") -Destination $fn -Force
Write-Host "  + Wrote netlify/functions/generate.js (Gemini proxy)."

# 5) Optional: default gen endpoint
$config = Join-Path $root "src\lib\config.ts"
$cfgTxt = Read-All $config
if ($cfgTxt -and $cfgTxt -match "genEndpoint") {
  $new = $cfgTxt -replace "genEndpoint\s*:\s*null", 'genEndpoint: "/api/generate"'
  if ($new -ne $cfgTxt) {
    Write-All $config $new
    Write-Host "  * Set default genEndpoint to /api/generate"
  }
}

Write-Host "== Done. Now set Netlify env: GEMINI_API_KEY, GEMINI_MODEL, NODE_VERSION=20 =="
