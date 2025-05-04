// src/content/matchFinder/amazonSearch.ts - Amazon search results page extraction

import { ProductMatchResult } from '../../types';

/**
 * Find all product elements on an Amazon search page
 * 
 * @returns Array of DOM elements representing search results
 */
export function findAmazonSearchResultElements(): Element[] {
  try {
    // Main search result selector
    const results = document.querySelectorAll('.s-result-item[data-asin]:not(.AdHolder)');
    
    if (results.length > 0) {
      console.log(`[E-commerce Arbitrage] Found ${results.length} Amazon search results`);
      return Array.from(results);
    }
    
    // Fallback selectors
    const fallbackResults = document.querySelectorAll('.s-result-list .a-section[data-asin], .sg-row[data-asin]');
    
    if (fallbackResults.length > 0) {
      console.log(`[E-commerce Arbitrage] Found ${fallbackResults.length} Amazon search results using fallback selector`);
      return Array.from(fallbackResults);
    }
    
    console.warn('[E-commerce Arbitrage] No Amazon search results found on page');
    return [];
  } catch (error) {
    console.error('[E-commerce Arbitrage] Error finding Amazon search results:', error);
    return [];
  }
}

/**
 * Extract a product from an Amazon search result element
 * 
 * @param element - The search result DOM element
 * @returns Extracted product match data
 */
export function extractAmazonSearchResult(element: Element): Partial<ProductMatchResult> | null {
  try {
    // Extract title
    const titleElement = element.querySelector('h2, h2 a, .a-text-normal');
    const title = titleElement?.textContent?.trim() || '';
    
    if (!title) {
      console.log('[E-commerce Arbitrage] No title found in Amazon search result');
      return null;
    }
    
    // Extract price
    const priceElement = element.querySelector('.a-price .a-offscreen');
    let price: number | null = null;
    
    if (priceElement) {
      const priceText = priceElement.textContent || '';
      // Extract just the numeric part with up to 2 decimal places
      const priceMatch = priceText.match(/\$?(\d+(?:\.\d{1,2})?)/);
      if (priceMatch && priceMatch[1]) {
        price = parseFloat(priceMatch[1]);
      }
    }
    
    if (price === null) {
      // Try alternative price selectors
      const altPriceElement = element.querySelector('.a-color-price, .a-color-base');
      if (altPriceElement) {
        const priceText = altPriceElement.textContent || '';
        const priceMatch = priceText.match(/\$?(\d+(?:\.\d{1,2})?)/);
        if (priceMatch && priceMatch[1]) {
          price = parseFloat(priceMatch[1]);
        }
      }
    }
    
    if (price === null || isNaN(price)) {
      console.log('[E-commerce Arbitrage] No valid price found in Amazon search result');
      return null;
    }
    
    // Get URL
    const linkElement = element.querySelector('a.a-link-normal[href*="/dp/"]');
    const url = linkElement ? 
      new URL(linkElement.getAttribute('href') || '', window.location.origin).href : '';
    
    if (!url) {
      console.log('[E-commerce Arbitrage] No URL found in Amazon search result');
      return null;
    }
    
    // Extract ASIN
    let asin: string | undefined = undefined;
    if (url) {
      const asinMatch = url.match(/\/dp\/([A-Z0-9]{10})(?:\/|$)/i);
      if (asinMatch && asinMatch[1]) {
        asin = asinMatch[1];
      }
    }
    
    // Get image
    const imgElement = element.querySelector('img.s-image');
    const imageUrl = imgElement ? imgElement.getAttribute('src') || undefined : undefined;
    
    // Get ratings
    const ratingElement = element.querySelector('.a-icon-star-small, .a-icon-star');
    let ratingText = ratingElement ? ratingElement.textContent || '' : '';
    let rating: number | null = null;
    
    if (ratingText) {
      const ratingMatch = ratingText.match(/(\d+(?:\.\d+)?)/);
      if (ratingMatch && ratingMatch[1]) {
        rating = parseFloat(ratingMatch[1]);
      }
    }
    
    // Get review count
    const reviewCountElement = element.querySelector('.a-size-small.a-link-normal');
    let reviewCount: number | null = null;
    
    if (reviewCountElement) {
      const countText = reviewCountElement.textContent || '';
      const countMatch = countText.match(/(\d+(?:,\d+)*)/);
      if (countMatch && countMatch[1]) {
        reviewCount = parseInt(countMatch[1].replace(/,/g, ''), 10);
      }
    }
    
    return {
      title,
      price,
      image: imageUrl,
      url,
      marketplace: 'amazon',
      asin,
      ratings: {
        average: rating,
        count: reviewCount
      }
    };
  } catch (error) {
    console.error('[E-commerce Arbitrage] Error extracting Amazon search result:', error);
    return null;
  }
}

/**
 * Calculate similarity between two product titles
 * Used for comparing source product with potential matches
 * 
 * @param title1 - First product title
 * @param title2 - Second product title
 * @returns Similarity score between 0 and 1
 */
export function calculateAmazonTitleSimilarity(title1: string, title2: string): number {
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
