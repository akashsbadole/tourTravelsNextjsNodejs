'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';

export function useLanguagePreference() {
  const [preferredLanguage, setPreferredLanguage] = useState(null);
  const currentLocale = useLocale();

  useEffect(() => {
    // Get language preference from localStorage
    const savedLanguage = localStorage.getItem('preferred-language');
    if (savedLanguage) {
      setPreferredLanguage(savedLanguage);
    }
  }, []);

  const updateLanguagePreference = (language) => {
    localStorage.setItem('preferred-language', language);
    setPreferredLanguage(language);
  };

  const detectBrowserLanguage = () => {
    if (typeof window !== 'undefined') {
      const browserLanguage = navigator.language || navigator.userLanguage;
      const languageCode = browserLanguage.split('-')[0];
      return languageCode;
    }
    return 'en';
  };

  const getInitialLanguage = () => {
    // Priority: saved preference > browser language > default
    return preferredLanguage || detectBrowserLanguage() || 'en';
  };

  return {
    preferredLanguage,
    currentLocale,
    updateLanguagePreference,
    detectBrowserLanguage,
    getInitialLanguage,
  };
}