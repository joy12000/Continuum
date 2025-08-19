
# Continuum (MVP)

온디바이스 하이브리드 검색(PWA) MVP

## 실행

```bash
# Node 18+ 추천
npm i
npm run dev
# 빌드
npm run build
npm run preview
```

## 기능
- PWA(오프라인/설치/자동 업데이트)
- IndexedDB(Dexie) 저장
- BM25 키워드 검색 + (후속) 시맨틱 검색
- RRF 융합 (현재는 BM25 단독 사용, 시맨틱 추가 예정)
- AES-GCM 암호화 백업/복원

## 배포
- Netlify / GitHub Pages 등 정적 호스팅

## 시맨틱 검색(선택)
- `onnxruntime-web` 추가 후 `src/lib/search/semantic.ts` 대체 구현
- 모델 파일은 `/public/models`에 두고, 최초 로드 후 오프라인 캐시


## 시맨틱 검색 (즉시 작동 · 모델 불필요)
- 기본값은 **문자 n-gram 해싱 임베딩**으로 동작합니다. 설치 없이 바로 의미 유사도(의사 시맨틱)를 제공합니다.
- BM25와 **RRF 융합**으로 최종 랭킹을 만듭니다.

## 진짜 임베딩(선택 · ONNXRuntime)
- `/public/models/` 아래 두 파일을 배치하면 자동으로 **onnxruntime-web** 경로를 사용합니다.
  - `tokenizer.json` (Hugging Face Tokenizers 포맷)
  - `encoder.onnx` (문장 임베딩 모델, last_hidden_state 사용 가정)
- 모델을 넣지 않아도 앱은 해시 임베딩으로 잘 동작합니다.


## Web Share Target (안드로이드 PWA 공유)
- 앱을 설치(PWA)한 뒤, 브라우저/다른 앱에서 "공유" → "Continuum"을 선택하면
  `/share?title=...&text=...&url=...`으로 열리고 자동으로 노트가 생성됩니다.
- 현재는 GET 방식(텍스트/URL 공유)만 처리합니다. 파일 공유(이미지 등)는 추후 POST + SW 핸들링으로 확장 가능합니다.

## 실시간 갱신 (Dexie liveQuery)
- 폴링 대신 `liveQuery`로 DB 변화가 즉시 화면에 반영됩니다.


## 원격 시맨틱(무료 API 하이브리드) 사용법

1) **프록시 배포(Cloudflare Workers)**  
   - 아래 템플릿(zip)을 참고해 배포 → 환경변수 `GOOGLE_API_KEY` 등록, `MODEL_ID`(기본: `text-embedding-004`) 설정 가능.
   - 로컬 개발 시 `wrangler dev`가 보통 `http://127.0.0.1:8787`에서 뜹니다.

2) **프론트엔드 연결**  
   - 개발: `VITE_API_BASE=http://127.0.0.1:8787` 를 `npm run dev` 전에 설정(또는 `.env` 파일).  
   - 배포: 워커를 같은 도메인 경로 `/api`로 라우팅하면 추가 설정 없이 동작.

3) **엔진 스위치**  
   - 앱 설정 카드에서 `로컬(자동)` ↔ `원격(API)`를 선택.  
   - 네트워크 에러/쿼터 초과 시 로컬로 전환 권장.

> 보안: 브라우저에 비밀 키를 절대 넣지 말 것. 키는 반드시 프록시에만 보관.


## 파일 공유(POST) — 이미지까지 캡처
- PWA 설치 후, 안드로이드에서 "공유" → "Continuum" 선택 시 이미지/파일도 함께 전송됩니다.
- 서비스워커가 `/share` POST를 받아 **임시 큐(IndexedDB)**에 저장하고, 앱이 이를 즉시 노트+첨부로 변환합니다.

## 첨부 미디어
- 각 노트 카드에 이미지 썸네일이 표시됩니다(클릭 시 원본 보기).

## 회상 카드
- 홈 상단에 "오늘 요약" / "작년 오늘" 카드가 표시됩니다.


## 파일 공유(POST) — 서비스워커
- 안드로이드에서 이미지/파일을 이 앱으로 "공유"하면, 서비스워커가 `multipart/form-data`를 받아
  **IndexedDB 큐**에 저장하고 홈으로 리디렉션합니다. 앱은 부팅 시/신호 수신 시 큐를 비우고 노트를 생성합니다.
