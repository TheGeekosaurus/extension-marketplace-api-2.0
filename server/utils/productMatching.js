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
 * Score and rank results instead of filtering
 * @param {Array} products - Search results
 * @param {Object} sourceProduct - Source product
 * @param {string} strategy - Search strategy used
 * @returns {Array} Scored and ranked products
 */
const rankResults = (products, sourceProduct, strategy) => {
  if (!products || products.length === 0) return [];
  
  const { title, brand } = sourceProduct;
  const scoredProducts = [];
  
  // No scoring needed for identity searches, but still return all products
  if (strategy === 'asin' || strategy === 'upc') {
    return products.map(product => ({
      ...product,
      matchScore: 1.0, // Perfect match score for direct ID matches
      isBelowThreshold: false
    }));
  }
  
  // Score each product based on similarity
  for (const product of products) {
    // Skip products without title
    if (!product.title) continue;
    
    const titleSimilarity = calculateStringSimilarity(product.title, title);
    console.log(`Title similarity for "${product.title.substring(0, 30)}...": ${titleSimilarity}`);
    
    let matchScore = titleSimilarity;
    let isBelowThreshold = false;
    
    // For brand+title searches, include brand match in scoring
    if (strategy === 'brand-title' && brand && product.brand) {
      const brandSimilarity = calculateStringSimilarity(product.brand, brand);
      console.log(`Brand similarity: ${brandSimilarity}`);
      
      // Weighted average of title and brand similarity
      matchScore = titleSimilarity * 0.7 + brandSimilarity * 0.3;
      
      // Flag if it's below the original threshold, but still include
      isBelowThreshold = titleSimilarity < 0.6 || brandSimilarity < 0.5;
    } else {
      // For title-only searches, use just title similarity
      isBelowThreshold = titleSimilarity < 0.7;
    }
    
    scoredProducts.push({
      ...product,
      matchScore,
      isBelowThreshold
    });
  }
  
  // Sort by match score (highest first) and return all
  return scoredProducts.sort((a, b) => b.matchScore - a.matchScore);
};

/**
 * Extract model number from product title
 * @param {string} title - Product title
 * @returns {string|null} Model number or null if not found
 */
const extractModelNumber = (title) => {
  if (!title) return null;
  
  // Common model number patterns
  // Examples: D810, PM230, X-T4, EOS R5, etc.
  const modelPatterns = [
    /\b([A-Z]\d{3,})\b/,  // D810, PM230
    /\b([A-Z]+[-]\d+)\b/, // X-T4, EOS-R5
    /\b([A-Z]+\d+[A-Z]*)\b/ // EOS80D, A7III
  ];
  
  for (const pattern of modelPatterns) {
    const match = title.match(pattern);
    if (match && match[1]) {
      console.log(`Found model number: ${match[1]}`);
      return match[1];
    }
  }
  
  return null;
};

/**
 * Generate a truncated title query with significant words
 * @param {string} title - Full product title
 * @param {number} wordCount - Number of significant words to include
 * @returns {string} Truncated title
 */
const getTruncatedTitle = (title, wordCount = 7) => {
  if (!title) return '';
  
  // Common stop words to skip
  const stopWords = ['and', 'or', 'the', 'a', 'an', 'for', 'with', 'in', 'on', 'at', 'by', 'to', 'of'];
  
  // Split title into words
  const words = title.split(/\s+/);
  
  // Filter out stop words and keep only significant words
  const significantWords = words.filter(word => !stopWords.includes(word.toLowerCase()));
  
  // Take the first N significant words
  return significantWords.slice(0, wordCount).join(' ');
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
  rankResults,
  extractModelNumber,
  getTruncatedTitle,
  isPriceReasonable
};
