/* eslint-disable no-unused-vars */
import React, { createContext, useContext, useEffect, useState } from 'react';
import de from './locales/de.json';
import en from './locales/en.json';

const translations = { de, en };

interface I18nContextValue {
  lang: string;
  setLang: (lang: string) => void;
  t: (key: string, vars?: Record<string, unknown>) => string;
}

const I18nContext = createContext<I18nContextValue>({ lang: 'de', setLang: () => {}, t: (k) => k });

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'de');
  useEffect(() => {
    localStorage.setItem('lang', lang);
    document.documentElement.lang = lang;
    document.title = translations[lang]['app.title'] || 'Zufallstour 3000';
  }, [lang]);
  const t = (key: string, vars: Record<string, unknown> = {}) => {
    let str = translations[lang][key] || key;
    Object.entries(vars).forEach(([vk, vv]) => {
      str = str.replace(new RegExp(`{{${vk}}}`, 'g'), String(vv));
    });
    return str;
  };
  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export const useI18n = () => useContext(I18nContext);
