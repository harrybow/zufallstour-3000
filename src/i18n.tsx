import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import de from './locales/de.json';
import en from './locales/en.json';

const translations: Record<string, Record<string, string>> = { de, en };
interface I18nContextValue {
  lang: string;
  setLang: (lang: string) => void;
  t: (k: string, vars?: Record<string, unknown>) => string;
}
const I18nContext = createContext<I18nContextValue>({ lang: 'de', setLang: () => {}, t: (k) => k });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<string>(() => localStorage.getItem('lang') || 'de');
  useEffect(() => {
    localStorage.setItem('lang', lang);
    document.documentElement.lang = lang;
    document.title = translations[lang]['app.title'] || 'Zufallstour 3000';
  }, [lang]);
  const t = (key, vars = {}) => {
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
