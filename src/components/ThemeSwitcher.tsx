import React from 'react';
import { useTranslation } from 'react-i18next';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeMode } from '../types/theme';
import { emit } from '@tauri-apps/api/event';

const ThemeSwitcher: React.FC = () => {
  const { t } = useTranslation('common');
  const { theme, setTheme } = useTheme();

  const handleThemeChange = (newTheme: ThemeMode) => {
    setTheme(newTheme);
    // 向所有窗口广播主题变更事件
    try {
      void emit('theme-changed', { theme: newTheme });
    } catch (error) {
      console.warn('Failed to emit theme change event:', error);
    }
  };

  const getThemeIcon = (themeMode: ThemeMode) => {
    switch (themeMode) {
      case ThemeMode.Light:
        return <Sun className="w-4 h-4" />;
      case ThemeMode.Dark:
        return <Moon className="w-4 h-4" />;
      case ThemeMode.Auto:
        return <Monitor className="w-4 h-4" />;
      default:
        return <Monitor className="w-4 h-4" />;
    }
  };

  const getThemeLabel = (themeMode: ThemeMode) => {
    switch (themeMode) {
      case ThemeMode.Light:
        return t('theme.light');
      case ThemeMode.Dark:
        return t('theme.dark');
      case ThemeMode.Auto:
        return t('theme.auto');
      default:
        return t('theme.auto');
    }
  };

  const themeOptions = [
    { mode: ThemeMode.Light, label: getThemeLabel(ThemeMode.Light), icon: getThemeIcon(ThemeMode.Light) },
    { mode: ThemeMode.Dark, label: getThemeLabel(ThemeMode.Dark), icon: getThemeIcon(ThemeMode.Dark) },
    { mode: ThemeMode.Auto, label: getThemeLabel(ThemeMode.Auto), icon: getThemeIcon(ThemeMode.Auto) },
  ];

  return (
    <div className="flex items-center justify-end gap-1.5 p-1.5 bg-gray-100/80 dark:bg-gray-800/80 rounded-2xl backdrop-blur-lg border border-gray-200/50 dark:border-gray-700/50 shadow-lg">
      {themeOptions.map(({ mode, label, icon }) => (
        <button
          key={mode}
          className={`group relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 overflow-hidden ${
            theme === mode 
              ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30 scale-105' 
              : 'text-gray-600 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-gray-700/60 hover:scale-105 backdrop-blur-sm'
          }`}
          onClick={() => handleThemeChange(mode)}
          title={label}
        >
          {theme === mode && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
          )}
          <span className="relative">{icon}</span>
          <span className="relative hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
};

export default ThemeSwitcher;