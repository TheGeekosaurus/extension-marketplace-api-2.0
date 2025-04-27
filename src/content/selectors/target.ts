// src/content/selectors/target.ts - Target page DOM selectors

/**
 * DOM selectors for extracting product data from Target pages
 */
export const targetSelectors = {
  title: [
    'h1[data-test="product-title"]',
    'h1.Heading__StyledHeading'
  ],
  price: [
    '[data-test="product-price"]',
    '.styles__PriceFontSize'
  ],
  brand: [
    '[data-test="product-brand"]',
    '.styles__BrandLink'
  ],
  image: [
    '[data-test="product-image"] img',
    'picture img'
  ]
};

/**
 * Regex patterns for extracting product data from Target pages
 */
export const targetRegexPatterns = {
  productId: [
    /\/p\/.*?-(\d+)/,
    /TCIN&#34;:&#34;(\d+)&#34;/
  ],
  upc: [
    /"upc":"?(\d{12})"?/
  ],
  price: [
    /\$([0-9.]+)/
  ]
};
