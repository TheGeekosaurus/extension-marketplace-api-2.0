// src/content/selectors/homedepot.ts - HomeDepot page DOM selectors

/**
 * DOM selectors for extracting product data from HomeDepot pages
 * These selectors are used as fallbacks when JSON-LD or GraphQL data is not available
 */
export const homedepotSelectors = {
  title: [
    'h1.sui-text-primary',
    'h2.sui-text-primary',
    'h1[itemprop="name"]',
    '.product-info-bar h1',
    '.product-details__title',
    '.product-details h1',
    '[data-testid="product-heading"]'
  ],
  price: [
    // Current price (sale price)
    'span.sui-font-display.sui-text-9xl',
    'span.sui-font-display.sui-leading-none.sui-text-3xl',
    '[data-testid="current-price"]',
    '.price-format__large',
    // Special buy section
    '.special-buy span.sui-font-display',
    // New modern UI selectors
    '[data-testid="price-format"] span',
    '.price__wrapper .price__format',
    '.price-format__main',
    // Legacy selectors
    '#pricing-formatted-price'
  ],
  brand: [
    // First level method
    'h1 + div',
    '.primary-info div:first-child',
    // Direct brand links
    'a[href*="/b/"]',
    '.product-details__brand',
    // Brand specific selectors
    '[data-testid="product-brand"] a',
    '.product-brand',
    '.sui-generics a[title]',
    // Legacy selectors
    '.product-details-brand-link'
  ],
  image: [
    '.mediagallery__mainimage img',
    'img[data-testid="small-image"]',
    'img[data-zoom-image]',
    'img.product-image',
    '.product-details__image',
    // New UI selectors
    'img.stretchy-gallery__hero-image',
    '[data-testid="product-image"] img',
    // Lazy loading images
    'img[data-src]',
    // Legacy selectors
    '#mainImage'
  ],
  // Product info bar containing Internet #, Model #, and UPC
  productInfoBar: [
    '.product-info-bar',
    '[data-testid="productInfo"]',
    '.product-identifier',
    '.product-info-item',
    '.product-details-container'
  ],
  internetNumber: [
    // Specific elements for Internet #
    'span.Internet-number',
    '.product-info-bar span',
    'span.sui-font-normal',
    '[data-testid="internet-number"]',
    '.product-identifier-value'
  ],
  upc: [
    // Specific elements for UPC Code
    'span.UPC-code',
    '.product-info-bar span',
    'span.sui-font-normal',
    '[data-testid="upc-code"]',
    '.product-identifier-entry:contains("UPC") .product-identifier-value'
  ],
  model: [
    'span.Model-number',
    '.product-info-bar span',
    'span.sui-font-normal',
    '[data-testid="model-number"]',
    '.product-identifier-entry:contains("Model") .product-identifier-value'
  ],
  // Added selectors for inventory information
  inventory: [
    '[data-testid="inventory-message"]',
    '.fulfillment-message',
    '.product-stock-message',
    '.fulfillment-status'
  ]
};

/**
 * Regex patterns for extracting product data from HomeDepot pages
 */
export const homedepotRegexPatterns = {
  productId: [
    // Extract from URL (common pattern in HomeDepot URLs)
    /\/p\/[^\/]+\/(\d+)$/,
    /\/(\d+)\/?$/, // Simpler pattern matching end of URL
    // Extract from Internet # text on page
    /Internet\s+#\s*(\d+)/i,
    // Extract from structured data
    /"internetNumber"\s*:\s*"(\d+)"/,
    /"itemId"\s*:\s*"(\d+)"/,
    // New internet number patterns
    /internetNumber['"]?\s*:\s*['"]?(\d+)/i
  ],
  upc: [
    // Extract from UPC text on page
    /UPC\s+Code\s*:?\s*(\d{12,13})/i,
    // Extract from structured data
    /"upc"\s*:\s*"(\d{12,13})"/,
    // Generic UPC pattern (12-13 digits)
    /UPC\s*:?\s*(\d{12,13})/i,
    // New UPC patterns
    /gtin.*?['"](\d{12,13})['"]/i,
    /upc.*?['"](\d{12,13})['"]/i
  ],
  price: [
    // Current price format (e.g., $279.99)
    /\$\s*(\d+)\.(\d{2})/,
    // Price in JavaScript format (e.g., 279.99)
    /"price"\s*:\s*(\d+\.\d{2})/,
    // Special buy price 
    /special-buy.*?\$\s*(\d+)\.(\d{2})/,
    // New price patterns
    /"currentPrice"\s*:\s*(\d+\.\d{2})/,
    /value.*?(\d+\.\d{2})/
  ]
};
