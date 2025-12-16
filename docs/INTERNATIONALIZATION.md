# Internationalization (i18n) Implementation Guide

This document describes the comprehensive internationalization implementation for the Golob Travel Agency application.

## Overview

The application supports full internationalization with next-intl, providing a seamless multilingual experience for users across different languages and regions.

## Supported Languages

- **English (en)** - Default language
- **Spanish (es)** - Español
- **French (fr)** - Français
- **German (de)** - Deutsch
- **Chinese (zh)** - 中文
- **Japanese (ja)** - 日本語
- **Arabic (ar)** - العربية (RTL support)
- **Hindi (hi)** - हिन्दी

## Architecture

### Core Components

1. **next-intl Framework** - Primary internationalization solution
2. **Locale-based Routing** - URL structure with language prefixes
3. **Translation Management** - Structured JSON translation files
4. **RTL Support** - Right-to-left layout for Arabic
5. **Database Localization** - Multilingual content storage
6. **API Localization** - Localized responses and error messages

### File Structure

```
├── messages/                    # Translation files
│   ├── en.json               # English (base)
│   ├── es.json               # Spanish
│   ├── fr.json               # French
│   ├── de.json               # German
│   ├── zh.json               # Chinese
│   ├── ja.json               # Japanese
│   ├── ar.json               # Arabic
│   └── hi.json               # Hindi
├── app/[locale]/              # Locale-based routing
│   ├── layout.js             # Locale layout
│   └── page.js              # Locale pages
├── components/
│   └── LanguageSelector.js    # Language switcher component
├── hooks/
│   └── useLanguagePreference.js # Language preference hook
├── lib/
│   ├── i18n.js              # i18n configuration
│   ├── localeUtils.js         # Locale utilities
│   ├── apiLocaleUtils.js      # API localization
│   └── multilingualContentUtils.js # Database content management
└── scripts/
    └── check-translations.js  # Translation validation script
```

## Implementation Details

### 1. Framework Setup

The application uses `next-intl` with the following configuration:

```javascript
// i18n.js
export default getRequestConfig(async ({ locale }) => ({
  messages: (await import(`./messages/${locale}.json`)).default
}));
```

### 2. Routing

Locale-based routing is implemented with dynamic segments:

```javascript
// middleware.js
const intlMiddleware = createMiddleware({
  locales: ['en', 'es', 'fr', 'de', 'zh', 'ja', 'ar', 'hi'],
  defaultLocale: 'en',
  localePrefix: 'as-needed',
  localeDetection: true
});
```

### 3. Language Detection

Language detection follows this priority:
1. URL path prefix (e.g., `/es/flights`)
2. Saved user preference (localStorage)
3. Browser language
4. Default to English

### 4. Translation Structure

Translation files are organized by feature:

```json
{
  "common": {
    "loading": "Loading...",
    "error": "Error",
    "success": "Success"
  },
  "navigation": {
    "flights": "Flights",
    "hotels": "Hotels"
  },
  "flights": {
    "searchFlights": "Search Flights",
    "bookNow": "Book Now"
  }
}
```

### 5. RTL Support

Arabic language has full RTL support:
- Automatic direction switching (`dir="rtl"`)
- Mirrored layouts
- RTL-aware components
- Proper text alignment

### 6. Database Localization

Multilingual content is stored with this schema:

```javascript
// MultilingualContent Schema
{
  contentType: 'hotel|flight|destination',
  contentId: ObjectId,
  locale: 'en|es|fr|...',
  title: String,
  description: String,
  // ... additional locale-specific fields
}
```

## Usage Examples

### In Components

```javascript
import { useTranslations } from 'next-intl';

function MyComponent() {
  const t = useTranslations('common');
  
  return (
    <div>
      <h1>{t('welcome')}</h1>
      <button>{t('save')}</button>
    </div>
  );
}
```

### Language Switching

```javascript
import LanguageSelector from '@/components/LanguageSelector';

// In layout or navigation
<LanguageSelector />
```

### Date and Number Formatting

```javascript
import { formatDate, formatCurrency } from '@/lib/localeUtils';

// Format dates
const formattedDate = formatDate(new Date(), 'es', 'PPP');

// Format currency
const price = formatCurrency(100, 'es', 'EUR');
```

### API Localization

```javascript
import { createLocalizedResponse, createLocalizedError } from '@/lib/apiLocaleUtils';

// Success response
return createLocalizedResponse(data, locale);

// Error response
return createLocalizedError('validation', locale, 400);
```

## SEO Optimization

### Hreflang Tags

Automatic hreflang generation for all supported languages:

```javascript
// In metadata
alternates: {
  languages: {
    'en': '/en',
    'es': '/es',
    'fr': '/fr',
    // ... other languages
  },
  canonical: 'https://golob-travel-agency.vercel.app',
}
```

### Localized URLs

SEO-friendly URLs for each language:
- English: `/en/flights/new-york-to-paris`
- Spanish: `/es/vuelos/nueva-york-a-paris`
- French: `/fr/vols/new-york-a-paris`

## Quality Assurance

### Translation Validation

Run validation checks:

```bash
# Validate all translations
npm run i18n:validate

# Generate translation report
npm run i18n:report

# Run i18n tests
npm run test:i18n
```

### Automated Checks

The validation script checks for:
- Missing translation keys
- Empty or null values
- Placeholder consistency
- HTML tag consistency
- Translation length ratios

## Performance Optimization

### Code Splitting

Translations are automatically code-split by locale:
- Only required locale files are loaded
- Reduced bundle size
- Faster initial page loads

### Caching

- Translation files are cached
- Locale preferences persisted
- Efficient language switching

## Best Practices

### For Developers

1. **Always use translation keys** - Never hardcode text
2. **Group related translations** - Use nested structure
3. **Provide context** - Use descriptive keys
4. **Test all languages** - Verify UI looks good
5. **Handle RTL properly** - Test Arabic layout

### For Translators

1. **Maintain consistency** - Use same terminology
2. **Respect placeholders** - Keep {variables} intact
3. **Consider length** - Some languages are longer
4. **Cultural adaptation** - Localize appropriately
5. **Review context** - Understand usage before translating

## Maintenance

### Adding New Languages

1. Add language to `middleware.js` locales array
2. Create translation file in `messages/`
3. Add language to `LanguageSelector.js`
4. Update locale utilities if needed
5. Run validation checks

### Updating Translations

1. Edit appropriate JSON file
2. Run validation: `npm run i18n:validate`
3. Test language switching
4. Check UI in all languages

## Troubleshooting

### Common Issues

1. **Missing translations** - Check validation output
2. **RTL layout issues** - Verify Arabic CSS
3. **Performance** - Check bundle size
4. **SEO problems** - Verify hreflang tags

### Debug Tools

- Browser dev tools for locale inspection
- Network tab for API responses
- Console for translation errors

## Future Enhancements

1. **Auto-translation integration** - AI-powered translations
2. **Advanced locale detection** - Geolocation-based
3. **Dynamic loading** - Lazy translation loading
4. **A/B testing** - Test different translations
5. **Analytics integration** - Track language usage

## Support

For questions or issues with internationalization:
1. Check this documentation
2. Run validation scripts
3. Review implementation examples
4. Contact the development team