// server/services/productService.js - Common product handling logic
const { scoreProducts, addFeeBreakdown } = require('../utils/scoring');
const amazonService = require('./amazonService');
const walmartService = require('./walmartService');
const targetService = require('./targetService');

/**
 * Search for products across multiple marketplaces
 * @param {Object} params - Search parameters
 * @returns {Promise<Object>} Results grouped by marketplace
 */
const searchMultipleMarketplaces = async (params) => {
  const { 
    source_marketplace, 
    product_id, 
    product_title, 
    product_brand,
    selected_marketplace,
    additional_fees = 0
  } = params;
  
  console.log('Multi-marketplace search for:', {
    source: source_marketplace,
    id: product_id,
    title: product_title,
    brand: product_brand,
    selected: selected_marketplace
  });
  
  // Determine which marketplaces to search (all except source)
  let marketplaces = ['amazon', 'walmart', 'target'].filter(
    marketplace => marketplace !== source_marketplace
  );
  
  // If a specific marketplace is selected, only search that one
  if (selected_marketplace) {
    // Make sure the selected marketplace is not the source marketplace
    if (selected_marketplace !== source_marketplace) {
      marketplaces = [selected_marketplace];
    } else {
      marketplaces = []; // No marketplaces to search when selected is the same as source
    }
  }
  
  console.log('Searching these marketplaces:', marketplaces);
  
  const results = {};
  
  // Execute searches in parallel
  await Promise.all(marketplaces.map(async (marketplace) => {
    try {
      console.log(`Searching ${marketplace} for product match`);
      // Create a better search query that combines brand and title if both are available
      const searchQuery = product_brand && product_title 
        ? `${product_brand} ${product_title}`.trim()
        : product_title || '';
      
      // Construct the search request based on marketplace and available identifiers
      const searchParams = { 
        query: searchQuery
      };
      
      // Add specific identifiers if available
      if (product_id) {
        if (marketplace === 'amazon' && source_marketplace === 'amazon') {
          searchParams.asin = product_id;
          console.log('Using ASIN for Amazon search:', product_id);
        } else if ((['walmart', 'target'].includes(marketplace)) && 
                  product_id.length >= 12 && /^\d+$/.test(product_id)) {
          searchParams.upc = product_id;
          console.log('Using UPC for search:', product_id);
        } else {
          console.log('Product ID not usable as UPC/ASIN, using text search');
        }
      }
      
      // Call the appropriate service for this marketplace
      let matchedProducts;
      switch (marketplace) {
        case 'amazon':
          matchedProducts = await amazonService.searchAmazonProducts(searchParams);
          break;
        case 'walmart':
          matchedProducts = await walmartService.searchWalmartProducts(searchParams);
          break;
        case 'target':
          matchedProducts = await targetService.searchTargetProducts(searchParams);
          break;
        default:
          throw new Error(`Unknown marketplace: ${marketplace}`);
      }
      
      console.log(`Got ${matchedProducts.length} results from ${marketplace}`);
      
      // Add fee breakdown to each result
      const resultsWithFees = addFeeBreakdown(
        matchedProducts,
        marketplace,
        additional_fees
      );
      
      results[marketplace] = resultsWithFees;
    } catch (error) {
      console.error(`Multi-search ${marketplace} error:`, error.message);
      results[marketplace] = [];
    }
  }));
  
  return results;
};

/**
 * Get best match for a product in a specific marketplace
 * @param {Object} params - Search parameters
 * @param {string} marketplace - Target marketplace
 * @returns {Promise<Object>} Best matching product
 */
const getBestMatch = async (params, marketplace) => {
  try {
    let results;
    switch (marketplace) {
      case 'amazon':
        results = await amazonService.searchAmazonProducts(params);
        break;
      case 'walmart':
        results = await walmartService.searchWalmartProducts(params);
        break;
      case 'target':
        results = await targetService.searchTargetProducts(params);
        break;
      default:
        throw new Error(`Unknown marketplace: ${marketplace}`);
    }
    
    // Score and sort results
    if (params.query) {
      results = scoreProducts(results, params.query);
    }
    
    // Return top result or null
    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error(`Error getting best match for ${marketplace}:`, error);
    return null;
  }
};

module.exports = {
  searchMultipleMarketplaces,
  getBestMatch
};
