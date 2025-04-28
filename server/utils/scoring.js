// server/utils/scoring.js - Product scoring and ranking algorithms

/**
 * Score products by relevance to query for better matching
 * @param {Array} products - List of product matches
 * @param {string} query - The search query or identifier
 * @returns {Array} - Scored products sorted by score (highest first)
 */
const scoreProducts = (products, query) => {
  if (!products || products.length === 0) return [];
  if (products.length === 1) return products;
  
  // Score each product based on multiple factors
  const scoredProducts = products.map(product => {
    let score = 0;
    
    // In-stock items get priority
    if (product.in_stock === true) score += 20;
    
    // Products with higher ratings score better
    if (product.ratings?.average) {
      score += Math.min(product.ratings.average * 5, 25); // Up to 25 points for a 5-star rating
    }
    
    // Products with more reviews are more reliable
    if (product.ratings?.count) {
      score += Math.min(Math.log10(product.ratings.count) * 10, 25); // Up to 25 points for popular products
    }
    
    // Calculate title relevance - simple version
    if (product.title && query) {
      const title = product.title.toLowerCase();
      const searchTerms = query.toLowerCase().split(' ');
      
      // Add points for each search term found in title
      searchTerms.forEach(term => {
        if (title.includes(term)) {
          score += 10;
          // Bonus points for exact matches
          if (title === term) score += 40;
        }
      });
    }
    
    // UPC match would be almost a perfect match
    if (product.upc && query && product.upc.includes(query)) {
      score += 100;
    }
    
    return { ...product, score };
  });
  
  // Sort by score (highest first)
  return scoredProducts.sort((a, b) => b.score - a.score);
};

/**
 * Add fee breakdown to each product
 * @param {Array} products - Array of products
 * @param {string} marketplace - Marketplace name
 * @param {number} additionalFees - Additional fees from user input
 * @returns {Array} - Products with fee breakdown added
 */
const addFeeBreakdown = (products, marketplace, additionalFees = 0) => {
  // Default marketplace fee percentages
  const marketplaceFees = {
    amazon: 0.15,  // 15%
    walmart: 0.12, // 12%
    target: 0.10   // 10%
  };
  
  const feePercentage = marketplaceFees[marketplace] || 0.10;
  const additionalFeesNum = parseFloat(additionalFees) || 0;
  
  return products.map(product => {
    if (!product || !product.price) return product;
    
    const price = product.price;
    const marketplaceFeeAmount = price * feePercentage;
    const totalFees = marketplaceFeeAmount + additionalFeesNum;
    
    return {
      ...product,
      fees: {
        marketplace_fee_percentage: feePercentage,
        marketplace_fee_amount: parseFloat(marketplaceFeeAmount.toFixed(2)),
        additional_fees: parseFloat(additionalFeesNum.toFixed(2)),
        total_fees: parseFloat(totalFees.toFixed(2))
      }
    };
  });
};

/**
 * Calculate similarity between two strings for fuzzy matching
 * @param {string} str1 - First string
 * @param {string} str2 - Second string 
 * @returns {number} Similarity score (0-1)
 */
const calculateStringSimilarity = (str1, str2) => {
  if (!str1 || !str2) return 0;
  
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  // Calculate Levenshtein distance
  const len1 = s1.length;
  const len2 = s2.length;
  const matrix = Array(len1 + 1).fill().map(() => Array(len2 + 1).fill(0));
  
  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // Deletion
        matrix[i][j - 1] + 1,      // Insertion
        matrix[i - 1][j - 1] + cost // Substitution
      );
    }
  }
  
  // Convert distance to similarity (0-1)
  const maxLen = Math.max(len1, len2);
  return maxLen === 0 ? 1 : 1 - matrix[len1][len2] / maxLen;
};

module.exports = {
  scoreProducts,
  addFeeBreakdown,
  calculateStringSimilarity
};
