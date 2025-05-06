// src/matchFinder/config.ts - Configuration for match finder

import { SupportedMarketplace } from './types';

/**
 * Selectors for Amazon search results
 */
export const amazonSelectors = {
  resultContainer: [
    '.s-result-item[data-asin]:not(.AdHolder)',
    '.sg-row[data-asin]',
    '.s-result-list .a-section[data-asin]'
  ],
  title: [
    'h2', 
    'h2 a', 
    '.a-text-normal',
    '.a-size-medium.a-color-base.a-text-normal'
  ],
  price: [
    '.a-price .a-offscreen',
    '.a-color-price',
    '.a-color-base'
  ],
  image: [
    'img.s-image',
    '.s-image',
    'img[data-image-index]'
  ],
  link: [
    'a.a-link-normal[href*="/dp/"]',
    'a[href*="/dp/"]',
    '.a-link-normal'
  ],
  rating: [
    '.a-icon-star-small', 
    '.a-icon-star',
    '.a-icon-alt'
  ],
  reviewCount: [
    '.a-size-small.a-link-normal',
    'a[href*="customerReviews"]'
  ]
};

/**
 * Selectors for Walmart search results
 */
export const walmartSelectors = {
  resultContainer: [
    '[data-item-id]',
    '[data-product-id]',
    '.search-result-gridview-item',
    '.product.product-search-result.search-result-gridview-item', 
    '.sans-serif.relative.pb3.pt2.ph3.w-100'
  ],
  title: [
    '[data-automation-id="product-title"]', 
    '.sans-serif.mid-gray', 
    '.w_iUH', 
    '.lh-title',
    '.w_DP'
  ],
  price: [
    '[data-automation-id="product-price"]', 
    '.b.black.f1.mr1', 
    '.w_iUH',
    '[data-testid="price-current"]',
    'span.w_1UH7'
  ],
  image: [
    'img[data-automation-id="product-image"]', 
    'img.absolute', 
    'img.w_iUF',
    'img.db.center.mw100.h-auto'
  ],
  link: [
    'a[link-identifier="linkTest"]', 
    'a.absolute.w-100.h-100', 
    '.sans-serif.w_iUH a'
  ],
  rating: [
    '.stars-container', 
    '[data-automation-id="product-stars"]'
  ],
  reviewCount: [
    '.stars-reviews-count', 
    '[data-automation-id="product-reviews"]'
  ]
};

/**
 * Get selectors for a marketplace
 * 
 * @param marketplace - Marketplace to get selectors for
 * @returns Selector configuration for the marketplace
 */
export function getSelectors(marketplace: SupportedMarketplace): Record<string, string[]> {
  switch (marketplace) {
    case 'amazon':
      return amazonSelectors;
    case 'walmart':
      return walmartSelectors;
    default:
      throw new Error(`Unsupported marketplace: ${marketplace}`);
  }
}

/**
 * Configuration for match finder
 */
export const matchFinderConfig = {
  /**
   * Default timeout for search operations (milliseconds)
   */
  defaultTimeout: 30000,
  
  /**
   * Default minimum similarity threshold
   */
  minSimilarity: 0.3,
  
  /**
   * Default maximum number of words to use from title
   */
  maxTitleWords: 10,
  
  /**
   * Whether to use brand in search query by default
   */
  includeBrand: true,
  
  /**
   * Default log level
   */
  logLevel: 'DEBUG'
};
