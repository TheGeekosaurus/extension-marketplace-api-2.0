// src/matchFinder/scoring/similarity.ts - Similarity scoring functions

import { createLogger } from '../utils/logger';

const logger = createLogger('SimilarityScoring');

/**
 * Calculate similarity between two product titles
 * 
 * @param title1 - First product title
 * @param title2 - Second product title
 * @returns Similarity score between 0 and 1
 */
export function calculateTitleSimilarity(title1: string, title2: string): number {
  if (!title1 || !title2) {
    logger.debug('Empty title provided for similarity calculation');
    return 0;
  }
  
  // Normalize strings
  const normalize = (str: string) => str.toLowerCase().replace(/[^\w\s]/g, '');
  
  const normalizedTitle1 = normalize(title1);
  const normalizedTitle2 = normalize(title2);
  
  // Get words from titles (filter out very short words)
  const words1 = normalizedTitle1.split(/\s+/).filter(w => w.length > 2);
  const words2 = normalizedTitle2.split(/\s+/).filter(w => w.length > 2);
  
  if (words1.length === 0 || words2.length === 0) {
    logger.debug('No significant words found in title(s)');
    return 0;
  }
  
  // Count matching words
  let matchCount = 0;
  for (const word1 of words1) {
    if (words2.some(word2 => word2.includes(word1) || word1.includes(word2))) {
      matchCount++;
    }
  }
  
  // Calculate similarity score (0-1)
  const similarityScore = matchCount / Math.max(words1.length, words2.length);
  
  logger.debug(`Similarity between "${title1.substring(0, 20)}..." and "${title2.substring(0, 20)}...": ${similarityScore.toFixed(3)}`);
  
  return similarityScore;
}

/**
 * Calculate brand similarity
 * 
 * @param brand1 - First brand
 * @param brand2 - Second brand
 * @returns Similarity score between 0 and 1
 */
export function calculateBrandSimilarity(brand1: string | null, brand2: string | null): number {
  if (!brand1 || !brand2) {
    return 0;
  }
  
  // Normalize brands
  const normalize = (str: string) => str.toLowerCase().replace(/[^\w\s]/g, '');
  
  const normalizedBrand1 = normalize(brand1);
  const normalizedBrand2 = normalize(brand2);
  
  // Exact match
  if (normalizedBrand1 === normalizedBrand2) {
    return 1;
  }
  
  // One contains the other
  if (normalizedBrand1.includes(normalizedBrand2) || normalizedBrand2.includes(normalizedBrand1)) {
    const lengthRatio = Math.min(normalizedBrand1.length, normalizedBrand2.length) / 
                        Math.max(normalizedBrand1.length, normalizedBrand2.length);
    return 0.8 * lengthRatio; // Scale between 0 and 0.8
  }
  
  // Calculate Levenshtein distance (character-by-character similarity)
  return levenshteinSimilarity(normalizedBrand1, normalizedBrand2);
}

/**
 * Calculate combined product similarity based on multiple factors
 * 
 * @param sourceTitle - Source product title
 * @param targetTitle - Target product title
 * @param sourceBrand - Source product brand
 * @param targetBrand - Target product brand
 * @returns Combined similarity score
 */
export function calculateProductSimilarity(
  sourceTitle: string,
  targetTitle: string,
  sourceBrand: string | null,
  targetBrand: string | null
): number {
  const titleSimilarity = calculateTitleSimilarity(sourceTitle, targetTitle);
  const brandSimilarity = calculateBrandSimilarity(sourceBrand, targetBrand);
  
  // Weight factors: title 70%, brand 30%
  let combinedScore = titleSimilarity * 0.7;
  
  // Only add brand similarity if both brands are available
  if (sourceBrand && targetBrand) {
    combinedScore += brandSimilarity * 0.3;
  }
  
  logger.debug(`Combined similarity score: ${combinedScore.toFixed(3)} (title: ${titleSimilarity.toFixed(3)}, brand: ${brandSimilarity.toFixed(3)})`);
  
  return combinedScore;
}

/**
 * Calculate Levenshtein similarity between two strings
 * 
 * @param str1 - First string
 * @param str2 - Second string
 * @returns Normalized similarity score between 0 and 1
 */
function levenshteinSimilarity(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  
  // Create distance matrix
  const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(null));
  
  // Initialize the matrix
  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;
  
  // Fill the matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  
  // Get the distance
  const distance = matrix[len1][len2];
  
  // Normalize to a similarity score between 0 and 1
  const maxLen = Math.max(len1, len2);
  if (maxLen === 0) return 1; // Both strings are empty
  
  return 1 - distance / maxLen;
}
