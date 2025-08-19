# Gemini (유료) API 연동 델타

## 설정
- Netlify 환경변수:
  - `GEMINI_API_KEY` (필수)
  - `GEMINI_MODEL`   = `gemini-2.5-flash` | `gemini-2.5-pro` | `gemini-2.5-flash-lite` (기본: flash)
  - `TIMEOUT_MS`     (선택, 기본 30000)

## 테스트
npx netlify dev
curl -X POST http://localhost:8888/api/generate -H "Content-Type: application/json" -d "{"question":"한 문단 요약","contexts":["문단A","문단B"]}"
