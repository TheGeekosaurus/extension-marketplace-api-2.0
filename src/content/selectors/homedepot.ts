// src/content/selectors/homedepot.ts - HomeDepot page DOM selectors

/**
 * DOM selectors for extracting product data from HomeDepot pages
 */
export const homedepotSelectors = {
  title: [
    'h1.sui-text-primary',
    'h2.sui-text-primary',
    '.product-details__title',
    '.product-info-bar h2'
  ],
  price: [
    '#standard-price',
    '.sui-font-display.sui-text-3xl',
    '[data-component="price:Price"]',
    '[data-testid="price"]'
  ],
  brand: [
    'a[href*="/b/"] .sui-text-primary',
    'h2.sui-text-primary + a',
    '.product-details__brand'
  ],
  image: [
    '.mediagallery__mainimage img',
    '[data-testid="small-image"]',
    '.product-image img',
    '.mediagallery__mainimageblock img'
  ],
  // Selectors for product details section where Internet # and UPC might be found
  details: [
    '.product-info-bar',
    '[data-testid="productInfo"]',
    '.product-details__specs'
  ],
  internetNumber: [
    'h2:contains("Internet #") span',
    'span:contains("Internet #")',
    '[data-testid="productInfo"] span:contains("Internet")',
    'div:contains("Internet #")'
  ],
  upc: [
    'p:contains("UPC Code #") span',
    'span:contains("UPC Code")',
    '[data-testid="productInfo"] span:contains("UPC")',
    'div:contains("UPC Code #")'
  ],
  model: [
    'span:contains("Model #")',
    '[data-testid="productInfo"] span:contains("Model")',
    'div:contains("Model #")'
  ]
};

/**
 * Regex patterns for extracting product data from HomeDepot pages
 */
export const homedepotRegexPatterns = {
  productId: [
    /\/p\/[^\/]+\/(\d+)$/,
    /Internet\s+#\s*(\d+)/i,
    /Internet\s+Number\s*:\s*(\d+)/i
  ],
  upc: [
    /UPC\s+Code\s+#\s*(\d+)/i,
    /UPC\s*:?\s*(\d{12,13})/i
  ],
  model: [
    /Model\s+#\s*([A-Za-z0-9\-]+)/i
  ],
  price: [
    /\$\s*(\d+(?:\.\d{1,2})?)/
  ]
};
