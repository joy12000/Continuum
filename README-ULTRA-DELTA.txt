
# Ultra Delta Patch (작게)
- PWA 프리캐시에서 .wasm 제외 (2MiB 에러 해결)
- WASM 런타임 캐시 규칙 추가 (최초 로드시 캐시 → 이후 오프라인 재사용)
- Netlify 설정/리다이렉트 및 Gemini 유료 프록시 함수 추가
- 필요 시 config.ts의 기본 genEndpoint를 /api/generate로 교정

## 적용
1) 프로젝트 루트에 이 ZIP 압축 해제
2) PowerShell:
   powershell -ExecutionPolicy Bypass -File scripts\apply_ultra_patch.ps1
3) Netlify 환경변수:
   - GEMINI_API_KEY (필수)
   - GEMINI_MODEL (예: gemini-2.5-flash)
   - NODE_VERSION=20
4) 커밋/푸시 → Netlify 빌드/배포
