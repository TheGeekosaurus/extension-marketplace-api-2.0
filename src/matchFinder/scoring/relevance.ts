// src/matchFinder/scoring/relevance.ts - Relevance scoring functions

import { ExtractedMatch } from '../types';
import { createLogger } from '../utils/logger';

const logger = createLogger('RelevanceScoring');

/**
 * Score products by relevance to prioritize the most relevant matches
 * 
 * @param products - List of product matches
 * @returns Scored products sorted by relevance (highest first)
 */
export function scoreProductsByRelevance(products: ExtractedMatch[]): ExtractedMatch[] {
  if (!products || products.length === 0) return [];
  if (products.length === 1) return products;
  
  logger.info(`Scoring ${products.length} products by relevance`);
  
  // Score each product based on multiple factors
  const scoredProducts = products.map(product => {
    let relevanceScore = 0;
    
    // Start with similarity score - scale to 0-100 range
    relevanceScore += product.similarityScore * 100;
    
    // Add additional factors if available
    if (product.ratings?.average) {
      relevanceScore += Math.min(product.ratings.average * 5, 25); // Up to 25 points for a 5-star rating
    }
    
    if (product.ratings?.count) {
      relevanceScore += Math.min(Math.log10(product.ratings.count) * 10, 25); // Up to 25 points for popular products
    }
    
    logger.debug(`Product "${product.title.substring(0, 30)}..." relevance score: ${relevanceScore.toFixed(2)}`);
    
    return {
      ...product,
      relevanceScore
    };
  });
  
  // Sort by relevance score (highest first)
  return scoredProducts.sort((a, b) => {
    // First compare by relevance score if available
    if (a.relevanceScore !== undefined && b.relevanceScore !== undefined) {
      return b.relevanceScore - a.relevanceScore;
    }
    
    // Fall back to similarity score
    return b.similarityScore - a.similarityScore;
  });
}

/**
 * Filter products based on minimum similarity threshold
 * 
 * @param products - Products to filter
 * @param minSimilarity - Minimum similarity threshold (0-1)
 * @returns Filtered products
 */
export function filterProductsByMinSimilarity(products: ExtractedMatch[], minSimilarity: number = 0.3): ExtractedMatch[] {
  logger.info(`Filtering products with minimum similarity threshold: ${minSimilarity}`);
  
  const filteredProducts = products.filter(product => product.similarityScore >= minSimilarity);
  
  logger.info(`Filtered ${products.length} products to ${filteredProducts.length}`);
  
  return filteredProducts;
}

/**
 * Calculate diversity score to ensure varied results
 * 
 * @param products - Products to score
 * @returns Products with diversity scores
 */
export function calculateDiversityScore(products: ExtractedMatch[]): ExtractedMatch[] {
  if (products.length <= 1) return products;
  
  const scoredProducts = [...products];
  
  // Calculate similarity between each pair of products
  for (let i = 0; i < scoredProducts.length; i++) {
    let diversityScore = 1.0; // Start with maximum diversity
    
    for (let j = 0; j < scoredProducts.length; j++) {
      if (i === j) continue;
      
      // Reduce diversity score based on title similarity with other products
      if (scoredProducts[i].title && scoredProducts[j].title) {
        const titleSimilarity = calculateTitleSimilarityBetweenProducts(
          scoredProducts[i].title,
          scoredProducts[j].title
        );
        
        // Reduce diversity score more for earlier products (higher ranked)
        const positionFactor = 1 - (j / scoredProducts.length);
        diversityScore -= titleSimilarity * 0.2 * positionFactor;
      }
    }
    
    // Ensure diversity score is between 0 and 1
    diversityScore = Math.max(0, Math.min(1, diversityScore));
    
    scoredProducts[i] = {
      ...scoredProducts[i],
      diversityScore
    };
  }
  
  return scoredProducts;
}

/**
 * Calculate similarity between two product titles
 * 
 * @param title1 - First title
 * @param title2 - Second title
 * @returns Similarity score (0-1)
 */
function calculateTitleSimilarityBetweenProducts(title1: string, title2: string): number {
  const normalize = (str: string) => str.toLowerCase().replace(/[^\w\s]/g, '');
  
  const normalizedTitle1 = normalize(title1);
  const normalizedTitle2 = normalize(title2);
  
  // Get words from titles (filter out very short words)
  const words1 = normalizedTitle1.split(/\s+/).filter(w => w.length > 2);
  const words2 = normalizedTitle2.split(/\s+/).filter(w => w.length > 2);
  
  if (words1.length === 0 || words2.length === 0) return 0;
  
  // Count matching words
  let matchCount = 0;
  for (const word1 of words1) {
    if (words2.includes(word1)) {
      matchCount++;
    }
  }
  
  // Calculate similarity score (0-1)
  return matchCount / Math.max(words1.length, words2.length);
}

/**
 * Types to define product ratings info
 */
interface RatingsInfo {
  average: number | null;
  count: number | null;
}

// Add to ExtractedMatch interface
declare module '../types' {
  interface ExtractedMatch {
    ratings?: RatingsInfo;
    relevanceScore?: number;
    diversityScore?: number;
  }
}
