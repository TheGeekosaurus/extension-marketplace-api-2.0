// src/content/selectors/walmart.ts - Walmart page DOM selectors

/**
 * DOM selectors for extracting product data from Walmart pages
 */
export const walmartSelectors = {
  title: [
    'h1.prod-ProductTitle',
    '[data-testid="product-title"]',
    'h1[itemprop="name"]',
    'h1.f3.b lh-copy dark-gray mb1 mt2',
    'h1',
    'h1.b lh-copy dark-gray mb1 mt2'
  ],
  price: [
    '.prod-PriceSection .price-characteristic',
    '[data-testid="price-value"]',
    '.price-group',
    'span[itemprop="price"]',
    '.b.black.f1.mr1'
  ],
  priceCents: [
    '.prod-PriceSection .price-mantissa'
  ],
  brand: [
    '.prod-ProductBrand a',
    '[data-testid="product-brand"]',
    '.f7.gray.mb1',
    '.f7.gray.mt2'
  ],
  image: [
    '.prod-hero-image img',
    '[data-testid="product-image"] img',
    'img[itemprop="image"]',
    '.db.center.mw100.h-auto'
  ],
  details: [
    '.prod-ProductDetails div',
    '[data-testid="product-details"] div',
    '.mt4 > div',
    '.pb3.w_C.w_D.w-100'
  ]
};

/**
 * Regex patterns for extracting product data from Walmart pages
 */
export const walmartRegexPatterns = {
  productId: [
    /\/ip\/(?:.*?)\/(\d+)/,
    /\/ip\/(\d+)/,
    /walmart\.com\/ip\/\S+?-(\d+)$/,
    /\/(\d+)(?:\?|\&|$)/
  ],
  upc: [
    /\d{12}/, // For UPC in details text
    /"upc":"(\d{12})"/, // For UPC in page source
    /UPC:?\s*(\d{12})/i, // For UPC with label
    /UPC.*?(\d{12,13})/i
  ]
};
