// server/middleware/cache.js - Cache middleware and utilities
const NodeCache = require('node-cache');
const config = require('../config');

// Initialize cache with TTL from config
const productCache = new NodeCache({ stdTTL: config.cache.ttl });

/**
 * Cache middleware factory that creates route-specific caching
 * @param {Function} getCacheKey - Function to generate a cache key from the request
 * @returns {Function} Express middleware function
 */
const cacheMiddleware = (getCacheKey) => {
  return (req, res, next) => {
    // Skip caching for non-GET methods
    if (req.method !== 'GET' && req.method !== 'POST') {
      return next();
    }
    
    // Generate cache key from request
    const cacheKey = getCacheKey(req);
    console.log(`Checking cache for key: ${cacheKey}`);
    
    // Check cache
    const cachedResult = productCache.get(cacheKey);
    if (cachedResult) {
      console.log(`Cache hit for: ${cacheKey}`);
      return res.json({ source: 'cache', data: cachedResult });
    }
    
    // Cache miss, continue to handler
    console.log(`Cache miss for: ${cacheKey}`);
    
    // Modify res.json to cache the response before sending
    const originalJson = res.json;
    res.json = function(body) {
      // Only cache successful API responses
      if (body && body.source === 'api' && body.data) {
        console.log(`Caching response for: ${cacheKey}`);
        productCache.set(cacheKey, body.data);
      }
      return originalJson.call(this, body);
    };
    
    next();
  };
};

/**
 * Generate a cache key based on marketplace and search parameters
 * @param {string} marketplace - Marketplace name
 * @param {object} params - Search parameters
 * @returns {string} Cache key
 */
const generateCacheKey = (marketplace, params) => {
  // Generate a unique key based on search parameters
  let key = `${marketplace}-`;
  
  if (params.asin) {
    key += `asin:${params.asin}`;
  } else if (params.upc) {
    key += `upc:${params.upc}`;
  } else if (params.query) {
    // Normalize query by removing spaces, lowercasing
    const normalizedQuery = params.query.toLowerCase().trim().replace(/\s+/g, '-');
    key += `query:${normalizedQuery}`;
  } else {
    key += 'unknown';
  }
  
  return key;
};

/**
 * Generate a cache key for multi-marketplace searches
 * @param {object} params - Search parameters
 * @returns {string} Cache key
 */
const generateMultiCacheKey = (params) => {
  const {
    source_marketplace,
    product_id,
    product_title,
    selected_marketplace,
    additional_fees = 0
  } = params;
  
  // Generate unique components for the key
  const idPart = product_id ? `id:${product_id}` : '';
  const titlePart = product_title ? 
    `title:${product_title.substring(0, 20).toLowerCase().replace(/\s+/g, '-')}` : '';
  const marketplaceSuffix = selected_marketplace ? `-${selected_marketplace}` : '';
  const feesSuffix = additional_fees > 0 ? `-fees${additional_fees}` : '';
  
  return `multi-${source_marketplace}-${idPart}-${titlePart}${marketplaceSuffix}${feesSuffix}`;
};

/**
 * Clear all cache entries
 * @returns {number} Number of cache entries deleted
 */
const clearCache = () => {
  return productCache.flushAll();
};

/**
 * Get cache statistics
 * @returns {object} Cache stats
 */
const getCacheStats = () => {
  return productCache.getStats();
};

module.exports = {
  cacheMiddleware,
  generateCacheKey,
  generateMultiCacheKey,
  clearCache,
  getCacheStats,
  productCache // Export the cache instance for direct access
};
