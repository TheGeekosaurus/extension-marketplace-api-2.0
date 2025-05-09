// src/content/categoryPage/amazonCategoryScraper.ts
// Amazon category page scraper implementation

import { ProductData } from '../../types';
import { CategoryPageScraper } from './types';
import { extractText, extractPrice, extractAttribute, trySelectors } from '../matchFinder/utils/dom';
import { createLogger } from '../matchFinder/utils/logger';

// Set up logger
const logger = createLogger('AmazonCategoryScraper');

/**
 * Implementation of CategoryPageScraper for Amazon category/search results pages
 */
export const AmazonCategoryScraper: CategoryPageScraper = {
  marketplace: 'amazon',
  
  /**
   * Determine if the current page is an Amazon category or search results page
   */
  canHandlePage(): boolean {
    const url = window.location.href;
    
    // Check if this is a search results or category page
    return (
      // URL patterns for search pages
      url.includes('amazon.com/s?') || 
      url.includes('/s/ref=') || 
      // URL patterns for category/browse pages
      url.includes('/b?') ||
      url.includes('/b/?') ||
      url.includes('/b/ref=') ||
      url.includes('node=') ||
      url.includes('/gp/browse.html') ||
      // Check for structural elements that indicate a product grid
      document.querySelector('.s-result-list') !== null ||
      document.querySelector('.s-result-item') !== null ||
      document.querySelector('.s-search-results') !== null ||
      // For category pages that have a different structure
      (document.querySelector('.a-carousel-card') !== null && 
       document.querySelectorAll('.a-carousel-card').length > 3)
    );
  },
  
  /**
   * Find all product elements on an Amazon category page
   */
  findCategoryProducts(): Element[] {
    try {
      logger.info('Finding Amazon category products');
      
      // Product grid selectors - try multiple as Amazon's structure can vary
      const selectors = [
        // Standard search results
        '.s-result-item[data-asin]:not(.AdHolder)',
        // Alternative layouts
        '.s-search-results .sg-col-inner .a-section[data-asin]',
        '.rush-component[data-asin]',
        // Browse page layouts
        '.a-carousel-card',
        '.octopus-pc-item',
        '.octopus-pc-asin',
        // Grid layout for category pages
        '.a-spacing-medium[data-asin]',
        // Alternative category layouts
        '.zg-item',
        '.zg-grid-item',
        '.dealContainer',
        // Product boxes
        '.a-carousel-card .a-box-inner',
        '.product-tile'
      ];
      
      const results = trySelectors(selectors);
      logger.info(`Found ${results.length} Amazon category products`);
      
      // Filter out any elements that don't have sufficient data
      const validResults = results.filter(element => {
        // Must have ASIN
        const hasAsin = element.hasAttribute('data-asin') && 
                       element.getAttribute('data-asin') !== '';
                       
        // Must have title
        const hasTitle = !!extractText(element, [
          'h2', 'h2 a', '.a-text-normal', '.a-size-medium'
        ]);
        
        // Must have price
        const hasPrice = !!extractPrice(element, [
          '.a-price .a-offscreen',
          '.a-color-price',
          '.a-price',
          '[data-a-color="price"]'
        ]);
        
        return hasAsin && hasTitle && hasPrice;
      });
      
      logger.info(`Found ${validResults.length} valid Amazon category products`);
      return validResults;
    } catch (error) {
      logger.error('Error finding Amazon category products:', error);
      return [];
    }
  },
  
  /**
   * Extract product data from an Amazon category page item
   */
  extractProductData(element: Element): Partial<ProductData> | null {
    try {
      // Extract ASIN (required)
      const asin = element.getAttribute('data-asin');
      
      if (!asin) {
        logger.debug('No ASIN found for Amazon category product');
        return null;
      }
      
      // Extract title
      const titleSelectors = [
        'h2', 'h2 a', '.a-text-normal', '.a-size-medium', '[data-cy="title-recipe"]'
      ];
      const title = extractText(element, titleSelectors);
      
      if (!title) {
        logger.debug('No title found for Amazon category product');
        return null;
      }
      
      // Extract price
      const priceSelectors = [
        '.a-price .a-offscreen',
        '.a-color-price',
        '.a-price',
        '[data-a-color="price"]'
      ];
      const price = extractPrice(element, priceSelectors);
      
      if (price === null) {
        logger.debug('No price found for Amazon category product');
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
        logger.debug('No URL found for Amazon category product');
        return null;
      }
      
      // Get image URL
      const imageSelectors = ['img.s-image', 'img[data-image-latency]', 'img.a-dynamic-image'];
      const imageUrl = extractAttribute(element, imageSelectors, 'src');
      
      // Extract brand (if available)
      const brandSelectors = [
        '.a-row.a-size-base .a-size-base.a-color-secondary', 
        '.a-row [data-a-popover*="brand"]',
        '.a-row .a-size-base:contains("by")'
      ];
      let brand = extractText(element, brandSelectors);
      
      // Clean up brand text
      if (brand && brand.toLowerCase().startsWith('by ')) {
        brand = brand.substring(3).trim();
      }
      
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
      
      // Extract review count for sorting by popularity
      const reviewCountSelectors = ['.a-size-small.a-link-normal', '[data-a-popover*="review"]'];
      const reviewCountText = extractText(element, reviewCountSelectors);
      let reviewCount: number | null = null;
      
      if (reviewCountText) {
        const countMatch = reviewCountText.match(/(\d+(?:,\d+)*)/);
        if (countMatch && countMatch[1]) {
          reviewCount = parseInt(countMatch[1].replace(/,/g, ''), 10);
        }
      }
      
      // Build and return the product data
      // Build and return the product data
      const productData: Partial<ProductData> = {
        title,
        price,
        marketplace: 'amazon',
        productId: asin,
        brand: brand || null,
        upc: null, // UPC not available on category pages
        asin,
        imageUrl: imageUrl || null,
        pageUrl: url
      };
      
      // Store ratings info in the object for later use, but not as part of ProductData
      const extraData = {
        ratings: rating ? { average: rating, count: reviewCount } : undefined
      };
      
      // Return the product data
      return productData;
    } catch (error) {
      logger.error('Error extracting Amazon category product:', error);
      return null;
    }
  },
  
  /**
   * Optional: Prepare the page for scraping (e.g., scroll to load more products)
   */
  async preparePage(): Promise<void> {
    logger.info('Preparing Amazon category page for scraping');
    
    try {
      // Scroll down to load lazy-loaded content
      const scrollToBottom = () => {
        window.scrollTo(0, document.body.scrollHeight);
        return document.body.scrollHeight;
      };
      
      let lastHeight = 0;
      let newHeight = scrollToBottom();
      
      // Scroll a few times with delay to load more products
      for (let i = 0; i < 3; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        lastHeight = newHeight;
        newHeight = scrollToBottom();
        
        // If no more content is loaded, stop scrolling
        if (lastHeight === newHeight) break;
      }
      
      logger.info('Amazon category page preparation complete');
    } catch (error) {
      logger.error('Error preparing Amazon category page:', error);
    }
  }
};