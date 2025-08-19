
$ErrorActionPreference = "Stop"
$root = Get-Location
$cfg = Join-Path $root "vite.config.ts"
if (!(Test-Path $cfg)) { Write-Host "vite.config.ts not found" ; exit 1 }
$txt = Get-Content -LiteralPath $cfg -Raw

# 1) Ensure VitePWA import exists (no-op if already there)
# 2) Add/patch VitePWA options to include injectManifest.maximumFileSizeToCacheInBytes and globIgnores for *.wasm
# We do a conservative regex-based replace that works for common shapes.

# Try to find 'VitePWA({' and inject 'injectManifest: {...}' block or merge into existing
if ($txt -match "VitePWA\(\s*\{"){
  if ($txt -notmatch "injectManifest\s*:"){
    # Insert a new injectManifest block after first '{' of VitePWA options
    $txt = $txt -replace "VitePWA\(\s*\{", "VitePWA({`n    injectManifest: { maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, globIgnores: ['**/*.wasm', '**/*.map'] },"
  } else {
    # Patch existing injectManifest: add/override keys
    $txt = $txt -replace "injectManifest\s*:\s*\{", "injectManifest: { maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, globIgnores: ['**/*.wasm', '**/*.map'],"
  }
} else {
  Write-Host "VitePWA plugin call not found—no changes made."
}

Set-Content -LiteralPath $cfg -Value $txt -Encoding UTF8
Write-Host "Patched vite.config.ts: excluded *.wasm from precache (or lowered max size to 3MB)."
