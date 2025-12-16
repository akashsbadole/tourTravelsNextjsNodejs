#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Configuration
const SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'de', 'zh', 'ja', 'ar', 'hi'];
const MESSAGES_DIR = path.join(__dirname, '../messages');
const BASE_LANGUAGE = 'en';

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

function colorLog(message, color) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Load translation files
function loadTranslations() {
  const translations = {};
  
  SUPPORTED_LANGUAGES.forEach(lang => {
    const filePath = path.join(MESSAGES_DIR, `${lang}.json`);
    if (fs.existsSync(filePath)) {
      try {
        translations[lang] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } catch (error) {
        colorLog(`Error loading ${lang}.json: ${error.message}`, 'red');
        process.exit(1);
      }
    } else {
      colorLog(`Translation file ${lang}.json not found`, 'red');
      process.exit(1);
    }
  });
  
  return translations;
}

// Find missing keys
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

// Find empty or null values
function findInvalidValues(obj, path = '') {
  const invalid = [];
  
  Object.keys(obj).forEach(key => {
    const currentPath = path ? `${path}.${key}` : key;
    
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      invalid.push(...findInvalidValues(obj[key], currentPath));
    } else if (obj[key] === '' || obj[key] === null || obj[key] === undefined) {
      invalid.push(currentPath);
    }
  });
  
  return invalid;
}

// Extract placeholders
function extractPlaceholders(obj) {
  const placeholders = new Set();
  const regex = /\{(\w+)\}/g;
  
  JSON.stringify(obj).match(regex)?.forEach(match => {
    placeholders.add(match);
  });
  
  return Array.from(placeholders);
}

// Check for duplicate keys
function findDuplicateKeys(obj, path = '') {
  const duplicates = [];
  const seen = new Set();
  
  Object.keys(obj).forEach(key => {
    const currentPath = path ? `${path}.${key}` : key;
    
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      duplicates.push(...findDuplicateKeys(obj[key], currentPath));
    } else {
      if (seen.has(key)) {
        duplicates.push(currentPath);
      } else {
        seen.add(key);
      }
    }
  });
  
  return duplicates;
}

// Main validation function
function validateTranslations() {
  colorLog('🔍 Validating translations...', 'blue');
  console.log('');
  
  const translations = loadTranslations();
  const baseTranslations = translations[BASE_LANGUAGE];
  let hasErrors = false;
  
  // Check each language
  SUPPORTED_LANGUAGES.forEach(lang => {
    if (lang === BASE_LANGUAGE) return;
    
    colorLog(`📝 Checking ${lang} translations...`, 'yellow');
    const langTranslations = translations[lang];
    
    // Check for missing keys
    const missingKeys = findMissingKeys(baseTranslations, langTranslations);
    if (missingKeys.length > 0) {
      hasErrors = true;
      colorLog(`  ❌ Missing keys (${missingKeys.length}):`, 'red');
      missingKeys.forEach(key => {
        console.log(`    - ${key}`);
      });
    } else {
      colorLog(`  ✅ All keys present`, 'green');
    }
    
    // Check for invalid values
    const invalidValues = findInvalidValues(langTranslations);
    if (invalidValues.length > 0) {
      hasErrors = true;
      colorLog(`  ❌ Invalid values (${invalidValues.length}):`, 'red');
      invalidValues.forEach(key => {
        console.log(`    - ${key}`);
      });
    } else {
      colorLog(`  ✅ All values valid`, 'green');
    }
    
    // Check placeholder consistency
    const basePlaceholders = extractPlaceholders(baseTranslations);
    const langPlaceholders = extractPlaceholders(langTranslations);
    
    const missingPlaceholders = basePlaceholders.filter(p => !langPlaceholders.includes(p));
    const extraPlaceholders = langPlaceholders.filter(p => !basePlaceholders.includes(p));
    
    if (missingPlaceholders.length > 0 || extraPlaceholders.length > 0) {
      hasErrors = true;
      colorLog(`  ❌ Placeholder mismatch:`, 'red');
      if (missingPlaceholders.length > 0) {
        console.log(`    Missing: ${missingPlaceholders.join(', ')}`);
      }
      if (extraPlaceholders.length > 0) {
        console.log(`    Extra: ${extraPlaceholders.join(', ')}`);
      }
    } else {
      colorLog(`  ✅ Placeholders consistent`, 'green');
    }
    
    console.log('');
  });
  
  // Check for duplicate keys in base language
  const duplicateKeys = findDuplicateKeys(baseTranslations);
  if (duplicateKeys.length > 0) {
    hasErrors = true;
    colorLog(`❌ Duplicate keys in base language:`, 'red');
    duplicateKeys.forEach(key => {
      console.log(`  - ${key}`);
    });
  } else {
    colorLog(`✅ No duplicate keys in base language`, 'green');
  }
  
  // Summary
  console.log('');
  if (hasErrors) {
    colorLog('❌ Translation validation failed!', 'red');
    colorLog('Please fix the issues above before committing.', 'red');
    process.exit(1);
  } else {
    colorLog('✅ All translations validated successfully!', 'green');
  }
}

// Generate translation report
function generateReport() {
  colorLog('📊 Generating translation report...', 'blue');
  
  const translations = loadTranslations();
  const baseTranslations = translations[BASE_LANGUAGE];
  
  const report = {
    timestamp: new Date().toISOString(),
    languages: SUPPORTED_LANGUAGES,
    summary: {},
    details: {},
  };
  
  SUPPORTED_LANGUAGES.forEach(lang => {
    const langTranslations = translations[lang];
    const missingKeys = lang === BASE_LANGUAGE ? [] : findMissingKeys(baseTranslations, langTranslations);
    const invalidValues = findInvalidValues(langTranslations);
    
    report.summary[lang] = {
      totalKeys: countKeys(langTranslations),
      missingKeys: missingKeys.length,
      invalidValues: invalidValues.length,
      completion: lang === BASE_LANGUAGE ? 100 : Math.round((1 - missingKeys.length / countKeys(baseTranslations)) * 100),
    };
    
    report.details[lang] = {
      missingKeys,
      invalidValues,
    };
  });
  
  const reportPath = path.join(__dirname, '../translation-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  colorLog(`📄 Report saved to: ${reportPath}`, 'green');
}

// Helper function to count keys
function countKeys(obj) {
  let count = 0;
  
  function count(obj) {
    Object.keys(obj).forEach(key => {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        count(obj[key]);
      } else {
        count++;
      }
    });
  }
  
  count(obj);
  return count;
}

// CLI interface
const command = process.argv[2];

switch (command) {
  case 'validate':
    validateTranslations();
    break;
  case 'report':
    generateReport();
    break;
  default:
    colorLog('Usage:', 'yellow');
    console.log('  node scripts/check-translations.js validate  # Validate translations');
    console.log('  node scripts/check-translations.js report    # Generate translation report');
    process.exit(1);
}