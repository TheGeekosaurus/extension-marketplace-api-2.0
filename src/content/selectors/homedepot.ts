// src/content/selectors/homedepot.ts - HomeDepot page DOM selectors

/**
 * DOM selectors for extracting product data from HomeDepot pages
 */
export const homedepotSelectors = {
  title: [
    'h1.sui-text-primary',
    'h2.sui-text-primary',
    'h1[itemprop="name"]',
    '.product-info-bar h1',
    '.product-details__title'
  ],
  price: [
    // Current price (sale price)
    'span.sui-font-display.sui-text-9xl',
    'span.sui-font-display.sui-leading-none.sui-text-3xl',
    '[data-testid="current-price"]',
    '.price-format__large',
    // Special buy section
    '.special-buy span.sui-font-display'
  ],
  brand: [
    // First level method
    'h1 + div',
    '.primary-info div:first-child',
    // Direct brand links
    'a[href*="/b/"]',
    '.product-details__brand'
  ],
  image: [
    '.mediagallery__mainimage img',
    'img[data-testid="small-image"]',
    'img[data-zoom-image]',
    'img.product-image',
    '.product-details__image'
  ],
  // Product info bar containing Internet #, Model #, and UPC
  productInfoBar: [
    '.product-info-bar',
    '[data-testid="productInfo"]'
  ],
  internetNumber: [
    // Specific elements for Internet #
    'span.Internet-number',
    'text()[contains(., "Internet #")]',
    '.product-info-bar span:contains("Internet")',
    'span.sui-font-normal'
  ],
  upc: [
    // Specific elements for UPC Code
    'span.UPC-code',
    'text()[contains(., "UPC Code")]',
    '.product-info-bar span:contains("UPC")',
    'span.sui-font-normal'
  ],
  model: [
    'span.Model-number',
    'text()[contains(., "Model #")]',
    '.product-info-bar span:contains("Model")',
    'span.sui-font-normal'
  ]
};

/**
 * Regex patterns for extracting product data from HomeDepot pages
 */
export const homedepotRegexPatterns = {
  productId: [
    // Extract from URL (common pattern in HomeDepot URLs)
    /\/p\/[^\/]+\/(\d+)$/,
    // Extract from Internet # text on page
    /Internet\s+#\s*(\d+)/i,
    // Extract from structured data
    /"internetNumber"\s*:\s*"(\d+)"/
  ],
  upc: [
    // Extract from UPC text on page
    /UPC\s+Code\s+#\s*(\d+)/i,
    // Extract from structured data
    /"upc"\s*:\s*"(\d+)"/,
    // Generic UPC pattern (12-13 digits)
    /UPC\s*:?\s*(\d{12,13})/i
  ],
  price: [
    // Current price format (e.g., $279.99)
    /\$\s*(\d+)\.(\d{2})/,
    // Price in JavaScript format (e.g., 279.99)
    /"price"\s*:\s*(\d+\.\d{2})/,
    // Special buy price 
    /special-buy.*?\$\s*(\d+)\.(\d{2})/is
  ]
};
