// src/matchFinder/utils/common.ts - Common utilities

import { ProductData } from '../../types';
import { SupportedMarketplace } from '../types';
import { createLogger } from './logger';

const logger = createLogger('CommonUtils');

/**
 * Create a search URL for the given marketplace and product
 * 
 * @param product - Product to search for
 * @param marketplace - Marketplace to search in
 * @param options - Additional options
 * @returns Search URL
 */
export function createSearchUrl(
  product: ProductData,
  marketplace: SupportedMarketplace,
  options: {
    includeBrand?: boolean;
    maxTitleWords?: number;
  } = {}
): string {
  const includeBrand = options.includeBrand !== false; // Default to true
  const maxTitleWords = options.maxTitleWords || 10; // Default to 10 words
  
  // Create search term
  const brandPrefix = includeBrand && product.brand ? `${product.brand} ` : '';
  const titleTruncated = truncateTitle(product.title, maxTitleWords);
  const searchTerm = `${brandPrefix}${titleTruncated}`.trim();
  
  logger.info(`Created search term: "${searchTerm}"`);
  
  // Encode for URL
  const encodedSearchTerm = encodeURIComponent(searchTerm);
  
  // Create URL based on marketplace
  let url;
  switch (marketplace) {
    case 'amazon':
      url = `https://www.amazon.com/s?k=${encodedSearchTerm}`;
      break;
    case 'walmart':
      url = `https://www.walmart.com/search?q=${encodedSearchTerm}`;
      break;
    default:
      throw new Error(`Unsupported marketplace: ${marketplace}`);
  }
  
  logger.info(`Created search URL: ${url}`);
  return url;
}

/**
 * Truncate a title to a maximum number of words
 * 
 * @param title - Title to truncate
 * @param maxWords - Maximum number of words
 * @returns Truncated title
 */
export function truncateTitle(title: string, maxWords: number): string {
  if (!title) return '';
  
  // Strip special characters
  const cleanTitle = title.replace(/[^\w\s]/g, ' ');
  
  // Split into words
  const words = cleanTitle.split(/\s+/).filter(w => w.length > 0);
  
  // Take only the first N words
  return words.slice(0, maxWords).join(' ');
}

/**
 * Format price for display
 * 
 * @param price - Price to format
 * @param currency - Currency symbol
 * @returns Formatted price string
 */
export function formatPrice(price: number | null, currency: string = '$'): string {
  if (price === null || isNaN(price)) return 'N/A';
  return `${currency}${price.toFixed(2)}`;
}

/**
 * Wait for a specified amount of time
 * 
 * @param ms - Milliseconds to wait
 * @returns Promise that resolves after the specified time
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Safely parse a price string to a number
 * 
 * @param priceText - Price text to parse
 * @returns Parsed price or null if invalid
 */
export function parsePrice(priceText: string | null): number | null {
  if (!priceText) return null;
  
  // Handle cases where price might be split between multiple elements
  if (priceText === '$') return null;
  
  // Remove currency symbols, commas, and whitespace
  const cleanedText = priceText.replace(/[^\d.,]/g, '');
  
  try {
    // Convert to number
    const price = parseFloat(cleanedText.replace(/,/g, '.'));
    return isNaN(price) ? null : price;
  } catch (error) {
    logger.error('Error parsing price:', error);
    return null;
  }
}
