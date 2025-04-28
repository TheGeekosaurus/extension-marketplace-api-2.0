// server/utils/productMatching.js - Product matching algorithms
const { calculateStringSimilarity } = require('./scoring');

/**
 * Determine the best matching strategy based on available data
 * @param {Object} sourceProduct - Source product with identifiers
 * @param {string} targetMarketplace - Marketplace to search
 * @returns {Object} Search strategy and parameters
 */
const determineSearchStrategy = (sourceProduct, targetMarketplace) => {
  const { upc, asin, title, brand, marketplace } = sourceProduct;
  let strategy = 'text';
  let searchParams = {};
  
  // UPC/EAN is the most reliable if available
  if (upc && upc.length >= 12) {
    strategy = 'upc';
    searchParams.upc = upc;
  }
  // For Amazon to Amazon searches, use ASIN
  else if (targetMarketplace === 'amazon' && marketplace === 'amazon' && asin) {
    strategy = 'asin';
    searchParams.asin = asin;
  }
  // Brand + title search
  else if (brand && title) {
    strategy = 'brand-title';
    searchParams.query = `${brand} ${title}`.trim();
  }
  // Title-only search as fallback
  else if (title) {
    strategy = 'title';
    searchParams.query = title;
  }
  
  console.log(`Using ${strategy} search strategy for ${targetMarketplace}`);
  return { strategy, params: searchParams };
};

/**
 * Filter out irrelevant results from search results
 * @param {Array} products - Search results
 * @param {Object} sourceProduct - Source product
 * @param {string} strategy - Search strategy used
 * @returns {Array} Filtered products
 */
const filterResults = (products, sourceProduct, strategy) => {
  if (!products || products.length === 0) return [];
  
  const { title, brand } = sourceProduct;
  
  // No filtering needed for identity searches
  if (strategy === 'asin' || strategy === 'upc') {
    return products;
  }
  
  return products.filter(product => {
    // Basic text matching
    if (!product.title) return false;
    
    const titleSimilarity = calculateStringSimilarity(product.title, title);
    console.log(`Title similarity for "${product.title.substring(0, 30)}...": ${titleSimilarity}`);
    
    // For brand+title searches, check brand match
    if (strategy === 'brand-title' && brand && product.brand) {
      const brandSimilarity = calculateStringSimilarity(product.brand, brand);
      console.log(`Brand similarity: ${brandSimilarity}`);
      
      // Require both title and brand to be reasonably similar
      return titleSimilarity > 0.6 && brandSimilarity > 0.5;
    }
    
    // For title-only searches, require higher title similarity
    return titleSimilarity > 0.7;
  });
};

/**
 * Check if a matched product is a reasonable price match
 * @param {Object} sourceProduct - Source product
 * @param {Object} matchedProduct - Potentially matching product
 * @returns {boolean} Whether the price is reasonable
 */
const isPriceReasonable = (sourceProduct, matchedProduct) => {
  // Can't compare if either price is missing
  if (!sourceProduct.price || !matchedProduct.price) return true;
  
  const sourcePrice = sourceProduct.price;
  const matchedPrice = matchedProduct.price;
  
  // Calculate the price ratio
  const ratio = matchedPrice / sourcePrice;
  
  // Consider a price reasonable if it's within 40% higher or lower
  // This is intentionally permissive as arbitrage opportunities can have significant price differences
  return ratio > 0.6 && ratio < 1.4;
};

module.exports = {
  determineSearchStrategy,
  filterResults,
  isPriceReasonable
};
