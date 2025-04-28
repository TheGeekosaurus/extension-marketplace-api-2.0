// server/routes/walmart.js - Walmart search routes
const express = require('express');
const router = express.Router();
const { searchWalmartProducts } = require('../services/walmartService');
const { cacheMiddleware, generateCacheKey } = require('../middleware/cache');
const { scoreProducts } = require('../utils/scoring');

// Cache middleware for Walmart searches
const walmartCacheMiddleware = cacheMiddleware((req) => {
  const { query, upc } = req.body;
  return generateCacheKey('walmart', { query, upc });
});

/**
 * Walmart product search endpoint
 * Searches using UPC or text query in priority order
 */
router.post('/', walmartCacheMiddleware, async (req, res, next) => {
  try {
    console.log('Walmart search called with:', req.body);
    const { query, upc } = req.body;
    
    // Validate input - need at least one search parameter
    if (!query && !upc) {
      return res.status(400).json({
        success: false,
        error: 'Missing search parameters',
        message: 'Please provide at least one of: query or upc'
      });
    }
    
    // Search for Walmart products using appropriate parameters
    const matchedProducts = await searchWalmartProducts(req.body);
    
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
