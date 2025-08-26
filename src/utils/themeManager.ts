import { ThemeMode } from '../types/theme';

const THEME_STORAGE_KEY = 'ble-scanner-theme';

export class ThemeManager {
  private static instance: ThemeManager | null = null;
  private listeners: Set<(theme: ThemeMode, isDark: boolean) => void> = new Set();

  static getInstance(): ThemeManager {
    if (!ThemeManager.instance) {
      ThemeManager.instance = new ThemeManager();
    }
    return ThemeManager.instance;
  }

  /**
   * 获取保存的主题设置
   */
  getSavedTheme(): ThemeMode {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved && Object.values(ThemeMode).includes(saved as ThemeMode)) {
        return saved as ThemeMode;
      }
    } catch (error) {
      console.warn('Failed to get saved theme:', error);
    }
    return ThemeMode.Auto; // 默认自动模式
  }

  /**
   * 保存主题设置
   */
  saveTheme(theme: ThemeMode): void {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (error) {
      console.warn('Failed to save theme:', error);
    }
  }

  /**
   * 检测系统主题偏好
   */
  getSystemTheme(): 'light' | 'dark' {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark'; // 默认深色主题
  }

  /**
   * 计算实际应用的主题
   */
  getActualTheme(theme: ThemeMode): 'light' | 'dark' {
    switch (theme) {
      case ThemeMode.Light:
        return 'light';
      case ThemeMode.Dark:
        return 'dark';
      case ThemeMode.Auto:
        return this.getSystemTheme();
      default:
        return 'dark';
    }
  }

  /**
   * 应用主题到DOM
   */
  applyTheme(theme: ThemeMode): void {
    const actualTheme = this.getActualTheme(theme);
    const isDark = actualTheme === 'dark';
    
    // 更新HTML class
    if (typeof document !== 'undefined') {
      const html = document.documentElement;
      if (isDark) {
        html.classList.add('dark');
      } else {
        html.classList.remove('dark');
      }
      
    }

    // 通知监听器
    this.listeners.forEach(listener => listener(theme, isDark));
  }

  /**
   * 添加主题变化监听器
   */
  addListener(listener: (theme: ThemeMode, isDark: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * 监听系统主题变化（仅当使用自动模式时）
   */
  watchSystemTheme(currentTheme: ThemeMode): () => void {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return () => {};
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (currentTheme === ThemeMode.Auto) {
        this.applyTheme(currentTheme);
      }
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }

  /**
   * 初始化主题系统
   */
  initialize(): ThemeMode {
    const savedTheme = this.getSavedTheme();
    this.applyTheme(savedTheme);
    return savedTheme;
  }
}