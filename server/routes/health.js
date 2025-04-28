// server/routes/health.js - Health check routes
const express = require('express');
const router = express.Router();
const config = require('../config');
const { getCacheStats } = require('../middleware/cache');

/**
 * Health check endpoint
 */
router.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: config.nodeEnv,
    apiKeys: {
      blueCart: !!config.apiKeys.bluecart,
      rainforest: !!config.apiKeys.rainforest,
      bigBox: !!config.apiKeys.bigbox
    },
    cache: getCacheStats()
  });
});

/**
 * API test endpoint (re-using the same router)
 * This is also used for the /api/test route
 */
router.get('/test', (req, res) => {
  res.json({
    message: 'API is working correctly',
    endpoints: {
      '/api/health': 'Health check endpoint',
      '/api/search/walmart': 'Search products on Walmart',
      '/api/search/amazon': 'Search products on Amazon',
      '/api/search/target': 'Search products on Target',
      '/api/search/multi': 'Search across multiple marketplaces'
    }
  });
});

module.exports = router;
