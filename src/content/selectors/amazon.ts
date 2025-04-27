// src/content/selectors/amazon.ts - Amazon page DOM selectors

/**
 * DOM selectors for extracting product data from Amazon pages
 */
export const amazonSelectors = {
  title: [
    '#productTitle',
    '.product-title-word-break',
    'h1'
  ],
  price: [
    '.a-price .a-offscreen',
    '#priceblock_ourprice',
    '#priceblock_dealprice',
    '.a-price .a-price-whole',
    '.priceToPay .a-offscreen',
    'span.a-price span.a-offscreen',
    '.a-section .a-price .a-offscreen'
  ],
  brand: [
    '#bylineInfo',
    '.a-link-normal.contributorNameID',
    '.po-brand .a-span9',
    '#productDetails_techSpec_section_1 tr:contains("Brand") td',
    '#brand'
  ],
  image: [
    '#landingImage',
    '#imgBlkFront',
    '#main-image-container img',
    '#imgTagWrapperId img'
  ],
  // Selectors for product details section where UPC/EAN might be found
  details: [
    '.prodDetTable tr',
    '.detail-bullet-list span',
    '#detailBullets_feature_div li',
    '#productDetails_techSpec_section_1 tr',
    '#productDetails_detailBullets_sections1 tr'
  ]
};

/**
 * Regex patterns for extracting product data from Amazon pages
 */
export const amazonRegexPatterns = {
  asin: [
    /\/dp\/([A-Z0-9]{10})/i,
    /\/gp\/product\/([A-Z0-9]{10})/i
  ],
  upc: /\d{12,13}/
};
