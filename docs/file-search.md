# Gemini File Search 동기화 개요

애플리케이션에서 작성된 노트는 `handleChatBundleSync`( `/api/v1?action=chat-bundle-sync` ) 경로를 통해 Gemini File Search 스토어로 업로드됩니다. 업로드 시 본문과 함께 `user_id`, `note_id`, `created_at_ms` 메타데이터를 기록하여 사용자 단위 검색과 정렬을 지원합니다. 이후 동일 요청에서 File Search 기반 요약까지 수행하므로 저장과 검색 준비가 한 번에 처리됩니다.

업로드 구현은 `uploadTextToFileSearchStore` 유틸리티로 이루어지며, Gemini의 Resumable Upload 프로토콜을 사용해 텍스트를 스토어에 저장합니다. 성공하면 비동기 동작이 완료될 때까지 폴링하여 최종 응답을 반환합니다.
