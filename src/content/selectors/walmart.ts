// src/content/selectors/walmart.ts - Walmart page DOM selectors

/**
 * DOM selectors for extracting product data from Walmart pages
 */
export const walmartSelectors = {
  title: [
    'h1.prod-ProductTitle',
    '[data-testid="product-title"]',
    'h1[itemprop="name"]'
  ],
  price: [
    '.prod-PriceSection .price-characteristic',
    '[data-testid="price-value"]',
    '.price-group'
  ],
  priceCents: [
    '.prod-PriceSection .price-mantissa'
  ],
  brand: [
    '.prod-ProductBrand a',
    '[data-testid="product-brand"]'
  ],
  image: [
    '.prod-hero-image img',
    '[data-testid="product-image"] img',
    'img[itemprop="image"]'
  ],
  details: [
    '.prod-ProductDetails div',
    '[data-testid="product-details"] div'
  ]
};

/**
 * Regex patterns for extracting product data from Walmart pages
 */
export const walmartRegexPatterns = {
  productId: [
    /\/ip\/(?:.*?)\/(\d+)/,
    /\/ip\/(\d+)/
  ],
  upc: [
    /\d{12}/, // For UPC in details text
    /"upc":"(\d{12})"/ // For UPC in page source
  ]
};
