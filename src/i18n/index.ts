import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en_common from './locales/en/common.json';
import en_home from './locales/en/home.json';
import en_device from './locales/en/device.json';
import en_about from './locales/en/about.json';
import zh_common from './locales/zh/common.json';
import zh_home from './locales/zh/home.json';
import zh_device from './locales/zh/device.json';
import zh_about from './locales/zh/about.json';
import es_common from './locales/es/common.json';
import es_home from './locales/es/home.json';
import es_device from './locales/es/device.json';
import es_about from './locales/es/about.json';

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: en_common,
        home: en_home,
        device: en_device,
        about: en_about,
      },
      zh: {
        common: zh_common,
        home: zh_home,
        device: zh_device,
        about: zh_about,
      },
      es: {
        common: es_common,
        home: es_home,
        device: es_device,
        about: es_about,
      },
    },
    fallbackLng: 'en',
  load: 'languageOnly',
    supportedLngs: ['en', 'zh', 'es'],
    ns: ['common', 'home', 'device', 'about'],
    defaultNS: 'common',
    interpolation: { escapeValue: false },
    detection: {
      order: ['querystring', 'localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;
