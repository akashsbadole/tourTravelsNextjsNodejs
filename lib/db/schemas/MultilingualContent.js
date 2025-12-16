import mongoose from 'mongoose';

const multilingualContentSchema = new mongoose.Schema({
  // Reference to the content type (e.g., 'hotel', 'flight', 'destination')
  contentType: {
    type: String,
    required: true,
    enum: ['hotel', 'flight', 'destination', 'attraction', 'restaurant', 'activity', 'package', 'deal'],
  },
  
  // Reference to the original content ID
  contentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'contentType',
  },
  
  // Language code (e.g., 'en', 'es', 'fr', etc.)
  locale: {
    type: String,
    required: true,
    enum: ['en', 'es', 'fr', 'de', 'zh', 'ja', 'ar', 'hi'],
  },
  
  // Translated fields
  title: {
    type: String,
    required: true,
  },
  
  description: {
    type: String,
    required: true,
  },
  
  // Additional fields that can vary by locale
  shortDescription: String,
  
  // Specific fields for different content types
  hotelDetails: {
    amenities: [String],
    roomTypes: [{
      name: String,
      description: String,
      maxOccupancy: Number,
      price: Number,
    }],
    policies: {
      checkIn: String,
      checkOut: String,
      cancellation: String,
      payment: String,
    },
  },
  
  flightDetails: {
    airlineName: String,
    aircraftType: String,
    mealOptions: [String],
    entertainmentOptions: [String],
    baggagePolicy: String,
  },
  
  destinationDetails: {
    bestTimeToVisit: String,
    climate: String,
    currency: String,
    language: String,
    timeZone: String,
    attractions: [String],
  },
  
  // SEO fields for each locale
  seo: {
    metaTitle: String,
    metaDescription: String,
    keywords: [String],
    slug: String,
  },
  
  // Media that might be locale-specific
  images: [{
    url: String,
    alt: String,
    caption: String,
    isPrimary: Boolean,
  }],
  
  // Status and metadata
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft',
  },
  
  // Quality control
  translationStatus: {
    type: String,
    enum: ['pending', 'in-progress', 'review', 'approved', 'rejected'],
    default: 'pending',
  },
  
  translatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
  },
  
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  
  // Version control for translations
  version: {
    type: Number,
    default: 1,
  },
  
  // Auto-translation flag
  isAutoTranslated: {
    type: Boolean,
    default: false,
  },
  
  // Human translation flag
  isHumanReviewed: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Indexes for efficient querying
multilingualContentSchema.index({ contentType: 1, contentId: 1, locale: 1 });
multilingualContentSchema.index({ locale: 1, status: 1 });
multilingualContentSchema.index({ 'seo.slug': 1, locale: 1 });
multilingualContentSchema.index({ translationStatus: 1 });

// Static methods
multilingualContentSchema.statics = {
  async findByContentAndLocale(contentType, contentId, locale) {
    return this.findOne({
      contentType,
      contentId,
      locale,
      status: 'published',
    }).populate('translatedBy reviewedBy');
  },
  
  async findAllTranslations(contentType, contentId) {
    return this.find({
      contentType,
      contentId,
      status: 'published',
    }).sort({ locale: 1 });
  },
  
  async findMissingTranslations(contentType, contentId) {
    const allLocales = ['en', 'es', 'fr', 'de', 'zh', 'ja', 'ar', 'hi'];
    const existingTranslations = await this.find({
      contentType,
      contentId,
      status: 'published',
    }).distinct('locale');
    
    return allLocales.filter(locale => !existingTranslations.includes(locale));
  },
};

// Instance methods
multilingualContentSchema.methods = {
  async approveTranslation(reviewerId) {
    this.translationStatus = 'approved';
    this.reviewedBy = reviewerId;
    this.isHumanReviewed = true;
    return this.save();
  },
  
  async rejectTranslation(reviewerId, reason) {
    this.translationStatus = 'rejected';
    this.reviewedBy = reviewerId;
    this.rejectionReason = reason;
    return this.save();
  },
};

const MultilingualContent = mongoose.models.MultilingualContent || mongoose.model('MultilingualContent', multilingualContentSchema);

export default MultilingualContent;