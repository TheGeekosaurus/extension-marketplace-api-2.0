// server/routes/target.js - Target search routes
const express = require('express');
const router = express.Router();
const { searchTargetProducts } = require('../services/targetService');
const { cacheMiddleware, generateCacheKey } = require('../middleware/cache');
const { scoreProducts } = require('../utils/scoring');

// Cache middleware for Target searches
const targetCacheMiddleware = cacheMiddleware((req) => {
  const { query, upc } = req.body;
  return generateCacheKey('target', { query, upc });
});

/**
 * Target product search endpoint
 * Searches using UPC or text query in priority order
 */
router.post('/', targetCacheMiddleware, async (req, res, next) => {
  try {
    console.log('Target search called with:', req.body);
    const { query, upc } = req.body;
    
    // Validate input - need at least one search parameter
    if (!query && !upc) {
      return res.status(400).json({
        success: false,
        error: 'Missing search parameters',
        message: 'Please provide at least one of: query or upc'
      });
    }
    
    // Search for Target products using appropriate parameters
    const matchedProducts = await searchTargetProducts(req.body);
    
    // For text searches, score and rank products
    const rankedProducts = (query && !upc) 
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
