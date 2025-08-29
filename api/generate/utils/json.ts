
export function tryParseJSON(text: string): any {
  try {
    return JSON.parse(text);
  } catch (e) {
    // JSON 파싱에 실패하면 null을 반환합니다.
    return null;
  }
}
