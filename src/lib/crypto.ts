
// crypto.ts

/**
 * PBKDF2를 사용하여 비밀번호로부터 AES-GCM용 키를 생성합니다.
 * @param password - 사용할 비밀번호
 * @param salt - 키 생성에 사용되는 솔트
 * @returns AES-GCM 암호화/복구에 사용할 수 있는 CryptoKey
 */
export async function deriveAesKeyFromPassword(password: string, salt: BufferSource): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 100_000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true, // 추출 가능 여부 설정
    ["encrypt", "decrypt"]
  );
}

/**
 * JSON 객체를 암호화하여 Blob 형태로 반환합니다.
 * @param data - 암호화할 JSON 객체
 * @param password - 비밀번호
 * @returns 암호화된 파일 데이터 Blob (salt + iv + ciphertext)
 */
export async function encryptJSON(data: any, password: string): Promise<Blob> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveAesKeyFromPassword(password, salt);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const serialized = JSON.stringify(data);
  const encoded = new TextEncoder().encode(serialized);

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded
  );

  // salt, iv, ciphertext를 합쳐서 Blob 형태로 내보냅니다.
  return new Blob([salt, iv, new Uint8Array(ciphertext)], { type: "application/octet-stream" });
}

/**
 * 암호화된 Blob을 복호화하여 JSON 객체로 반환합니다.
 * @param file - 암호화된 파일 데이터 File 또는 Blob
 * @param password - 비밀번호
 * @returns 복호화된 JSON 객체
 */
export async function decryptJSON(file: File, password: string): Promise<any> {
  const buffer = await file.arrayBuffer();
  
  // Blob에서 salt, iv, ciphertext를 다시 추출합니다.
  const salt = new Uint8Array(buffer.slice(0, 16));
  const iv = new Uint8Array(buffer.slice(16, 28));
  const ciphertext = new Uint8Array(buffer.slice(28));

  const key = await deriveAesKeyFromPassword(password, salt);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );

  const decoded = new TextDecoder().decode(decrypted);
  return JSON.parse(decoded);
}
