// src/content/matchFinder/utils/similarity.ts
// Unified utilities for calculating similarity between products

/**
 * Calculate similarity between two product titles
 * 
 * @param title1 - First product title
 * @param title2 - Second product title
 * @param options - Optional configuration for similarity calculation
 * @returns Similarity score between 0 and 1
 */
export function calculateTitleSimilarity(
  title1: string, 
  title2: string,
  options: {
    minWordLength?: number;
    ignoreCase?: boolean;
    removeSpecialChars?: boolean;
    exactMatchBonus?: number;
    partialMatchRatio?: number;
  } = {}
): number {
  if (!title1 || !title2) return 0;
  
  // Configure options with defaults
  const config = {
    minWordLength: options.minWordLength ?? 3,
    ignoreCase: options.ignoreCase ?? true,
    removeSpecialChars: options.removeSpecialChars ?? true,
    exactMatchBonus: options.exactMatchBonus ?? 0.2,
    partialMatchRatio: options.partialMatchRatio ?? 0.5
  };
  
  // Normalize strings based on options
  const normalize = (str: string) => {
    let normalized = str;
    
    if (config.ignoreCase) {
      normalized = normalized.toLowerCase();
    }
    
    if (config.removeSpecialChars) {
      normalized = normalized.replace(/[^\w\s]/g, '');
    }
    
    return normalized;
  };

  const normalizedTitle1 = normalize(title1);
  const normalizedTitle2 = normalize(title2);
  
  // Quick check for exact match
  if (normalizedTitle1 === normalizedTitle2) {
    return 1.0;
  }
  
  // Get words from titles (filter out short words)
  const words1 = normalizedTitle1
    .split(/\s+/)
    .filter(w => w.length >= config.minWordLength);
  
  const words2 = normalizedTitle2
    .split(/\s+/)
    .filter(w => w.length >= config.minWordLength);
  
  // Count matching words
  let exactMatches = 0;
  let partialMatches = 0;
  
  for (const word1 of words1) {
    // Look for exact matches first
    if (words2.includes(word1)) {
      exactMatches++;
      continue;
    }
    
    // Then look for partial matches (one word contains the other)
    if (words2.some(word2 => 
      word2.includes(word1) || 
      word1.includes(word2))) {
      partialMatches++;
    }
  }
  
  // Calculate the base similarity score
  const exactMatchScore = exactMatches / Math.max(words1.length, words2.length);
  const partialMatchScore = (partialMatches * config.partialMatchRatio) / 
    Math.max(words1.length, words2.length);
  
  const totalScore = exactMatchScore + partialMatchScore;
  
  // Cap the score at 1.0
  return Math.min(1.0, totalScore);
}

/**
 * Calculate enhanced similarity between products using multiple attributes
 * 
 * @param sourceProduct - Source product data
 * @param targetProduct - Target product to compare
 * @returns Similarity score between 0 and 1
 */
export function calculateProductSimilarity(
  sourceProduct: {
    title: string;
    brand?: string | null;
    price?: number | null;
  },
  targetProduct: {
    title: string;
    brand?: string | null;
    price?: number | null;
  }
): number {
  // Calculate title similarity (primary factor)
  const titleSimilarity = calculateTitleSimilarity(
    sourceProduct.title,
    targetProduct.title
  );
  
  // Weight factors
  const titleWeight = 0.7;
  const brandWeight = 0.2;
  const priceWeight = 0.1;
  
  let totalWeight = titleWeight;
  let weightedScore = titleSimilarity * titleWeight;
  
  // Add brand similarity if available
  if (sourceProduct.brand && targetProduct.brand) {
    const brandSimilarity = calculateTitleSimilarity(
      sourceProduct.brand,
      targetProduct.brand,
      { minWordLength: 1 }
    );
    weightedScore += brandSimilarity * brandWeight;
    totalWeight += brandWeight;
  }
  
  // Add price similarity if available
  if (sourceProduct.price !== null && 
      sourceProduct.price !== undefined && 
      targetProduct.price !== null && 
      targetProduct.price !== undefined) {
    
    // Calculate price similarity (0 to 1 based on percentage difference)
    const priceDiff = Math.abs(sourceProduct.price - targetProduct.price);
    const maxPrice = Math.max(sourceProduct.price, targetProduct.price);
    const priceSimilarity = maxPrice > 0 
      ? Math.max(0, 1 - (priceDiff / maxPrice))
      : 0;
    
    weightedScore += priceSimilarity * priceWeight;
    totalWeight += priceWeight;
  }
  
  // Normalize the score based on the weights actually used
  return totalWeight > 0 ? weightedScore / totalWeight : 0;
}

/**
 * Legacy wrapper for calculateTitleSimilarity to maintain compatibility
 * with existing marketplace-specific implementations
 */
export function calculateAmazonTitleSimilarity(title1: string, title2: string): number {
  return calculateTitleSimilarity(title1, title2);
}

/**
 * Legacy wrapper for calculateTitleSimilarity to maintain compatibility
 * with existing marketplace-specific implementations
 */
export function calculateWalmartTitleSimilarity(title1: string, title2: string): number {
  return calculateTitleSimilarity(title1, title2);
}