/**
 * PBKDF2를 사용하여 암호로부터 AES-GCM 키를 유도합니다.
 * @param password - 사용자 암호
 * @param salt - 암호화 시 사용된 솔트 (복호화 시 동일해야 함)
 * @returns AES-GCM 암호화/복호화에 사용할 수 있는 CryptoKey
 */
export declare function deriveAesKeyFromPassword(password: string, salt: BufferSource): Promise<CryptoKey>;
/**
 * JSON 객체를 암호화하여 Blob으로 반환합니다.
 * @param data - 암호화할 JSON 객체
 * @param password - 암호
 * @returns 암호화된 데이터가 담긴 Blob (salt + iv + ciphertext)
 */
export declare function encryptJSON(data: any, password: string): Promise<Blob>;
/**
 * 암호화된 Blob을 복호화하여 JSON 객체로 반환합니다.
 * @param file - 암호화된 데이터가 담긴 File 또는 Blob
 * @param password - 암호
 * @returns 복호화된 JSON 객체
 */
export declare function decryptJSON(file: File, password: string): Promise<any>;
//# sourceMappingURL=crypto.d.ts.map