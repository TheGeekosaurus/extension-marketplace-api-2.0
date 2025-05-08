// src/content/matchFinder/core/walmartMatcher.ts
// Walmart-specific implementation of the MarketplaceMatcher

import { MarketplaceMatcher, ProductMatchResult } from './types';
import { extractText, extractPrice, extractAttribute, trySelectors } from '../utils/dom';
import { calculateTitleSimilarity } from '../utils/similarity';
import { createLogger } from '../utils/logger';

// Set up logger
const logger = createLogger('WalmartMatcher');

/**
 * Walmart product matcher implementation
 */
export const WalmartMatcher: MarketplaceMatcher = {
  marketplace: 'walmart',
  
  /**
   * Find all product elements on a Walmart search page
   */
  findSearchResultElements(): Element[] {
    try {
      logger.info('Finding Walmart search result elements');
      
      // Try multiple selectors as Walmart's DOM structure can vary
      const selectors = [
        // Product cards with item IDs
        '[data-item-id]',
        '[data-product-id]',
        // Grid view items
        '.search-result-gridview-item',
        '.product-search-result',
        // Standard product containers
        '.sans-serif.relative.pb3.pt2.ph3.w-100',
        // Newer layout selectors
        '[data-testid="list-view"] [data-testid="product-card"]',
        '[data-testid="search-results"] > li',
        '.mb1.ph1.pa0-xl.pb1.pb2-xl.pt1.pt2-xl.cursor-pointer'
      ];
      
      const results = trySelectors(selectors);
      logger.info(`Found ${results.length} Walmart search result elements`);
      
      // Filter out any elements that don't have sufficient data
      const validResults = results.filter(element => {
        const hasTitle = !!extractText(element, [
          '[data-automation-id="product-title"]',
          '.sans-serif.mid-gray',
          '.w_iUH',
          '.lh-title',
          '[data-testid="product-title"]'
        ]);
        
        const hasPrice = !!extractPrice(element, [
          '[data-automation-id="product-price"]',
          '.b.black.f1.mr1',
          '.w_iUH',
          '[data-testid="price-current"]',
          '[data-testid="list-view-price"]'
        ]);
        
        return hasTitle && hasPrice;
      });
      
      logger.info(`Found ${validResults.length} valid Walmart search results with title and price`);
      return validResults;
    } catch (error) {
      logger.error('Error finding Walmart search results:', error);
      return [];
    }
  },
  
  /**
   * Extract product data from a Walmart search result element
   */
  extractSearchResult(element: Element): Partial<ProductMatchResult> | null {
    try {
      // Extract title using multiple potential selectors
      const titleSelectors = [
        '[data-automation-id="product-title"]',
        '.sans-serif.mid-gray',
        '.w_iUH',
        '.lh-title',
        '[data-testid="product-title"]',
        'span.f6.f5-l.fw5.lh-title'
      ];
      const title = extractText(element, titleSelectors);
      
      if (!title) {
        logger.debug('No title found in Walmart search result');
        return null;
      }
      
      // Extract price using multiple potential selectors
      const priceSelectors = [
        // Current format with "current price" text
        '[data-automation-id="product-price"] .w_iUH7',
        // Various container selectors for price
        '[data-automation-id="product-price"]',
        '.b.black.f1.mr1',
        '.w_iUH',
        '[data-testid="price-current"]',
        '[data-testid="list-view-price"]',
        'div[data-testid="add-to-cart-section"] span.f4.fw6',
        // Newer formats
        'div[class*="flex-wrap justify-start items-center"]',
        'span.f3',
        '.b.black.lh-solid.f5.f4',
        // Composite styles
        '.mrl.mr2-x1.b.black.lh-solid.f5.f4-1',
        // Fallbacks
        '[class*="price"]'
      ];
      const price = extractPrice(element, priceSelectors);
      
      if (price === null) {
        logger.debug('No price found in Walmart search result');
        return null;
      }
      
      // Get URL from the product link
      const urlSelectors = [
        'a[link-identifier="linkTest"]',
        'a.absolute.w-100.h-100',
        '.sans-serif.w_iUH a',
        '[data-testid="product-title"] a',
        'a[data-testid="product-title"]'
      ];
      const urlElement = extractAttribute(element, urlSelectors, 'href');
      const url = urlElement ? new URL(urlElement, window.location.origin).href : '';
      
      if (!url) {
        logger.debug('No URL found in Walmart search result');
        return null;
      }
      
      // Extract product ID from URL or data attribute
      let productId: string | undefined = undefined;
      
      // Try to get ID from data attributes first
      productId = element.getAttribute('data-item-id') || 
                 element.getAttribute('data-product-id') || undefined;
      
      // If not found in data attributes, try the URL
      if (!productId && url) {
        // Try multiple patterns that appear in Walmart URLs
        const idPatterns = [
          /\/ip\/(?:.*?)\/(\d+)/,  // /ip/Title-Here/12345
          /\/ip\/(\d+)/,           // /ip/12345
          /\/(\d+)(?:\?|\&|$)/     // /12345 or /12345?param
        ];
        
        for (const pattern of idPatterns) {
          const match = url.match(pattern);
          if (match && match[1]) {
            productId = match[1];
            break;
          }
        }
      }
      
      // Get image URL
      const imageSelectors = [
        'img[data-automation-id="product-image"]',
        'img.absolute',
        'img.w_iUF',
        '[data-testid="product-image"] img',
        'img[data-testid="image"]'
      ];
      const imageUrl = extractAttribute(element, imageSelectors, 'src');
      
      // Extract ratings
      const ratingSelectors = [
        '.stars-container',
        '[data-automation-id="product-stars"]',
        '[data-testid="stars-container"]',
        '[aria-label*="stars"]'
      ];
      let rating: number | null = null;
      
      // First try to get rating from aria-label attribute
      const ratingElement = element.querySelector(ratingSelectors.join(','));
      if (ratingElement) {
        const ariaLabel = ratingElement.getAttribute('aria-label');
        if (ariaLabel && ariaLabel.includes('stars')) {
          const ratingMatch = ariaLabel.match(/(\d+(?:\.\d+)?)\s*stars?/i);
          if (ratingMatch && ratingMatch[1]) {
            rating = parseFloat(ratingMatch[1]);
          }
        }
        
        // If not found in aria-label, try the style width (Walmart often uses width % for ratings)
        if (rating === null) {
          const styleWidth = ratingElement.getAttribute('style');
          if (styleWidth && styleWidth.includes('width')) {
            const widthMatch = styleWidth.match(/width:?\s*(\d+(?:\.\d+)?)%/);
            if (widthMatch && widthMatch[1]) {
              // Convert percentage to a 5-star rating (100% = 5 stars)
              rating = (parseFloat(widthMatch[1]) / 100) * 5;
            }
          }
        }
      }
      
      // Extract review count
      const reviewCountSelectors = [
        '.stars-reviews-count',
        '[data-automation-id="product-reviews"]',
        '[data-testid="review-count"]',
        'span.gray'
      ];
      const reviewCountText = extractText(element, reviewCountSelectors);
      let reviewCount: number | null = null;
      
      if (reviewCountText) {
        const countMatch = reviewCountText.match(/(\d+(?:,\d+)*)/);
        if (countMatch && countMatch[1]) {
          reviewCount = parseInt(countMatch[1].replace(/,/g, ''), 10);
        }
      }
      
      // Extract brand (if available)
      const brandSelectors = [
        '[data-automation-id="product-brand"]',
        '.f6.gray.fw4',
        '[data-testid="product-brand"]'
      ];
      const brand = extractText(element, brandSelectors);
      
      return {
        title,
        price,
        image: imageUrl || undefined,
        url,
        marketplace: 'walmart',
        item_id: productId,
        brand: brand || undefined,
        ratings: {
          average: rating,
          count: reviewCount
        }
      };
    } catch (error) {
      logger.error('Error extracting Walmart search result:', error);
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