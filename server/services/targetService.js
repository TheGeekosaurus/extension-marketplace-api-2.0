// server/services/targetService.js - Target API service
const { makeApiRequest } = require('../utils/apiHelpers');
const { processTargetResponse } = require('../utils/responseFormatters');
const config = require('../config');

/**
 * Search for products on Target by UPC or query
 * @param {Object} params - Search parameters
 * @returns {Promise<Array>} Matching products
 */
const searchTargetProducts = async (params) => {
  const { query, upc } = params;
  
  console.log('Searching Target for:', { query, upc });
  
  // Check if we have the API key
  if (!config.apiKeys.bigbox) {
    console.warn('BigBox API key not configured. Target search may not work properly.');
  }
  
  try {
    // Try UPC-based product lookup first if UPC is provided
    if (upc) {
      console.log('Attempting direct UPC product lookup');
      try {
        const products = await getTargetProductByUpc(upc);
        if (products && products.length > 0) {
          console.log('Found product by UPC lookup');
          return products;
        }
      } catch (error) {
        console.error('Error in UPC product lookup:', error.message);
        // Continue to search if UPC lookup fails
      }
    }
    
    // Fall back to search with query
    if (!query) {
      throw new Error('No search parameters provided for Target search');
    }
    
    console.log('Attempting search with query:', query);
    return await searchTargetByQuery(query);
  } catch (error) {
    console.error('Error in Target product search:', error);
    throw error;
  }
};

/**
 * Get product details from Target by UPC
 * @param {string} upc - UPC code
 * @returns {Promise<Array>} Product details
 */
const getTargetProductByUpc = async (upc) => {
  const params = {
    api_key: config.apiKeys.bigbox,
    type: 'product',
    upc: upc
  };
  
  console.log('Making BigBox API product request with UPC:', upc);
  
  try {
    const response = await makeApiRequest(
      config.endpoints.bigbox,
      params,
      'BigBox (Target)'
    );
    return processTargetResponse(response);
  } catch (error) {
    console.error('BigBox product lookup error:', error.message);
    return [];
  }
};

/**
 * Search for products on Target by query
 * @param {string} query - Search query
 * @returns {Promise<Array>} Matching products
 */
const searchTargetByQuery = async (query) => {
  const params = {
    api_key: config.apiKeys.bigbox,
    type: 'search',
    search_term: query
  };
  
  console.log('Making BigBox API search request with query:', query);
  
  try {
    const response = await makeApiRequest(
      config.endpoints.bigbox,
      params,
      'BigBox (Target)'
    );
    return processTargetResponse(response);
  } catch (error) {
    console.error('BigBox search error:', error.message);
    return [];
  }
};

module.exports = {
  searchTargetProducts,
  getTargetProductByUpc,
  searchTargetByQuery
};
