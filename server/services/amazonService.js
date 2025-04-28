// server/services/amazonService.js - Amazon API service
const { makeApiRequest } = require('../utils/apiHelpers');
const { processAmazonResponse } = require('../utils/responseFormatters');
const config = require('../config');

/**
 * Search for products on Amazon by UPC or query
 * @param {Object} params - Search parameters
 * @returns {Promise<Array>} Matching products
 */
const searchAmazonProducts = async (params) => {
  const { query, upc, asin } = params;
  
  console.log('Searching Amazon for:', { query, upc, asin });
  
  // Determine search strategy based on available parameters
  let searchParams = {
    api_key: config.apiKeys.rainforest,
    amazon_domain: 'amazon.com'
  };
  
  // ASIN is most accurate for Amazon
  if (asin) {
    console.log('Using ASIN for direct product lookup:', asin);
    searchParams.type = 'product';
    searchParams.asin = asin;
  } 
  // UPC is next best option
  else if (upc) {
    console.log('Using UPC for search:', upc);
    searchParams.type = 'search';
    searchParams.search_term = upc;
  } 
  // Text search as last resort
  else if (query) {
    console.log('Using text search:', query);
    searchParams.type = 'search';
    searchParams.search_term = query;
  } else {
    throw new Error('No search parameters provided for Amazon search');
  }
  
  try {
    // Make the request to Rainforest API
    const response = await makeApiRequest(
      config.endpoints.rainforest,
      searchParams,
      'Rainforest (Amazon)'
    );
    
    // Process the response into our standard format
    return processAmazonResponse(response);
  } catch (error) {
    console.error('Error in Amazon product search:', error);
    throw error;
  }
};

/**
 * Get product details by ASIN
 * @param {string} asin - Amazon ASIN
 * @returns {Promise<Array>} Product details
 */
const getAmazonProductByAsin = async (asin) => {
  return searchAmazonProducts({ asin });
};

/**
 * Search for products on Amazon by UPC
 * @param {string} upc - UPC code
 * @returns {Promise<Array>} Matching products
 */
const searchAmazonByUpc = async (upc) => {
  return searchAmazonProducts({ upc });
};

/**
 * Search for products on Amazon by text query
 * @param {string} query - Search query
 * @returns {Promise<Array>} Matching products
 */
const searchAmazonByQuery = async (query) => {
  return searchAmazonProducts({ query });
};

module.exports = {
  searchAmazonProducts,
  getAmazonProductByAsin,
  searchAmazonByUpc,
  searchAmazonByQuery
};
