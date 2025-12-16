import MultilingualContent from './db/schemas/MultilingualContent';

export class MultilingualContentManager {
  /**
   * Get content in the specified locale
   */
  static async getContent(contentType, contentId, locale = 'en') {
    try {
      // First try to get content in the requested locale
      let content = await MultilingualContent.findByContentAndLocale(contentType, contentId, locale);
      
      // If not found, fall back to English
      if (!content && locale !== 'en') {
        content = await MultilingualContent.findByContentAndLocale(contentType, contentId, 'en');
      }
      
      return content;
    } catch (error) {
      console.error('Error getting multilingual content:', error);
      throw error;
    }
  }
  
  /**
   * Get all translations for a piece of content
   */
  static async getAllTranslations(contentType, contentId) {
    try {
      return await MultilingualContent.findAllTranslations(contentType, contentId);
    } catch (error) {
      console.error('Error getting all translations:', error);
      throw error;
    }
  }
  
  /**
   * Create or update translation
   */
  static async upsertTranslation(translationData) {
    try {
      const { contentType, contentId, locale, ...data } = translationData;
      
      const existingTranslation = await MultilingualContent.findOne({
        contentType,
        contentId,
        locale,
      });
      
      if (existingTranslation) {
        // Update existing translation
        return await MultilingualContent.findByIdAndUpdate(
          existingTranslation._id,
          {
            ...data,
            updatedAt: new Date(),
            version: existingTranslation.version + 1,
          },
          { new: true }
        );
      } else {
        // Create new translation
        const translation = new MultilingualContent({
          contentType,
          contentId,
          locale,
          ...data,
        });
        
        return await translation.save();
      }
    } catch (error) {
      console.error('Error upserting translation:', error);
      throw error;
    }
  }
  
  /**
   * Get missing translations for content
   */
  static async getMissingTranslations(contentType, contentId) {
    try {
      return await MultilingualContent.findMissingTranslations(contentType, contentId);
    } catch (error) {
      console.error('Error finding missing translations:', error);
      throw error;
    }
  }
  
  /**
   * Delete a translation
   */
  static async deleteTranslation(contentType, contentId, locale) {
    try {
      return await MultilingualContent.findOneAndDelete({
        contentType,
        contentId,
        locale,
      });
    } catch (error) {
      console.error('Error deleting translation:', error);
      throw error;
    }
  }
  
  /**
   * Get content with SEO data for the specified locale
   */
  static async getContentWithSEO(contentType, contentId, locale = 'en') {
    try {
      const content = await this.getContent(contentType, contentId, locale);
      
      if (!content) {
        return null;
      }
      
      // Generate SEO-friendly slug if not provided
      const slug = content.seo?.slug || this.generateSlug(content.title, locale);
      
      return {
        ...content.toObject(),
        seo: {
          ...content.seo,
          slug,
        },
      };
    } catch (error) {
      console.error('Error getting content with SEO:', error);
      throw error;
    }
  }
  
  /**
   * Generate SEO-friendly slug
   */
  static generateSlug(title, locale) {
    // Basic slug generation - can be enhanced with locale-specific rules
    const slugMap = {
      en: (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
      es: (text) => text.toLowerCase().replace(/[^a-z0-9áéíóúñü]+/g, '-').replace(/^-+|-+$/g, ''),
      fr: (text) => text.toLowerCase().replace(/[^a-z0-9àâäéèêëïîôöùûüç]+/g, '-').replace(/^-+|-+$/g, ''),
      de: (text) => text.toLowerCase().replace(/[^a-z0-9äöüß]+/g, '-').replace(/^-+|-+$/g, ''),
      zh: (text) => text.replace(/[^\u4e00-\u9fff]+/g, '-').replace(/^-+|-+$/g, ''),
      ja: (text) => text.replace(/[^\u3040-\u309f\u30a0-\u30ff]+/g, '-').replace(/^-+|-+$/g, ''),
      ar: (text) => text.replace(/[^\u0600-\u06ff]+/g, '-').replace(/^-+|-+$/g, ''),
      hi: (text) => text.replace(/[^\u0900-\u097f]+/g, '-').replace(/^-+|-+$/g, ''),
    };
    
    const slugGenerator = slugMap[locale] || slugMap.en;
    return slugGenerator(title);
  }
  
  /**
   * Get localized URL for content
   */
  static getLocalizedUrl(contentType, contentId, locale, baseUrl = 'https://golob-travel-agency.vercel.app') {
    const urlMap = {
      hotel: (id, locale) => `${baseUrl}/${locale}/hotels/${id}`,
      flight: (id, locale) => `${baseUrl}/${locale}/flights/${id}`,
      destination: (id, locale) => `${baseUrl}/${locale}/destinations/${id}`,
      attraction: (id, locale) => `${baseUrl}/${locale}/attractions/${id}`,
      package: (id, locale) => `${baseUrl}/${locale}/packages/${id}`,
      deal: (id, locale) => `${baseUrl}/${locale}/deals/${id}`,
    };
    
    const urlGenerator = urlMap[contentType];
    return urlGenerator ? urlGenerator(contentId, locale) : `${baseUrl}/${locale}`;
  }
  
  /**
   * Bulk create translations
   */
  static async bulkCreateTranslations(translations) {
    try {
      const operations = translations.map(translation => ({
        updateOne: {
          filter: {
            contentType: translation.contentType,
            contentId: translation.contentId,
            locale: translation.locale,
          },
          update: {
            $set: translation,
            $setOnInsert: {
              createdAt: new Date(),
              version: 1,
            },
          },
          upsert: true,
        },
      }));
      
      return await MultilingualContent.bulkWrite(operations);
    } catch (error) {
      console.error('Error bulk creating translations:', error);
      throw error;
    }
  }
  
  /**
   * Search content across all locales
   */
  static async searchContent(query, locale = 'en', options = {}) {
    try {
      const {
        contentType,
        limit = 20,
        skip = 0,
        sortBy = 'relevance',
      } = options;
      
      const searchQuery = {
        locale,
        status: 'published',
      };
      
      if (contentType) {
        searchQuery.contentType = contentType;
      }
      
      if (query) {
        searchQuery.$text = { $search: query };
      }
      
      const sortOptions = {
        relevance: { score: { $meta: 'textScore' } },
        title: { title: 1 },
        createdAt: { createdAt: -1 },
        updatedAt: { updatedAt: -1 },
      };
      
      return await MultilingualContent
        .find(searchQuery, { score: { $meta: 'textScore' } })
        .sort(sortOptions[sortBy] || sortOptions.relevance)
        .limit(limit)
        .skip(skip)
        .populate('translatedBy reviewedBy');
    } catch (error) {
      console.error('Error searching content:', error);
      throw error;
    }
  }
}

export default MultilingualContentManager;