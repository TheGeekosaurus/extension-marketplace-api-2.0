// server/services/walmartService.js - Walmart API service
const { makeApiRequest } = require('../utils/apiHelpers');
const { processWalmartResponse } = require('../utils/responseFormatters');
const config = require('../config');

/**
 * Search for products on Walmart by UPC or query
 * @param {Object} params - Search parameters
 * @returns {Promise<Array>} Matching products
 */
const searchWalmartProducts = async (params) => {
  const { query, upc } = params;
  
  console.log('Searching Walmart for:', { query, upc });
  
  try {
    // Try UPC-based product lookup first if UPC is provided
    if (upc) {
      console.log('Attempting direct UPC product lookup');
      try {
        const products = await getWalmartProductByUpc(upc);
        if (products && products.length > 0) {
          console.log('Found product by UPC lookup');
          return products;
        }
      } catch (error) {
        console.error('Error in UPC product lookup:', error.message);
        // Continue to search if UPC lookup fails
      }
    }
    
    // Fall back to search with either UPC or query
    const searchTerm = upc || query;
    if (!searchTerm) {
      throw new Error('No search parameters provided for Walmart search');
    }
    
    console.log('Attempting search with term:', searchTerm);
    return await searchWalmartByTerm(searchTerm);
  } catch (error) {
    console.error('Error in Walmart product search:', error);
    throw error;
  }
};

/**
 * Get product details from Walmart by UPC
 * @param {string} upc - UPC code
 * @returns {Promise<Array>} Product details
 */
const getWalmartProductByUpc = async (upc) => {
  const params = {
    api_key: config.apiKeys.bluecart,
    walmart_domain: 'walmart.com',
    type: 'product',
    gtin: upc
  };
  
  console.log('Making BlueCart API product request with UPC:', upc);
  
  try {
    const response = await makeApiRequest(
      config.endpoints.bluecart,
      params,
      'BlueCart (Walmart)'
    );
    return processWalmartResponse(response);
  } catch (error) {
    console.error('BlueCart product lookup error:', error.message);
    return [];
  }
};

/**
 * Search for products on Walmart by search term
 * @param {string} searchTerm - Search query
 * @returns {Promise<Array>} Matching products
 */
const searchWalmartByTerm = async (searchTerm) => {
  const params = {
    api_key: config.apiKeys.bluecart,
    walmart_domain: 'walmart.com',
    type: 'search',
    search_term: searchTerm
  };
  
  console.log('Making BlueCart API search request with term:', searchTerm);
  
  try {
    const response = await makeApiRequest(
      config.endpoints.bluecart,
      params,
      'BlueCart (Walmart)'
    );
    return processWalmartResponse(response);
  } catch (error) {
    console.error('BlueCart search error:', error.message);
    return [];
  }
};

module.exports = {
  searchWalmartProducts,
  getWalmartProductByUpc,
  searchWalmartByTerm
};
