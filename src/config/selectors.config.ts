// src/config/selectors.config.ts - Centralized configuration for marketplace selectors

/**
 * Configuration for marketplace DOM selectors
 * Moving selectors to a config file makes it easier to update when marketplace HTML changes
 */
export const selectorConfig = {
  amazon: {
    // Product container in search results
    productContainer: '.s-result-item[data-asin]:not(.AdHolder)',
    fallbackContainer: '.s-result-list .a-section[data-asin], .sg-row[data-asin]',
    
    // Product elements
    title: 'h2, h2 a, .a-text-normal',
    price: '.a-price .a-offscreen',
    fallbackPrice: '.a-color-price, .a-color-base',
    brand: '[data-a-popover*="brandLogoId"], .a-row.a-size-base.a-color-secondary, .a-size-base.a-link-normal',
    image: 'img.s-image',
    link: 'a.a-link-normal[href*="/dp/"]',
    rating: '.a-icon-star-small, .a-icon-star',
    reviewCount: '.a-size-small.a-link-normal',
    
    // Patterns
    asinPattern: /\/dp\/([A-Z0-9]{10})(?:\/|$)/i
  },
  
  walmart: {
    // Product container in search results
    productContainer: '[data-item-id], [data-product-id], .search-result-gridview-item',
    fallbackContainer: '.product.product-search-result.search-result-gridview-item, .sans-serif.relative.pb3.pt2.ph3.w-100',
    
    // Product elements
    title: '[data-automation-id="product-title"], .sans-serif.mid-gray, .w_iUH, .lh-title',
    price: '[data-automation-id="product-price"], .b.black.f1.mr1, .w_iUH',
    brand: '[data-automation-id="product-brand"], .f7.gray.mb1, .f7.gray.mt2',
    image: 'img[data-automation-id="product-image"], img.absolute, img.w_iUF',
    link: 'a[link-identifier="linkTest"], a.absolute.w-100.h-100, .sans-serif.w_iUH a',
    rating: '.stars-container, [data-automation-id="product-stars"]',
    reviewCount: '.stars-reviews-count, [data-automation-id="product-reviews"]',
    
    // Price components (Walmart sometimes separates dollars and cents)
    priceDollars: '.w_C6.w_D.w_C7.w_Da',
    priceCents: '.w_C6.w_D.w_C7.w_Db',
    
    // Patterns
    itemIdPatterns: [
      /\/ip\/(?:.*?)\/(\d+)/,
      /\/ip\/(\d+)/,
      /walmart\.com\/ip\/\S+?-(\d+)$/,
      /\/(\d+)(?:\?|\&|$)/
    ]
  }
};

/**
 * Function to get selectors for a specific marketplace
 * 
 * @param marketplace - The marketplace to get selectors for
 * @returns The selectors for the specified marketplace
 */
export function getSelectors(marketplace: 'amazon' | 'walmart'): any {
  return selectorConfig[marketplace];
}
