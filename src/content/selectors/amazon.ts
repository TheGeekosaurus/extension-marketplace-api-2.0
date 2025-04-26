// src/content/selectors/amazon.ts - Amazon page DOM selectors

/**
 * DOM selectors for extracting product data from Amazon pages
 */
export const amazonSelectors = {
  title: [
    '#productTitle',
    '.product-title-word-break'
  ],
  price: [
    '.a-price .a-offscreen',
    '#priceblock_ourprice',
    '#priceblock_dealprice',
    '.a-price .a-price-whole'
  ],
  brand: [
    '#bylineInfo',
    '.a-link-normal.contributorNameID',
    '.po-brand .a-span9'
  ],
  image: [
    '#landingImage',
    '#imgBlkFront',
    '#main-image-container img'
  ],
  // Selectors for product details section where UPC/EAN might be found
  details: [
    '.prodDetTable tr',
    '.detail-bullet-list span',
    '#detailBullets_feature_div li'
  ]
};

/**
 * Regex patterns for extracting product data from Amazon pages
 */
export const amazonRegexPatterns = {
  asin: [
    /\/dp\/([A-Z0-9]{10})/,
    /\/gp\/product\/([A-Z0-9]{10})/
  ],
  upc: /\d{12,13}/
};
