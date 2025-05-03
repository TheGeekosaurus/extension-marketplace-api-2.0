// src/background/services/searchService.ts - Service for background searches

import { ProductData, ProductMatchResult } from '../../types';
import { createLogger } from '../utils/logger';

// Initialize logger
const logger = createLogger('SearchService');

/**
 * Fetch a web page
 * 
 * @param url - URL to fetch
 * @returns HTML content of the page or null if the fetch fails
 */
export async function fetchPage(url: string): Promise<string | null> {
  try {
    logger.info(`Fetching page: ${url}`);
    const response = await fetch(url);
    if (!response.ok) {
      logger.error(`Fetch failed: ${response.status}`);
      return null;
    }
    const html = await response.text();
    return html;
  } catch (error) {
    logger.error(`Error fetching page: ${error}`);
    return null;
  }
}

/**
 * Extract products from a search results page
 * 
 * @param html - HTML content of the page
 * @param marketplace - Marketplace (amazon or walmart)
 * @param baseUrl - Base URL of the page for constructing absolute URLs
 * @returns Array of extracted products
 */
export async function extractProductFromPage(
  html: string, 
  marketplace: string,
  baseUrl: string
): Promise<any[]> {
  try {
    logger.info(`Extracting products from ${marketplace} search results page`);
    
    // Create a temporary DOM parser
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Extract products based on marketplace
    if (marketplace === 'amazon') {
      return extractAmazonProducts(doc, baseUrl);
    } else if (marketplace === 'walmart') {
      return extractWalmartProducts(doc, baseUrl);
    }
    
    return [];
  } catch (error) {
    logger.error(`Error extracting products: ${error}`);
    return [];
  }
}

/**
 * Extract products from Amazon search results
 * 
 * @param doc - Document object of the page
 * @param baseUrl - Base URL for constructing absolute URLs
 * @returns Array of extracted products
 */
function extractAmazonProducts(doc: Document, baseUrl: string): any[] {
  const products: any[] = [];
  const productElements = Array.from(doc.querySelectorAll('.s-result-item[data-asin]:not(.AdHolder)'));
  
  logger.info(`Found ${productElements.length} Amazon product elements`);
  
  for (const element of productElements) {
    try {
      // Skip sponsored products
      if (element.querySelector('.s-sponsored-label-info-icon')) {
        continue;
      }
      
      // Get ASIN
      const asin = element.getAttribute('data-asin');
      if (!asin) continue;
      
      // Get title
      const titleElement = element.querySelector('h2');
      if (!titleElement) continue;
      const title = titleElement.textContent?.trim() || '';
      
      // Get price
      let price: number | null = null;
      const priceElement = element.querySelector('.a-price .a-offscreen');
      if (priceElement) {
        const priceText = priceElement.textContent || '';
        price = parsePrice(priceText);
      }
      
      // Get image
      let imageUrl = '';
      const imgElement = element.querySelector('img.s-image');
      if (imgElement) {
        imageUrl = imgElement.getAttribute('src') || '';
      }
      
      // Get URL
      let url = '';
      const linkElement = element.querySelector('a.a-link-normal[href*="/dp/"]');
      if (linkElement) {
        const href = linkElement.getAttribute('href') || '';
        url = href.startsWith('http') ? href : `https://www.amazon.com${href}`;
      }
      
      // Get ratings
      let ratings = null;
      const ratingElement = element.querySelector('.a-icon-star-small');
      const reviewCountElement = element.querySelector('.a-size-base.puis-normal-weight-text');
      
      if (ratingElement && reviewCountElement) {
        const ratingText = ratingElement.textContent || '';
        const reviewCountText = reviewCountElement.textContent || '';
        
        const ratingMatch = ratingText.match(/(\d+(\.\d+)?)/);
        const reviewCountMatch = reviewCountText.match(/(\d+)/);
        
        ratings = {
          average: ratingMatch ? parseFloat(ratingMatch[1]) : null,
          count: reviewCountMatch ? parseInt(reviewCountMatch[1], 10) : null
        };
      }
      
      if (title && (price !== null || url)) {
        products.push({
          title,
          price,
          image: imageUrl,
          url,
          marketplace: 'amazon',
          asin,
          ratings
        });
      }
    } catch (error) {
      logger.warn(`Error extracting Amazon product: ${error}`);
      continue;
    }
  }
  
  return products;
}

/**
 * Extract products from Walmart search results
 * 
 * @param doc - Document object of the page
 * @param baseUrl - Base URL for constructing absolute URLs
 * @returns Array of extracted products
 */
