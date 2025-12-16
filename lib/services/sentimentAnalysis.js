// Simple sentiment analysis service
// In a production environment, you might want to use a more sophisticated service
// like Google Cloud Natural Language API, AWS Comprehend, or OpenAI

const POSITIVE_WORDS = [
  'excellent', 'amazing', 'wonderful', 'fantastic', 'great', 'good', 'nice', 'pleasant',
  'comfortable', 'helpful', 'friendly', 'professional', 'clean', 'spacious', 'delicious',
  'satisfied', 'impressed', 'love', 'perfect', 'awesome', 'brilliant', 'outstanding',
  'superb', 'marvelous', 'exceptional', 'terrific', 'delightful', 'enjoyable',
  'smooth', 'easy', 'convenient', 'efficient', 'reliable', 'recommend', 'best',
  'beautiful', 'gorgeous', 'stunning', 'magnificent', 'spectacular', 'phenomenal'
];

const NEGATIVE_WORDS = [
  'terrible', 'awful', 'horrible', 'bad', 'poor', 'disappointing', 'uncomfortable',
  'dirty', 'messy', 'rude', 'unhelpful', 'unprofessional', 'late', 'delayed',
  'cancelled', 'worst', 'hate', 'disgusting', 'nasty', 'annoying', 'frustrating',
  'difficult', 'inconvenient', 'unreliable', 'expensive', 'overpriced', 'waste',
  'boring', 'tired', 'exhausted', 'painful', 'stressful', 'unpleasant', 'unacceptable',
  'inadequate', 'insufficient', 'lacking', 'missing', 'broken', 'damaged', 'faulty'
];

const NEUTRAL_WORDS = [
  'okay', 'average', 'normal', 'standard', 'typical', 'regular', 'ordinary',
  'acceptable', 'fine', 'reasonable', 'moderate', 'fair', 'decent', 'satisfactory'
];

export function analyzeSentiment(text) {
  if (!text || typeof text !== 'string') {
    return { sentiment: 'neutral', score: 0 };
  }

  // Convert to lowercase and split into words
  const words = text.toLowerCase().split(/\W+/);
  
  let positiveScore = 0;
  let negativeScore = 0;
  let neutralScore = 0;

  words.forEach(word => {
    if (POSITIVE_WORDS.includes(word)) {
      positiveScore++;
    } else if (NEGATIVE_WORDS.includes(word)) {
      negativeScore++;
    } else if (NEUTRAL_WORDS.includes(word)) {
      neutralScore++;
    }
  });

  // Calculate total score
  const totalScore = positiveScore + negativeScore + neutralScore;
  
  if (totalScore === 0) {
    return { sentiment: 'neutral', score: 0 };
  }

  // Calculate normalized sentiment score (-1 to 1)
  let sentimentScore = (positiveScore - negativeScore) / Math.sqrt(totalScore);
  
  // Clamp the score between -1 and 1
  sentimentScore = Math.max(-1, Math.min(1, sentimentScore));

  // Determine sentiment category
  let sentiment;
  if (sentimentScore > 0.1) {
    sentiment = 'positive';
  } else if (sentimentScore < -0.1) {
    sentiment = 'negative';
  } else {
    sentiment = 'neutral';
  }

  return {
    sentiment,
    score: sentimentScore,
    details: {
      positiveWords: positiveScore,
      negativeWords: negativeScore,
      neutralWords: neutralScore,
      totalWords: totalScore
    }
  };
}

// Extract keywords from text
export function extractKeywords(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  // Simple keyword extraction - in production, use NLP libraries
  const words = text.toLowerCase()
    .split(/\W+/)
    .filter(word => word.length > 3) // Filter out short words
    .filter(word => !isStopWord(word)); // Filter out stop words

  // Count word frequency
  const wordFrequency = {};
  words.forEach(word => {
    wordFrequency[word] = (wordFrequency[word] || 0) + 1;
  });

  // Sort by frequency and return top keywords
  return Object.entries(wordFrequency)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([word]) => word);
}

// Simple stop words list
function isStopWord(word) {
  const stopWords = [
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were',
    'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did',
    'will', 'would', 'could', 'should', 'may', 'might', 'must',
    'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he',
    'she', 'it', 'we', 'they', 'what', 'which', 'who', 'when',
    'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few',
    'more', 'most', 'other', 'some', 'such', 'only', 'own', 'same',
    'so', 'than', 'too', 'very', 'just', 'now', 'also', 'here',
    'there', 'well', 'get', 'got', 'go', 'went', 'make', 'made',
    'take', 'took', 'come', 'came', 'see', 'saw', 'know', 'knew'
  ];
  
  return stopWords.includes(word);
}

// Batch sentiment analysis for multiple texts
export function batchSentimentAnalysis(texts) {
  return texts.map(text => analyzeSentiment(text));
}

// Get sentiment summary for a collection of reviews
export function getSentimentSummary(reviews) {
  const sentiments = reviews.map(review => review.sentiment);
  
  const positiveCount = sentiments.filter(s => s === 'positive').length;
  const negativeCount = sentiments.filter(s => s === 'negative').length;
  const neutralCount = sentiments.filter(s => s === 'neutral').length;
  
  const total = sentiments.length;
  
  return {
    positive: {
      count: positiveCount,
      percentage: (positiveCount / total) * 100
    },
    negative: {
      count: negativeCount,
      percentage: (negativeCount / total) * 100
    },
    neutral: {
      count: neutralCount,
      percentage: (neutralCount / total) * 100
    },
    total
  };
}

// Advanced sentiment analysis with context
export function advancedSentimentAnalysis(text, context = {}) {
  const basicSentiment = analyzeSentiment(text);
  const keywords = extractKeywords(text);
  
  // Consider context like rating, trip type, etc.
  let adjustedScore = basicSentiment.score;
  
  // Adjust based on rating if provided
  if (context.rating) {
    const ratingAdjustment = (context.rating - 3) / 2; // -1 to 1
    adjustedScore = (adjustedScore + ratingAdjustment) / 2;
  }
  
  // Adjust based on explicit sentiment words
  const explicitPositive = words.some(word => 
    ['love', 'excellent', 'perfect', 'amazing', 'fantastic'].includes(word)
  );
  const explicitNegative = words.some(word => 
    ['hate', 'terrible', 'awful', 'worst', 'disgusting'].includes(word)
  );
  
  if (explicitPositive) adjustedScore = Math.min(1, adjustedScore + 0.2);
  if (explicitNegative) adjustedScore = Math.max(-1, adjustedScore - 0.2);
  
  // Determine final sentiment
  let sentiment;
  if (adjustedScore > 0.15) {
    sentiment = 'positive';
  } else if (adjustedScore < -0.15) {
    sentiment = 'negative';
  } else {
    sentiment = 'neutral';
  }
  
  return {
    sentiment,
    score: adjustedScore,
    keywords,
    confidence: Math.abs(adjustedScore),
    basicSentiment,
    contextAdjustments: {
      rating: context.rating ? (context.rating - 3) / 2 : 0,
      explicitWords: explicitPositive ? 0.2 : (explicitNegative ? -0.2 : 0)
    }
  };
}