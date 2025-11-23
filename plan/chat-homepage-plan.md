# 챗 기반 홈페이지 전환 계획

## 목적
- 카카오톡 스타일 채팅 인터페이스를 메인으로 전환해 입력 렉을 최소화하고, 자동 저장/RAG 응답 흐름을 유지.
- 30초마다 누적 메시지를 하나의 노트로 묶어 저장하고, 저장 시마다 RAG 인덱싱을 갱신.

## 핵심 구조
1. **ChatHeader**: 모드 토글(채팅/일반), 자동 저장 상태·잔여시간 표시, 수동 flush 버튼.
2. **MessageList**: 사용자/AI 버블 렌더링, 새 메시지 도착 시 자동 스크롤, 필요 시 가상화(`react-window`).
3. **MessageComposer**: 제어된 `textarea`(Enter 전송, Shift+Enter 줄바꿈), `useDraftPersistence`로 임시 저장.
4. **useChatBundler** 훅: 메시지 큐 관리 + 30초 타이머 flush → `addNoteAndChunks` → `/api/v1?action=update-note` → `chat:bundle-save` 이벤트 재발동 → RAG 인덱스 갱신.
5. **AnswerStore 연동**: 기존 `AnswerCardsModal`/`GeneratedAnswer` 흐름 유지, flush 완료 후 새 노트 ID/메타 전달.

## 컴포넌트 책임
- **ChatHeader**
  - 모드 토글, “저장 대기/진행 중/완료” 상태 및 잔여 타이머 표시.
  - `Flush Now` 버튼으로 즉시 flush 트리거.
  - RAG 모드 전환 시 상태를 `useChatBundler`/`useAnswerStore`에 전달.
- **MessageList**
  - 메시지 배열을 시간순 렌더링, AI 응답은 로딩/실패 상태를 표시.
  - 새 메시지 시 자동 스크롤; 사용자가 상단 탐색 중이면 고정 상태 유지.
  - 추후 성능 요구 시 가상화 레이어 교체 가능하도록 래퍼로 감쌈.
- **MessageComposer**
  - 제어된 입력 + 자동 높이 조절; 엔터 전송, Shift+Enter 줄바꿈.
  - 제출 시 `enqueueMessage(text)` 호출 후 로컬 리스트에 즉시 반영.
  - draft를 `useDraftPersistence`로 유지해 새로고침에도 미전송 메시지 복원.
- **useChatBundler**
  - 상태: `messages[]`, `nextFlushAt`, `isSaving`, `error`.
  - 동작: 30초 주기 flush, 수동 `flushNow`, 실패 시 토스트 + 재시도(예: 최대 3회).
  - 성공 시 `chat:bundle-save` 이벤트 발송, 새 노트 ID/메타를 콜백으로 전달해 Answer 모달과 동기화.
- **AnswerStore/RAG**
  - flush 성공 시 백엔드가 반환한 노트 ID와 RAG 인덱스 메타를 저장.
  - AI 호출 시 RAG 모드가 켜져 있으면 백엔드에 store 이름/필터를 함께 전달.
  - citation/grounding 메타데이터를 메시지 버블 하단에 표기(출처 표시).

## RAG (Gemini File Search) 적용
- **백엔드 흐름**
  1) flush 요청 시 노트 저장 후 동일 텍스트를 Gemini File Search Store에 업로드(`uploadToFileSearchStore`), 메타데이터에 사용자/노트 ID를 포함.
  2) 업로드/인덱싱 결과(store 이름, 파일명, chunk 메타)를 응답에 포함.
  3) RAG 질의 시 `generate_content`에 `file_search` 설정을 넣어 Retrieval+Generation 수행, citation 메타를 포함해 응답.
- **클라이언트 흐름**
  - `useChatBundler.flush` → 저장 API 호출 → 응답의 store/파일 메타를 `useAnswerStore`에 저장.
  - RAG 모드에서 질문 전송 시 백엔드가 해당 store/필터를 사용해 컨텍스트 구성.
  - 받은 citation/grounding 메타를 MessageList에 표시(예: “출처: note-2025-11-24.txt”).