function extractWalmartProducts(doc: Document, baseUrl: string): any[] {
  const products: any[] = [];
  
  // Try multiple selectors for Walmart products
  const productSelectors = [
    '[data-item-id]', 
    '[data-product-id]', 
    '.search-result-gridview-item'
  ];
  
  let productElements: Element[] = [];
  
  // Try each selector until we find some products
  for (const selector of productSelectors) {
    productElements = Array.from(doc.querySelectorAll(selector));
    if (productElements.length > 0) {
      break;
    }
  }
  
  logger.info(`Found ${productElements.length} Walmart product elements`);
  
  for (const element of productElements) {
    try {
      // Get product ID
      const itemId = element.getAttribute('data-item-id') || 
                    element.getAttribute('data-product-id') || '';
      
      // Get title
      const titleElement = element.querySelector('[data-automation-id="product-title"], .sans-serif.mid-gray');
      if (!titleElement) continue;
      const title = titleElement.textContent?.trim() || '';
      
      // Get price
      let price: number | null = null;
      const priceElement = element.querySelector('[data-automation-id="product-price"], .b.black.f1.mr1');
      if (priceElement) {
        const priceText = priceElement.textContent || '';
        price = parsePrice(priceText);
      }
      
      // Get image
      let imageUrl = '';
      const imgElement = element.querySelector('img[data-automation-id="product-image"], img.absolute');
      if (imgElement) {
        imageUrl = imgElement.getAttribute('src') || '';
      }
      
      // Get URL
      let url = '';
      const linkElement = element.querySelector('a[link-identifier="linkTest"], a.absolute.w-100.h-100');
      if (linkElement) {
        const href = linkElement.getAttribute('href') || '';
        url = href.startsWith('http') ? href : `https://www.walmart.com${href}`;
      }
      
      // Get ratings
      let ratings = null;
      const ratingElement = element.querySelector('[data-automation-id="product-stars"]');
      const reviewCountElement = element.querySelector('[data-automation-id="product-review-count"]');
      
      if (ratingElement && reviewCountElement) {
        const ratingText = ratingElement.getAttribute('aria-label') || '';
        const reviewCountText = reviewCountElement.textContent || '';
        
        const ratingMatch = ratingText.match(/(\d+(\.\d+)?)/);
        const reviewCountMatch = reviewCountText.match(/(\d+)/);
        
        ratings = {
          average: ratingMatch ? parseFloat(ratingMatch[1]) : null,
          count: reviewCountMatch ? parseInt(reviewCountMatch[1], 10) : null
        };
      }
      
      if (title && (price !== null || url)) {
        products.push({
          title,
          price,
          image: imageUrl,
          url,
          marketplace: 'walmart',
          item_id: itemId,
          ratings
        });
      }
    } catch (error) {
      logger.warn(`Error extracting Walmart product: ${error}`);
      continue;
    }
  }
  
  return products;
}

/**
 * Parse price from text
 * 
 * @param priceText - Text containing price
 * @returns Parsed price or null if parsing fails
 */
function parsePrice(priceText: string): number | null {
  if (!priceText) return null;
  
  // Remove all non-numeric characters except decimal point
  const cleanedText = priceText.replace(/[^\d.]/g, '');
  
  try {
    const price = parseFloat(cleanedText);
    
    // Fix price if it looks like a parsing error
    if (price > 1000) {
      const priceString = price.toString();
      if (priceString.length > 5) {
        // Extract what's likely the real price
        return parseFloat(priceString.substring(0, 2) + '.' + priceString.substring(2, 4));
      }
    }
    
    return isNaN(price) ? null : price;
  } catch (error) {
    return null;
  }
}

/**
 * Find the best match for a product from a list of candidates
 * 
 * @param sourceProduct - Product to match
 * @param candidates - List of candidate products
 * @returns Best match and similarity score
 */
export function findBestMatch(sourceProduct: ProductData, candidates: any[]): { bestMatch: any | null; similarity: number } {
  if (!candidates || candidates.length === 0) {
    return { bestMatch: null, similarity: 0 };
  }
  
  // Filter out candidates with missing title
  const validCandidates = candidates.filter(c => c.title);
  
  if (validCandidates.length === 0) {
    return { bestMatch: null, similarity: 0 };
  }
  
  // Calculate similarity score for each candidate
  const candidatesWithScores = validCandidates.map(candidate => {
    const similarity = calculateTitleSimilarity(candidate.title, sourceProduct.title);
    return { ...candidate, similarity };
  });
  
  // Sort by similarity (highest first)
  candidatesWithScores.sort((a, b) => b.similarity - a.similarity);
  
  // Get the best match
  const bestMatch = candidatesWithScores[0];
  
  // Only return if it's a decent match
  if (bestMatch.similarity < 0.3) {
    logger.warn(`Best match has low similarity score: ${bestMatch.similarity}`);
    return { bestMatch: null, similarity: 0 };
  }
  
  return { bestMatch, similarity: bestMatch.similarity };
}

/**
 * Calculate similarity between two product titles
 * 
 * @param title1 - First product title
 * @param title2 - Second product title
 * @returns Similarity score between 0 and 1
 */
function calculateTitleSimilarity(title1: string, title2: string): number {
  if (!title1 || !title2) return 0;
  
  // Normalize strings
  const normalize = (str: string) => str.toLowerCase().replace(/[^\w\s]/g, '');
  
  const normalizedTitle1 = normalize(title1);
  const normalizedTitle2 = normalize(title2);
  
  // Get words from titles (filter out very short words)
  const words1 = normalizedTitle1.split(/\s+/).filter(w => w.length > 2);
  const words2 = normalizedTitle2.split(/\s+/).filter(w => w.length > 2);
  
  // Count matching words
  let matchCount = 0;
  for (const word1 of words1) {
    if (words2.some(word2 => word2.includes(word1) || word1.includes(word2))) {
      matchCount++;
    }
  }
  
  // Calculate similarity score (0-1)
  return matchCount / Math.max(words1.length, words2.length);
}
