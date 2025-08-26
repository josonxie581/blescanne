import React from 'react';
import { useTranslation } from 'react-i18next';
import { emit } from '@tauri-apps/api/event';

const LanguageSwitcher: React.FC = () => {
  const { t, i18n } = useTranslation('common');
  const changeLanguage = (lng: 'en' | 'zh' | 'es') => {
    i18n.changeLanguage(lng);
    try {
      window.localStorage.setItem('i18nextLng', lng);
    } catch {}
    // 向所有窗口广播语言变更事件
    try {
      void emit('i18n-language-changed', { lng });
    } catch {}
  };

  const current = i18n.resolvedLanguage || i18n.language;

  const languages = [
    { code: 'en', label: t('language.en') },
    { code: 'zh', label: t('language.zh') },
    { code: 'es', label: t('language.es') }
  ];

  return (
    <div className="flex items-center justify-end gap-1.5 p-1.5 bg-gray-100/80 dark:bg-gray-800/80 rounded-2xl backdrop-blur-lg border border-gray-200/50 dark:border-gray-700/50 shadow-lg">
      {languages.map(({ code, label }) => (
        <button
          key={code}
          className={`group relative px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 overflow-hidden ${
            current?.startsWith(code)
              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30 scale-105'
              : 'text-gray-600 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-gray-700/60 hover:scale-105 backdrop-blur-sm'
          }`}
          onClick={() => changeLanguage(code as 'en' | 'zh' | 'es')}
          title={label}
        >
          {current?.startsWith(code) && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
          )}
          <span className="relative">{label}</span>
        </button>
      ))}
    </div>
  );
};

export default LanguageSwitcher;