- 첨부 이미지는 노트 카드에서 썸네일로 미리보기 됩니다.

## 리치 텍스트
- TipTap 기반 서식 입력(볼드/이탤릭/리스트). 저장은 HTML로, 색인(BM25/시맨틱)은 **HTML 제거 후 텍스트**로 처리합니다.

## 회상 카드
- "오늘" / "작년 오늘" / "인기 스레드(태그)" 카드를 홈 상단에 표시합니다.


## 온디바이스 임베딩(ONNX) 온보딩
1) 모델 파일 준비: `encoder.onnx` + `tokenizer.json` (동일 계열 모델)
2) `public/models/` 폴더에 배치 후 빌드/배포
3) 앱 상단 상태에서 `로컬 임베딩 준비 완료(onnxruntime)`가 보이면 성공
   - 실패 시 `로컬 임베딩 없음(해시 사용)`으로 폴백

> 토크나이저/모델 호환은 필수입니다. Sentence-Transformers 계열 ONNX를 권장.


## 성능: 임베딩 Web Worker 분리
- 시맨틱 임베딩 계산(로컬/원격 호출 전처리)을 **전용 Web Worker**로 분리했습니다.
- 효과: 대량 문서 임베딩 생성 시에도 UI 입력/스크롤이 끊기지 않습니다.
- 구현: `src/workers/semanticWorker.ts` + `src/lib/semWorkerClient.ts`


### Tokenizers WASM (브라우저 토크나이저 가속)
- `@huggingface/tokenizers`를 브라우저에서 사용하려면 WASM 파일이 필요합니다.
- 다음 파일을 프로젝트에 추가하세요(없으면 자동 폴백하여 해시 임베딩 사용):
  ```
  public/
    tokenizers/
      tokenizers.wasm    # node_modules/@huggingface/tokenizers/dist/tokenizers.wasm 복사
  ```
- 서비스워커가 `/tokenizers/*`를 CacheFirst로 캐시해, 한 번 로드하면 오프라인에서도 사용됩니다.


### 참고: npm 404로 인한 토크나이저 패키지 임시 제외
- `@huggingface/tokenizers` 설치 이슈(E404)가 있어 현재 빌드 패키지에서는 해당 의존성을 제거했습니다.
- 그 결과 **로컬 ONNX 임베딩 경로는 비활성(해시/원격 사용 가능)** 상태입니다.
- 대안:
  1) 원격(API) 임베딩을 활성화해 사용하거나
  2) 차기 버전에서 `@huggingface/transformers`(Transformers.js) 기반 토크나이저로 교체 예정입니다.


## 온디바이스 임베딩(무의존 BERT 토크나이저 경로)
- `@huggingface/tokenizers` 없이도 동작하는 **BERT WordPiece 토크나이저**를 포함했습니다.
- 전제: BERT 계열(WordPiece) 모델(예: `sentence-transformers/all-MiniLM-L6-v2`)을 ONNX로 내보내고,
  `public/models/encoder.onnx` + `public/models/vocab.txt` 두 파일만 배치하면 됩니다.
- E5/SentencePiece 기반 모델은 이 경로로는 지원하지 않습니다(별도 변환 필요).
- 성공 시 헤더 상태가 `로컬 임베딩 준비 완료(onnxruntime)`로 바뀝니다.


## 모델 크기 줄이기 (권장: int8 양자화)
- 기본 FP32 ONNX는 60–120MB일 수 있습니다. **int8 양자화**로 20–40MB까지 줄일 수 있습니다.
- 예시(파이썬):
  ```bash
  pip install onnxruntime onnxruntime-tools
  python -m onnxruntime.quantization.quantize_dynamic     --model_input model.onnx --model_output model.int8.onnx     --optimize_model --per_channel
  ```
- 앱은 `/models/encoder.int8.onnx`가 있으면 **우선 사용**하고, 없으면 `encoder.onnx`로 폴백합니다.
- 정적 호스팅에서 **Brotli 압축**과 **서비스워커 CacheFirst**로 최초 다운로드 후에는 오프라인 사용이 가능합니다.
