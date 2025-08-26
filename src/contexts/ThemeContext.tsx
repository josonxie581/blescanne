import React, { createContext, useContext, useState, useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { ThemeMode, ThemeContextValue } from '../types/theme';
import { ThemeManager } from '../utils/themeManager';

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(ThemeMode.Auto);
  const [isDark, setIsDark] = useState<boolean>(true);

  const themeManager = ThemeManager.getInstance();

  useEffect(() => {
    // 初始化主题
    const initialTheme = themeManager.initialize();
    setThemeState(initialTheme);
    setIsDark(themeManager.getActualTheme(initialTheme) === 'dark');

    // 监听主题变化
    const unsubscribeTheme = themeManager.addListener((newTheme, newIsDark) => {
      // 显式使用 newTheme 以避免 TS6133 未使用参数告警
      void newTheme;
      setIsDark(newIsDark);
    });

    // 监听系统主题变化
    const unsubscribeSystem = themeManager.watchSystemTheme(initialTheme);

    // 监听跨窗口主题变更事件
    const setupCrossWindowListener = async () => {
      const unsubscribeCrossWindow = await listen('theme-changed', (event: any) => {
        const { theme: newTheme } = event.payload;
        if (Object.values(ThemeMode).includes(newTheme) && newTheme !== theme) {
          setThemeState(newTheme);
          themeManager.applyTheme(newTheme);
          setIsDark(themeManager.getActualTheme(newTheme) === 'dark');
          // 不需要保存到 localStorage，因为发送方已经保存了
        }
      });
      return unsubscribeCrossWindow;
    };

    let crossWindowUnsubscribe: (() => void) | null = null;
    setupCrossWindowListener().then(unsubscribe => {
      crossWindowUnsubscribe = unsubscribe;
    }).catch(error => {
      console.warn('Failed to setup cross-window theme listener:', error);
    });

    return () => {
      unsubscribeTheme();
      unsubscribeSystem();
      if (crossWindowUnsubscribe) {
        crossWindowUnsubscribe();
      }
    };
  }, [themeManager]);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    themeManager.saveTheme(newTheme);
    themeManager.applyTheme(newTheme);
    setIsDark(themeManager.getActualTheme(newTheme) === 'dark');
  };

  const value: ThemeContextValue = {
    theme,
    setTheme,
    isDark,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme 必须在 ThemeProvider 内部使用');
  }
  return context;
};