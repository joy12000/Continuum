# Netlify 배포 가이드 (서버리스 프록시 포함)

## 1) 이 패치가 해주는 것
- Netlify Functions로 **/api/generate** 프록시를 추가합니다.
- `netlify.toml`로 빌드/배포 설정과 리다이렉트를 구성합니다.
- SPA 새로고침 404 방지를 위해 `public/_redirects`를 추가합니다.
- (선택 적용) 설정 기본값의 Generate API를 **/api/generate**로 맞춥니다.

## 2) Netlify 환경변수 설정 (대시보드 → Site settings → Environment)
- `NODE_VERSION=20`
- `API_KEY=<외부 LLM/서비스 키>`
- `MODEL_ENDPOINT=<외부 LLM API URL>`

## 3) 프론트엔드
- 앱 설정(고급)에서 Generate Endpoint를 `/api/generate`로 두면, **브라우저 → Netlify Function → 실제 API** 경로로 호출됩니다.

## 4) 배포
- GitHub 연결 후 자동으로 `npm ci && npm run build` 실행, `dist/`를 배포합니다.
