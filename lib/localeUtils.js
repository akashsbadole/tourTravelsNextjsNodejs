import { format, parseISO } from 'date-fns';
import { en, es, fr, de, zh, ja, ar, hi } from 'date-fns/locale';

const dateFnsLocales = {
  en,
  es,
  fr,
  de,
  zh,
  ja,
  ar,
  hi,
};

const currencySymbols = {
  en: '$',
  es: '€',
  fr: '€',
  de: '€',
  zh: '¥',
  ja: '¥',
  ar: 'ر.س',
  hi: '₹',
};

const numberFormats = {
  en: { style: 'currency', currency: 'USD' },
  es: { style: 'currency', currency: 'EUR' },
  fr: { style: 'currency', currency: 'EUR' },
  de: { style: 'currency', currency: 'EUR' },
  zh: { style: 'currency', currency: 'CNY' },
  ja: { style: 'currency', currency: 'JPY' },
  ar: { style: 'currency', currency: 'SAR' },
  hi: { style: 'currency', currency: 'INR' },
};

export function formatDate(date, locale = 'en', formatStr = 'PPP') {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatStr, {
    locale: dateFnsLocales[locale] || en,
  });
}

export function formatTime(date, locale = 'en', formatStr = 'p') {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatStr, {
    locale: dateFnsLocales[locale] || en,
  });
}

export function formatDateTime(date, locale = 'en', formatStr = 'PPPp') {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatStr, {
    locale: dateFnsLocales[locale] || en,
  });
}

export function formatNumber(number, locale = 'en', options = {}) {
  const defaultOptions = numberFormats[locale] || numberFormats.en;
  const mergedOptions = { ...defaultOptions, ...options };
  
  return new Intl.NumberFormat(locale, mergedOptions).format(number);
}

export function formatCurrency(amount, locale = 'en', currency) {
  const currencyCode = currency || numberFormats[locale]?.currency || 'USD';
  const symbol = currencySymbols[locale] || currencySymbols.en;
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
  }).format(amount);
}

export function formatRelativeTime(date, locale = 'en') {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now - dateObj) / 1000);
  
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  
  if (diffInSeconds < 60) {
    return rtf.format(-diffInSeconds, 'second');
  } else if (diffInSeconds < 3600) {
    return rtf.format(-Math.floor(diffInSeconds / 60), 'minute');
  } else if (diffInSeconds < 86400) {
    return rtf.format(-Math.floor(diffInSeconds / 3600), 'hour');
  } else if (diffInSeconds < 2592000) {
    return rtf.format(-Math.floor(diffInSeconds / 86400), 'day');
  } else if (diffInSeconds < 31536000) {
    return rtf.format(-Math.floor(diffInSeconds / 2592000), 'month');
  } else {
    return rtf.format(-Math.floor(diffInSeconds / 31536000), 'year');
  }
}

export function getLocaleInfo(locale) {
  return {
    code: locale,
    isRTL: ['ar'].includes(locale),
    currency: numberFormats[locale]?.currency || 'USD',
    currencySymbol: currencySymbols[locale] || '$',
    dateFnsLocale: dateFnsLocales[locale] || en,
  };
}

export function getDirection(locale) {
  return getLocaleInfo(locale).isRTL ? 'rtl' : 'ltr';
}

export function getCurrencySymbol(locale) {
  return getLocaleInfo(locale).currencySymbol;
}

export function getCurrencyCode(locale) {
  return getLocaleInfo(locale).currency;
}