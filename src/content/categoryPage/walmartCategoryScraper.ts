// src/content/categoryPage/walmartCategoryScraper.ts
// Walmart category page scraper implementation

import { ProductData } from '../../types';
import { CategoryPageScraper } from './types';
import { extractText, extractPrice, extractAttribute, trySelectors } from '../matchFinder/utils/dom';
import { createLogger } from '../matchFinder/utils/logger';

// Set up logger
const logger = createLogger('WalmartCategoryScraper');

/**
 * Implementation of CategoryPageScraper for Walmart category/search results pages
 */
export const WalmartCategoryScraper: CategoryPageScraper = {
  marketplace: 'walmart',
  
  /**
   * Determine if the current page is a Walmart category or search results page
   */
  canHandlePage(): boolean {
    const url = window.location.href;
    
    // Check if this is a search results or category/browse page
    return (
      url.includes('walmart.com/search?') || 
      url.includes('walmart.com/browse/') || 
      url.includes('walmart.com/cp/') ||
      document.querySelector('[data-testid="search-results"]') !== null
    );
  },
  
  /**
   * Find all product elements on a Walmart category page
   */
  findCategoryProducts(): Element[] {
    try {
      logger.info('Finding Walmart category products');
      
      // Product grid selectors - try multiple as Walmart's structure can vary
      const selectors = [
        // Modern search results with product cards
        '[data-testid="search-results"] [data-item-id]',
        '[data-testid="search-results"] [data-product-id]',
        '[data-testid="search-results"] [data-testid="product-card"]',
        // Grid view items
        '[data-testid="list-view"] [data-testid="product-card"]',
        // Standard product containers
        '.search-result-gridview-item',
        '.product-search-result',
        // Alternative layouts
        '.mb1.ph1.pa0-xl.pb1.pb2-xl.pt1.pt2-xl'
      ];
      
      const results = trySelectors(selectors);
      logger.info(`Found ${results.length} Walmart category products`);
      
      // Filter out any elements that don't have sufficient data
      const validResults = results.filter(element => {
        // Check for product ID
        const hasId = element.hasAttribute('data-item-id') || 
                     element.hasAttribute('data-product-id') ||
                     element.querySelector('a[href*="/ip/"]') !== null;
                     
        // Must have title
        const hasTitle = !!extractText(element, [
          '[data-automation-id="product-title"]',
          '[data-testid="product-title"]',
          '.sans-serif.mid-gray',
          '.lh-title',
          'span.f6.f5-l.fw5'
        ]);
        
        // Must have price
        const hasPrice = !!extractPrice(element, [
          '[data-automation-id="product-price"]',
          '[data-testid="price-current"]',
          '[data-testid="list-view-price"]',
          '.b.black.f1.mr1',
          '.w_iUH'
        ]);
        
        return hasId && hasTitle && hasPrice;
      });
      
      logger.info(`Found ${validResults.length} valid Walmart category products`);
      return validResults;
    } catch (error) {
      logger.error('Error finding Walmart category products:', error);
      return [];
    }
  },
  
  /**
   * Extract product data from a Walmart category page item
   */
  extractProductData(element: Element): Partial<ProductData> | null {
    try {
      // Extract title
      const titleSelectors = [
        '[data-automation-id="product-title"]',
        '[data-testid="product-title"]',
        '.sans-serif.mid-gray',
        '.lh-title',
        'span.f6.f5-l.fw5'
      ];
      const title = extractText(element, titleSelectors);
      
      if (!title) {
        logger.debug('No title found for Walmart category product');
        return null;
      }
      
      // Extract price
      const priceSelectors = [
        '[data-automation-id="product-price"] .w_iUH7',
        '[data-automation-id="product-price"]',
        '[data-testid="price-current"]',
        '[data-testid="list-view-price"]',
        '.b.black.f1.mr1',
        '.w_iUH',
        'span.f3',
        '.b.black.lh-solid.f5.f4',
        '.mrl.mr2-x1.b.black.lh-solid.f5.f4-1'
      ];
      const price = extractPrice(element, priceSelectors);
      
      if (price === null) {
        logger.debug('No price found for Walmart category product');
        return null;
      }
      
      // Get URL from the product link
      const urlSelectors = [
        'a[link-identifier="linkTest"]',
        'a.absolute.w-100.h-100',
        '.sans-serif.w_iUH a',
        '[data-testid="product-title"] a',
        'a[data-testid="product-title"]',
        'a[href*="/ip/"]'
      ];
      const urlElement = extractAttribute(element, urlSelectors, 'href');
      const url = urlElement ? new URL(urlElement, window.location.origin).href : '';
      
      if (!url) {
        logger.debug('No URL found for Walmart category product');
        return null;
      }
      
      // Extract product ID from data attributes or URL
      let productId: string | undefined = undefined;
      
      // Try data attributes first
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
      
      if (!productId) {
        logger.debug('No product ID found for Walmart category product');
        return null;
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
      
      // Extract brand (if available)
      const brandSelectors = [
        '[data-automation-id="product-brand"]',
        '.f6.gray.fw4',
        '[data-testid="product-brand"]'
      ];
      let brand = extractText(element, brandSelectors);
      
      // Extract ratings
      const ratingSelectors = [
        '.stars-container',
        '[data-automation-id="product-stars"]',
        '[data-testid="stars-container"]',
        '[aria-label*="stars"]'
      ];
      let rating: number | null = null;
      
      // Try to get rating from aria-label attribute
      const ratingElement = element.querySelector(ratingSelectors.join(','));
      if (ratingElement) {
        const ariaLabel = ratingElement.getAttribute('aria-label');
        if (ariaLabel && ariaLabel.includes('stars')) {
          const ratingMatch = ariaLabel.match(/(\d+(?:\.\d+)?)\s*stars?/i);
          if (ratingMatch && ratingMatch[1]) {
            rating = parseFloat(ratingMatch[1]);
          }
        }
        
        // If not found in aria-label, try the style width
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
      
      // Build and return the product data
      const productData: Partial<ProductData> = {
        title,
        price,
        marketplace: 'walmart',
        productId,
        brand: brand || null,
        upc: null, // UPC not available on category pages
        asin: null, // No ASIN for Walmart
        imageUrl: imageUrl || null,
        pageUrl: url
      };
      
      // Store ratings info in a separate object for later use, but not as part of ProductData
      const extraData = {
        ratings: rating ? { average: rating, count: reviewCount } : undefined
      };
      
      return productData;
    } catch (error) {
      logger.error('Error extracting Walmart category product:', error);
      return null;
    }
  },
  
  /**
   * Optional: Prepare the page for scraping (e.g., scroll to load more products)
   */
  async preparePage(): Promise<void> {
    logger.info('Preparing Walmart category page for scraping');
    
    try {
      // Scroll down to load lazy-loaded content
      const scrollToBottom = () => {
        window.scrollTo(0, document.body.scrollHeight);
        return document.body.scrollHeight;
      };
      
      let lastHeight = 0;
      let newHeight = scrollToBottom();
      
      // Scroll a few times with delay to load more products
      // Walmart typically uses infinite scroll
      for (let i = 0; i < 4; i++) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        lastHeight = newHeight;
        newHeight = scrollToBottom();
        
        // If no more content is loaded, stop scrolling
        if (lastHeight === newHeight && i > 1) break;
      }
      
      // Wait for any final Ajax-loaded content
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      logger.info('Walmart category page preparation complete');
    } catch (error) {
      logger.error('Error preparing Walmart category page:', error);
    }
  }
};