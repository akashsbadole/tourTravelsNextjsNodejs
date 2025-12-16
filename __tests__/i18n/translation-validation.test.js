import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

// Import translation files
const enTranslations = require('../../messages/en.json');
const esTranslations = require('../../messages/es.json');
const frTranslations = require('../../messages/fr.json');

describe('Translation Validation', () => {
  const supportedLanguages = ['en', 'es', 'fr'];
  const translationFiles = {
    en: enTranslations,
    es: esTranslations,
    fr: frTranslations,
  };

  describe('Structure Validation', () => {
    it('should have the same structure across all languages', () => {
      const baseStructure = translationFiles.en;
      
      supportedLanguages.forEach(lang => {
        if (lang === 'en') return; // Skip base language
        
        const langStructure = translationFiles[lang];
        const missingKeys = findMissingKeys(baseStructure, langStructure);
        
        expect(missingKeys).toEqual([]);
      });
    });

    it('should not have empty translation values', () => {
      supportedLanguages.forEach(lang => {
        const emptyValues = findEmptyValues(translationFiles[lang]);
        expect(emptyValues).toEqual([]);
      });
    });

    it('should not have null or undefined values', () => {
      supportedLanguages.forEach(lang => {
        const nullValues = findNullValues(translationFiles[lang]);
        expect(nullValues).toEqual([]);
      });
    });
  });

  describe('Content Validation', () => {
    it('should have consistent placeholder usage', () => {
      const enPlaceholders = extractPlaceholders(translationFiles.en);
      
      supportedLanguages.forEach(lang => {
        if (lang === 'en') return;
        
        const langPlaceholders = extractPlaceholders(translationFiles[lang]);
        
        // Check if placeholders match across languages
        expect(langPlaceholders.sort()).toEqual(enPlaceholders.sort());
      });
    });

    it('should have consistent HTML tags usage', () => {
      const enHtmlTags = extractHtmlTags(translationFiles.en);
      
      supportedLanguages.forEach(lang => {
        if (lang === 'en') return;
        
        const langHtmlTags = extractHtmlTags(translationFiles[lang]);
        
        // Check if HTML tags are consistent
        expect(langHtmlTags.sort()).toEqual(enHtmlTags.sort());
      });
    });

    it('should have reasonable translation lengths', () => {
      const enLengths = calculateTextLengths(translationFiles.en);
      
      supportedLanguages.forEach(lang => {
        if (lang === 'en') return;
        
        const langLengths = calculateTextLengths(translationFiles[lang]);
        
        // Check if translations are not drastically longer or shorter
        Object.keys(enLengths).forEach(key => {
          const enLength = enLengths[key];
          const langLength = langLengths[key];
          
          // Allow up to 50% difference in length (some languages are naturally longer)
          const maxLength = enLength * 1.5;
          const minLength = enLength * 0.5;
          
          expect(langLength).toBeGreaterThanOrEqual(minLength);
          expect(langLength).toBeLessThanOrEqual(maxLength);
        });
      });
    });
  });

  describe('Specific Translations', () => {
    it('should have navigation translations', () => {
      const navigationKeys = ['navigation.flights', 'navigation.hotels', 'navigation.home', 'navigation.login'];
      
      supportedLanguages.forEach(lang => {
        navigationKeys.forEach(key => {
          expect(getNestedValue(translationFiles[lang], key)).toBeDefined();
          expect(getNestedValue(translationFiles[lang], key)).not.toBe('');
        });
      });
    });

    it('should have common translations', () => {
      const commonKeys = ['common.loading', 'common.error', 'common.success', 'common.cancel'];
      
      supportedLanguages.forEach(lang => {
        commonKeys.forEach(key => {
          expect(getNestedValue(translationFiles[lang], key)).toBeDefined();
          expect(getNestedValue(translationFiles[lang], key)).not.toBe('');
        });
      });
    });

    it('should have error message translations', () => {
      const errorKeys = ['errors.pageNotFound', 'errors.serverError', 'errors.networkError'];
      
      supportedLanguages.forEach(lang => {
        errorKeys.forEach(key => {
          expect(getNestedValue(translationFiles[lang], key)).toBeDefined();
          expect(getNestedValue(translationFiles[lang], key)).not.toBe('');
        });
      });
    });
  });

  describe('Locale-Specific Validation', () => {
    it('should have proper RTL indicators for Arabic', () => {
      // This would be checked when Arabic translations are added
      if (translationFiles.ar) {
        // Check for RTL-specific patterns or indicators
        // This is a placeholder for future Arabic validation
      }
    });

    it('should have proper currency symbols', () => {
      const currencyKeys = ['common.currency', 'common.price'];
      
      supportedLanguages.forEach(lang => {
        currencyKeys.forEach(key => {
          const translation = getNestedValue(translationFiles[lang], key);
          expect(translation).toBeDefined();
          // Check if currency symbols are appropriate for the locale
        });
      });
    });
  });
});

// Helper functions
function findMissingKeys(base, target, path = '') {
  const missing = [];
  
  Object.keys(base).forEach(key => {
    const currentPath = path ? `${path}.${key}` : key;
    
    if (typeof base[key] === 'object' && base[key] !== null) {
      if (!target[key] || typeof target[key] !== 'object') {
        missing.push(currentPath);
      } else {
        missing.push(...findMissingKeys(base[key], target[key], currentPath));
      }
    } else {
      if (!(key in target)) {
        missing.push(currentPath);
      }
    }
  });
  
  return missing;
}

function findEmptyValues(obj, path = '') {
  const empty = [];
  
  Object.keys(obj).forEach(key => {
    const currentPath = path ? `${path}.${key}` : key;
    
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      empty.push(...findEmptyValues(obj[key], currentPath));
    } else if (obj[key] === '') {
      empty.push(currentPath);
    }
  });
  
  return empty;
}

function findNullValues(obj, path = '') {
  const nulls = [];
  
  Object.keys(obj).forEach(key => {
    const currentPath = path ? `${path}.${key}` : key;
    
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      nulls.push(...findNullValues(obj[key], currentPath));
    } else if (obj[key] === null || obj[key] === undefined) {
      nulls.push(currentPath);
    }
  });
  
  return nulls;
}

function extractPlaceholders(obj) {
  const placeholders = new Set();
  const regex = /\{(\w+)\}/g;
  
  JSON.stringify(obj).match(regex)?.forEach(match => {
    placeholders.add(match);
  });
  
  return Array.from(placeholders);
}

function extractHtmlTags(obj) {
  const tags = new Set();
  const regex = /<(\w+)[^>]*>/g;
  
  JSON.stringify(obj).match(regex)?.forEach(match => {
    tags.add(match);
  });
  
  return Array.from(tags);
}

function calculateTextLengths(obj) {
  const lengths = {};
  
  Object.keys(obj).forEach(key => {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      lengths[key] = calculateTextLengths(obj[key]);
    } else if (typeof obj[key] === 'string') {
      lengths[key] = obj[key].length;
    }
  });
  
  return lengths;
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}