- **운영 전략**
  - 파일명: `note-{timestamp}.txt` 등으로 구분, 사용자/노트 ID를 메타데이터로 필터링.
  - 멀티 유저면 store 분리 또는 `metadata_filter`로 사용자 스코프 제한.
  - `chunking_config`(예: max_tokens_per_chunk=200, max_overlap_tokens=20)로 인덱싱 품질/속도 균형 조정.

## 오픈소스 활용
- **react-chat-elements**: 초기 구성에 권장. 버블/타이핑 인디케이터/날짜 구분 제공, 테마 override만으로 빠른 적용.
- **sendbird-uikit-react**: 모바일 우선 + 상태 유틸 포함. 전체 프레임을 재사용하고 RAG/노트 저장만 커스텀 훅으로 연결.
- **stream-chat-react**: 대규모 히스토리/무한 스크롤에 유리. UI 레이어만 가져다 Supabase/Gemini 백엔드와 연결.
- **Kakao 스타일 CSS 템플릿**: GitHub 샘플로 색감/버블 형태만 이식, 로직은 자체 구현.
- 선택 기준: 모바일 최적화 → sendbird, 빠른 조립/가벼움 → react-chat-elements, 대규모/가상화 → stream-chat-react. 래퍼를 얇게 만들어 교체 가능성 확보.

## 카카오 스타일 CSS 자산 활용
- `plan/css/screens/chat.css`와 관련 `components/*.css`, `variables.css`는 이미 캡쳐해준 UI(회색 헤더 + 노란 송신 버블)와 거의 동일한 구조/스타일을 제공.
- 주요 클래스(`.message-row`, `.message-row--own`, `.reply`, `.chat__timestamp` 등)를 그대로 React 컴포넌트에 매핑하면 빠르게 동일 뷰를 재현 가능.
- 적용 방식:
  1) CSS 파일을 Vite/React에 import (예: `import '../plan/css/screens/chat.css';`) 하고 PostCSS/Tailwind 위에서 전역 클래스로 사용.
  2) `MessageList`는 각 메시지를 `<div className="message-row ...">` 형태로 출력, 아바타/시간/버블을 CSS가 처리하도록 함.
  3) `MessageComposer`는 `.reply` 레이아웃을 차용하되, 버튼/아이콘 영역만 React 이벤트에 맞춰 교체.
- 필요한 변경:
  - 현재 CSS는 고정 높이/position 값을 많이 쓰므로, React 앱 구조에 맞게 `height`, `position: fixed` 등을 `safe-area`/flex 기준으로 조정.
  - 테마 컬러(노란 송신 버블 등)를 CSS 변수(`--yellow`)로 이미 정의했으므로 Tailwind theme와도 쉽게 동기화 가능.
- 결론: 해당 CSS 자산만으로 카톡 스타일 UI 골격은 즉시 구현 가능하며, 메시지/입력 로직만 React로 교체하면 된다.

## 시간 흐름
1. 사용자 입력 → `enqueueMessage` → 즉시 버블 표시.
2. 30초 타이머 만료 또는 수동 flush → 노트 생성 + `/api/v1?action=update-note` → Gemini File Search 인덱싱 → `chat:bundle-save` 이벤트 발송.
3. AI/RAG 응답을 메시지로 append, citation은 버블 하단에 표시.

## 테스트/검증
1. 자동 flush 30초 주기와 수동 flush 모두 정상 동작 확인, 실패 시 재시도 토스트.
2. 채팅 모드 토글 시 입력창·자동 스크롤·RAG 스위치 상태가 기대대로 전환되는지 UI 확인.
3. 입력 렉 재검증: 렉 지속 시 `requestIdleCallback`으로 캔버스/애니메이션 부하 분리, 필요하면 디바운스 적용.
4. RAG 전환: store/필터가 올바르게 적용돼 응답이 노트 맥락을 활용하는지 확인, citation 표시 검증.
5. 기존 모듈 연계: `AnswerCardsModal`, `NoteDetailModal`, `chat:bundle-save` 이벤트가 새 구조에서도 정상 동작하는지 end-to-end 테스트.
