// server/routes/multi.js - Multi-marketplace search routes
const express = require('express');
const router = express.Router();
const { searchMultipleMarketplaces } = require('../services/productService');
const { cacheMiddleware, generateMultiCacheKey } = require('../middleware/cache');

// Cache middleware for multi-marketplace searches
const multiCacheMiddleware = cacheMiddleware((req) => {
  return generateMultiCacheKey(req.body);
});

/**
 * Multi-marketplace search endpoint
 * Searches across multiple marketplaces for a given product
 */
router.post('/', multiCacheMiddleware, async (req, res, next) => {
  try {
    console.log('Multi-marketplace search called with:', req.body);
    
    const { 
      source_marketplace, 
      product_id, 
      product_title,
      selected_marketplace
    } = req.body;
    
    // Validate required parameters
    if (!source_marketplace) {
      return res.status(400).json({
        success: false,
        error: 'Missing source_marketplace parameter',
        message: 'Please provide the source marketplace of the product'
      });
    }
    
    if (!product_title && !product_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing product identification',
        message: 'Please provide either product_id or product_title'
      });
    }
    
    // Validate selected marketplace if provided (only allow amazon and walmart)
    if (selected_marketplace && selected_marketplace !== 'amazon' && selected_marketplace !== 'walmart') {
      return res.status(400).json({
        success: false,
        error: 'Invalid selected_marketplace parameter',
        message: 'Selected marketplace must be either "amazon" or "walmart"'
      });
    }
    
    // Search across marketplaces
    const results = await searchMultipleMarketplaces(req.body);
    
    res.json({
      success: true,
      source: 'api',
      data: results
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
