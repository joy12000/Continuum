import { toast } from './toast';

export interface Config {
  isGenerativeMode: boolean;
  apiUrl: string;
  autoBackup: boolean;
  backupIntervalDays: number;
  lastBackupTimestamp?: number;
  genEnabled?: boolean; // 추가
  genEndpoint?: string; // 추가
}

// 🛡️ 추가: 안정적인 기본 설정값 정의
const DEFAULT_CONFIG: Config = {
  isGenerativeMode: true,
  apiUrl: '/.netlify/functions/generate', // 기본 API URL 설정
  autoBackup: true,
  backupIntervalDays: 3,
  lastBackupTimestamp: undefined,
};

const CONFIG_KEY = 'continuum-config';

/**
 * Retrieves the configuration from localStorage.
 * If no configuration is found, returns a stable default configuration.
 * @returns {Config} The configuration object.
 */
export function getConfig(): Config {
  try {
    const storedConfig = localStorage.getItem(CONFIG_KEY);
    if (storedConfig) {
      // 🛡️ 수정: 저장된 설정과 기본 설정을 병합하여 새로운 키가 추가되어도 문제 없도록 함
      const parsedConfig = JSON.parse(storedConfig);
      return { ...DEFAULT_CONFIG, ...parsedConfig };
    }
    // 🛡️ 수정: 설정이 없으면 항상 기본값을 반환
    return DEFAULT_CONFIG;
  } catch (error) {
    console.error('Failed to parse config from localStorage', error);
    // 파싱 실패 시에도 안정적인 기본값 반환
    return DEFAULT_CONFIG;
  }
}

/**
 * Saves the configuration to localStorage.
 * @param {Partial<Config>} newConfig - The configuration settings to save.
 */
export function saveConfig(newConfig: Partial<Config>): Config {
  try {
    const currentConfig = getConfig();
    const updatedConfig = { ...currentConfig, ...newConfig };
    localStorage.setItem(CONFIG_KEY, JSON.stringify(updatedConfig));
    toast.success('설정이 저장되었습니다.');
    return updatedConfig;
  } catch (error) {
    console.error('Failed to save config to localStorage', error);
    toast.error('설정 저장에 실패했습니다.');
    return getConfig(); // 저장 실패 시 현재 설정 반환
  }
}