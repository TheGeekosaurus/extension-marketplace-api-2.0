// src/content/selectors/homedepot.ts - HomeDepot page DOM selectors

/**
 * DOM selectors for extracting product data from HomeDepot pages
 */
export const homedepotSelectors = {
  title: [
    'h1.sui-text-primary',
    'h2.sui-text-primary',
    '.product-details__title',
    '.product-name h1'
  ],
  price: [
    'span.sui-font-display.sui-leading-none.sui-text-3xl',
    'span.sui-font-display.sui-leading-none.sui-px-\\[2px\\].sui-text-9xl',
    '[data-testid="price"]',
    '[data-component="price:Price"] span'
  ],
  brand: [
    'a[href*="/b/"] .sui-text-primary',
    'h2.sui-text-primary + a',
    '.product-details__brand',
    // The brand often appears at the top of the page before the title
    'div.col_12-12:first-of-type h2',
    // First element in the breadcrumb 
    '.breadcrumb__list > li:first-child a'
  ],
  image: [
    '.mediagallery__mainimage img',
    '[data-testid="small-image"]',
    '.mediagallery__mainimageblock img',
    'img[alt*="product"]'
  ],
  // Product info bar containing Internet #, Model #, and sometimes UPC
  productInfoBar: [
    'div.product-info-bar',
    '[data-testid="productInfo"]',
    '.product-details__specs'
  ],
  internetNumber: [
    // Target the span containing the Internet # specifically
    'h2:contains("Internet #") span.sui-font-normal',
    'h2:contains("Internet #") + span',
    // Find any element that has text "Internet #" followed by a number
    'span.sui-font-normal:contains("Internet")',
    'div:contains("Internet #") span'
  ],
  upc: [
    // Target the span containing the UPC specifically
    'p:contains("UPC Code #") span.sui-font-normal',
    // Find any element that has text "UPC Code #" followed by a number
    'span.sui-font-normal:contains("UPC")',
    'div:contains("UPC Code #") span'
  ],
  model: [
    'span:contains("Model #")',
    '[data-testid="productInfo"] span:contains("Model")',
    'div:contains("Model #") span'
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
    // Extract from script tags in page source
    /"internetNumber"\s*:\s*"(\d+)"/i
  ],
  upc: [
    // Extract from UPC text on page
    /UPC\s+Code\s+#\s*(\d+)/i,
    // Extract from script tags in page source
    /"upc"\s*:\s*"(\d+)"/i,
    // Generic UPC pattern
    /UPC\s*:?\s*(\d{12,13})/i
  ],
  price: [
    // Match price in standard format $X.XX
    /\$\s*(\d+(?:\.\d{1,2})?)/,
    // Match price split into dollars and cents
    /\$\s*(\d+)\s*\.\s*(\d{2})/,
    // Match price from script tags
    /"price"\s*:\s*(\d+\.\d{2})/
  ]
};
