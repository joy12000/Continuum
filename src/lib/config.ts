import toast from 'react-hot-toast';

export interface Config {
  isGenerativeMode: boolean;
  apiUrl: string;
  autoBackup: boolean;
  backupIntervalDays: number;
  lastBackupTimestamp?: number;
  genEnabled?: boolean; 
  genEndpoint?: string; 
}

const CONFIG_KEY = 'momentum-config';

// 기본 설정을 정의하는 상수
const DEFAULT_CONFIG: Config = {
  isGenerativeMode: true,
  apiUrl: '/.netlify/functions/generate',
  autoBackup: true,
  backupIntervalDays: 3,
};

/**
 * localStorage에서 설정을 불러옵니다.
 * 설정이 없거나 불러오는 중에 오류가 발생하면 기본 설정을 반환합니다.
 * @returns {Config} - 최종 설정 객체
 */
export function getConfig(): Config {
  try {
    const storedConfig = localStorage.getItem(CONFIG_KEY);
    if (storedConfig) {
      // 저장된 설정이 기본 설정에 병합되어, 새로운 설정 필드에 대해서도 유연하게 대응합니다.
      return { ...DEFAULT_CONFIG, ...JSON.parse(storedConfig) };
    }
  } catch (error) {
    console.error('Failed to parse config. Returning default.', error);
  }
  // 설정 정보가 없거나 오류 시 기본 설정을 반환합니다.
  return DEFAULT_CONFIG;
}

/**
 * 새로운 설정을 업데이트하고 저장합니다.
 * @param {Partial<Config>} newConfig - 업데이트할 설정 정보
 * @returns {Config} - 업데이트된 최종 설정 객체
 */
export function saveConfig(newConfig: Partial<Config>): Config {
  try {
    const currentConfig = getConfig();
    const updatedConfig = { ...currentConfig, ...newConfig };
    localStorage.setItem(CONFIG_KEY, JSON.stringify(updatedConfig));
    localStorage.setItem('pending-toast-message', '설정이 저장되었습니다.');
    return updatedConfig;
  } catch (error) {
    console.error('Failed to save config.', error);
    toast.error('설정 저장 중 오류가 발생했습니다.');
    // 저장 실패 시 현재 설정을 유지하여 반환합니다.
    return getConfig();
  }
}
