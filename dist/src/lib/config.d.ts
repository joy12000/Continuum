export interface Config {
    isGenerativeMode: boolean;
    apiUrl: string;
    autoBackup: boolean;
    backupIntervalDays: number;
    lastBackupTimestamp?: number;
    genEnabled?: boolean;
    genEndpoint?: string;
}
/**
 * localStorage에서 설정을 안전하게 불러옵니다.
 * 설정이 없거나 파싱 오류가 발생하면, 항상 안정적인 기본값을 반환합니다.
 * @returns {Config} - 유효한 설정 객체
 */
export declare function getConfig(): Config;
/**
 * 새로운 설정을 저장하고 업데이트된 전체 설정을 반환합니다.
 * @param {Partial<Config>} newConfig - 업데이트할 설정 항목
 * @returns {Config} - 저장 후의 전체 설정 객체
 */
export declare function saveConfig(newConfig: Partial<Config>): Config;
//# sourceMappingURL=config.d.ts.map