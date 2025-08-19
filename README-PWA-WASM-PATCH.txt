
이 패치는 Netlify 빌드 실패(Workbox: 2MiB 초과 자산) 원인인 거대 WASM(onnxruntime-web)을
PWA 프리캐시 대상에서 제외하거나(권장), 최대 파일 크기 제한을 늘리는 설정을 추가합니다.

사용법:
1) 이 ZIP을 프로젝트 루트에 풉니다.
2) PowerShell에서 프로젝트 루트로 이동 후:
   powershell -ExecutionPolicy Bypass -File scripts\apply_pwa_wasm_ignore.ps1
3) 커밋/푸시 → Netlify 재빌드

결과:
- vite.config.ts 내 VitePWA 옵션에
  injectManifest.maximumFileSizeToCacheInBytes=3MB, globIgnores=['**/*.wasm','**/*.map'] 추가/병합
- 거대 wasm은 precache에 안 실려서 Workbox 에러가 사라집니다.
- 오프라인에서 ONNX 추론은 불가하지만, 앱은 BM25/해시 또는 원격으로 정상 동작합니다.
