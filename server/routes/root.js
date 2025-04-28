// server/routes/root.js - Root endpoint routes
const express = require('express');
const router = express.Router();

/**
 * Root endpoint - provides info about the API
 */
router.get('/', (req, res) => {
  console.log('Root endpoint called');
  res.json({
    message: 'E-commerce Arbitrage API is running',
    version: '1.0.0',
    endpoints: {
      '/api/health': 'Health check endpoint',
      '/api/test': 'API functionality test',
      '/api/search/walmart': 'Search products on Walmart',
      '/api/search/amazon': 'Search products on Amazon',
      '/api/search/target': 'Search products on Target',
      '/api/search/multi': 'Search across multiple marketplaces'
    }
  });
});

module.exports = router;
