import { toast } from './toast';
const CONFIG_KEY = 'continuum-config';
// 항상 일관된 기본값을 제공하는 상수
const DEFAULT_CONFIG = {
    isGenerativeMode: true,
    apiUrl: '/.netlify/functions/generate',
    autoBackup: true,
    backupIntervalDays: 3,
};
/**
 * localStorage에서 설정을 안전하게 불러옵니다.
 * 설정이 없거나 파싱 오류가 발생하면, 항상 안정적인 기본값을 반환합니다.
 * @returns {Config} - 유효한 설정 객체
 */
export function getConfig() {
    try {
        const storedConfig = localStorage.getItem(CONFIG_KEY);
        if (storedConfig) {
            // 저장된 설정과 기본 설정을 병합하여, 나중에 추가될 수 있는 새로운 설정 키에도 대비합니다.
            return { ...DEFAULT_CONFIG, ...JSON.parse(storedConfig) };
        }
    }
    catch (error) {
        console.error('Failed to parse config. Returning default.', error);
    }
    // 설정이 없거나 오류 발생 시, 항상 기본값을 반환합니다.
    return DEFAULT_CONFIG;
}
/**
 * 새로운 설정을 저장하고 업데이트된 전체 설정을 반환합니다.
 * @param {Partial<Config>} newConfig - 업데이트할 설정 항목
 * @returns {Config} - 저장 후의 전체 설정 객체
 */
export function saveConfig(newConfig) {
    try {
        const currentConfig = getConfig();
        const updatedConfig = { ...currentConfig, ...newConfig };
        localStorage.setItem(CONFIG_KEY, JSON.stringify(updatedConfig));
        toast.success('설정이 저장되었습니다.');
        return updatedConfig;
    }
    catch (error) {
        console.error('Failed to save config.', error);
        toast.error('설정 저장에 실패했습니다.');
        // 저장 실패 시에도 현재 메모리에 로드된 설정을 반환합니다.
        return getConfig();
    }
}
