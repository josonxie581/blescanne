// 主题系统类型定义

export enum ThemeMode {
  Light = 'light',
  Dark = 'dark',
  Auto = 'auto'
}

export interface ThemeConfig {
  mode: ThemeMode;
}

export interface ThemeContextValue {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  isDark: boolean;
}