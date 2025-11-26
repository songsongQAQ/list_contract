// 本地存储工具函数

const STORAGE_KEYS = {
  LOGIN_STATUS: 'garson_login_status',
  USER_CONFIG: 'garson_user_config',
} as const;

// 登录状态缓存
export const loginStorage = {
  set: (isLoggedIn: boolean) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEYS.LOGIN_STATUS, JSON.stringify({
          isLoggedIn,
          timestamp: Date.now(),
        }));
      } catch (error) {
        console.error('Failed to save login status to localStorage:', error);
      }
    }
  },
  
  get: (): boolean | null => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEYS.LOGIN_STATUS);
        if (!stored) return null;
        
        const data = JSON.parse(stored);
        // 检查缓存是否过期（24小时）
        const maxAge = 24 * 60 * 60 * 1000; // 24小时
        if (Date.now() - data.timestamp > maxAge) {
          localStorage.removeItem(STORAGE_KEYS.LOGIN_STATUS);
          return null;
        }
        
        return data.isLoggedIn;
      } catch (error) {
        console.error('Failed to read login status from localStorage:', error);
        return null;
      }
    }
    return null;
  },
  
  clear: () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_KEYS.LOGIN_STATUS);
      } catch (error) {
        console.error('Failed to clear login status from localStorage:', error);
      }
    }
  },
};

// 用户配置缓存
export const userConfigStorage = {
  set: (config: any) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEYS.USER_CONFIG, JSON.stringify({
          config,
          timestamp: Date.now(),
        }));
      } catch (error) {
        console.error('Failed to save user config to localStorage:', error);
      }
    }
  },
  
  get: () => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEYS.USER_CONFIG);
        if (!stored) return null;
        
        const data = JSON.parse(stored);
        // 检查缓存是否过期（1小时）
        const maxAge = 60 * 60 * 1000; // 1小时
        if (Date.now() - data.timestamp > maxAge) {
          localStorage.removeItem(STORAGE_KEYS.USER_CONFIG);
          return null;
        }
        
        return data.config;
      } catch (error) {
        console.error('Failed to read user config from localStorage:', error);
        return null;
      }
    }
    return null;
  },
  
  clear: () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_KEYS.USER_CONFIG);
      } catch (error) {
        console.error('Failed to clear user config from localStorage:', error);
      }
    }
  },
};

