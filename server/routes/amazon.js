// server/routes/amazon.js - Amazon search routes
const express = require('express');
const router = express.Router();
const { searchAmazonProducts } = require('../services/amazonService');
const { cacheMiddleware, generateCacheKey } = require('../middleware/cache');
const { scoreProducts } = require('../utils/scoring');

// Cache middleware for Amazon searches
const amazonCacheMiddleware = cacheMiddleware((req) => {
  const { query, upc, asin } = req.body;
  return generateCacheKey('amazon', { query, upc, asin });
});

/**
 * Amazon product search endpoint
 * Searches using ASIN, UPC, or text query in priority order
 */
router.post('/', amazonCacheMiddleware, async (req, res, next) => {
  try {
    console.log('Amazon search called with:', req.body);
    const { query, upc, asin } = req.body;
    
    // Validate input - need at least one search parameter
    if (!query && !upc && !asin) {
      return res.status(400).json({
        success: false,
        error: 'Missing search parameters',
        message: 'Please provide at least one of: query, upc, or asin'
      });
    }
    
    // Search for Amazon products using appropriate parameters
    const matchedProducts = await searchAmazonProducts(req.body);
    
    // For text searches, score and rank products
    const rankedProducts = (query && !asin && !upc) 
      ? scoreProducts(matchedProducts, query)
      : matchedProducts;
    
    res.json({
      success: true,
      source: 'api',
      data: rankedProducts
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
