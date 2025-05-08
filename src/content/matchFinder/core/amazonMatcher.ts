// src/content/matchFinder/core/amazonMatcher.ts
// Amazon-specific implementation of the MarketplaceMatcher

import { MarketplaceMatcher, ProductMatchResult } from './types';
import { extractText, extractPrice, extractAttribute, trySelectors } from '../utils/dom';
import { calculateTitleSimilarity } from '../utils/similarity';
import { createLogger } from '../utils/logger';

// Set up logger
const logger = createLogger('AmazonMatcher');

/**
 * Amazon product matcher implementation
 */
export const AmazonMatcher: MarketplaceMatcher = {
  marketplace: 'amazon',
  
  /**
   * Find all product elements on an Amazon search page
   */
  findSearchResultElements(): Element[] {
    try {
      logger.info('Finding Amazon search result elements');
      
      // Try multiple selectors as Amazon's DOM structure can vary
      const selectors = [
        // Standard search results
        '.s-result-item[data-asin]:not(.AdHolder)',
        // Sponsored products that are still valid
        '.s-result-item[data-asin].AdHolder .s-inner-result-item',
        // Alternative layout selectors
        '.s-result-list .a-section[data-asin]',
        '.sg-row[data-asin]',
        '.rush-component[data-asin]'
      ];
      
      const results = trySelectors(selectors);
      logger.info(`Found ${results.length} Amazon search result elements`);
      
      // Filter out any elements that don't have sufficient data
      const validResults = results.filter(element => {
        const hasTitle = !!extractText(element, [
          'h2', 'h2 a', '.a-text-normal', '.a-size-medium'
        ]);
        
        const hasPrice = !!extractPrice(element, [
          '.a-price .a-offscreen',
          '.a-color-price',
          '.a-price',
          '[data-a-color="price"]'
        ]);
        
        return hasTitle && hasPrice;
      });
      
      logger.info(`Found ${validResults.length} valid Amazon search results with title and price`);
      return validResults;
    } catch (error) {
      logger.error('Error finding Amazon search results:', error);
      return [];
    }
  },
  
  /**
   * Extract product data from an Amazon search result element
   */
  extractSearchResult(element: Element): Partial<ProductMatchResult> | null {
    try {
      // Extract title using multiple potential selectors
      const titleSelectors = [
        'h2', 'h2 a', '.a-text-normal', '.a-size-medium', '[data-cy="title-recipe"]'
      ];
      const title = extractText(element, titleSelectors);
      
      if (!title) {
        logger.debug('No title found in Amazon search result');
        return null;
      }
      
      // Extract price using multiple potential selectors
      const priceSelectors = [
        '.a-price .a-offscreen',
        '.a-color-price',
        '.a-price',
        '[data-a-color="price"]'
      ];
      const price = extractPrice(element, priceSelectors);
      
      if (price === null) {
        logger.debug('No price found in Amazon search result');
        return null;
      }
      
      // Get URL from the product link
      const urlSelectors = [
        'a.a-link-normal[href*="/dp/"]',
        'a[href*="/dp/"]',
        'a.a-link-normal'
      ];
      const urlElement = extractAttribute(element, urlSelectors, 'href');
      const url = urlElement ? new URL(urlElement, window.location.origin).href : '';
      
      if (!url) {
        logger.debug('No URL found in Amazon search result');
        return null;
      }
      
      // Extract ASIN from URL or data attribute
      let asin: string | undefined = undefined;
      
      // Try to get ASIN from the URL
      if (url) {
        const asinMatch = url.match(/\/dp\/([A-Z0-9]{10})(?:\/|$)/i);
        if (asinMatch && asinMatch[1]) {
          asin = asinMatch[1];
        }
      }
      
      // If not found in URL, try data attribute
      if (!asin) {
        asin = element.getAttribute('data-asin') || undefined;
      }
      
      // Get image URL
      const imageSelectors = ['img.s-image', 'img[data-image-latency]', 'img.a-dynamic-image'];
      const imageUrl = extractAttribute(element, imageSelectors, 'src');
      
      // Extract ratings
      const ratingSelectors = ['.a-icon-star-small', '.a-icon-star', '[data-a-popover*="star"]'];
      const ratingText = extractText(element, ratingSelectors);
      let rating: number | null = null;
      
      if (ratingText) {
        const ratingMatch = ratingText.match(/(\d+(?:\.\d+)?)/);
        if (ratingMatch && ratingMatch[1]) {
          rating = parseFloat(ratingMatch[1]);
        }
      }
      
      // Extract review count
      const reviewCountSelectors = ['.a-size-small.a-link-normal', '[data-a-popover*="review"]'];
      const reviewCountText = extractText(element, reviewCountSelectors);
      let reviewCount: number | null = null;
      
      if (reviewCountText) {
        const countMatch = reviewCountText.match(/(\d+(?:,\d+)*)/);
        if (countMatch && countMatch[1]) {
          reviewCount = parseInt(countMatch[1].replace(/,/g, ''), 10);
        }
      }
      
      // Extract brand (if available)
      const brandSelectors = ['.a-row.a-size-base .a-size-base.a-color-secondary', '.a-row [data-a-popover*="brand"]'];
      const brand = extractText(element, brandSelectors);
      
      return {
        title,
        price,
        image: imageUrl || undefined,
        url,
        marketplace: 'amazon',
        asin,
        brand: brand || undefined,
        ratings: {
          average: rating,
          count: reviewCount
        }
      };
    } catch (error) {
      logger.error('Error extracting Amazon search result:', error);
      return null;
    }
  },
  
  /**
   * Calculate similarity between source product and search result
   */
  calculateSimilarity(sourceTitle: string, resultTitle: string): number {
    return calculateTitleSimilarity(sourceTitle, resultTitle);
  }
};