// server/services/productService.js - Common product handling logic
const { scoreProducts, addFeeBreakdown } = require('../utils/scoring');
const { extractModelNumber, rankResults, getTruncatedTitle } = require('../utils/productMatching');
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
      
      // Extract potential model number from title
      const modelNumber = extractModelNumber(product_title);
      
      // Try multiple search strategies in sequence
      let matchedProducts = [];
      let searchSuccess = false;
      
      // STEP 1: Try UPC search first (if available)
      if (product_id && product_id.length >= 12 && /^\d+$/.test(product_id)) {
        console.log(`Using UPC for search: ${product_id}`);
        
        const searchParams = { 
          query: product_brand && product_title 
            ? `${product_brand} ${product_title}`.trim()
            : product_title || '',
          upc: product_id
        };
        
        try {
          let upcResults;
          switch (marketplace) {
            case 'amazon':
              upcResults = await amazonService.searchAmazonProducts(searchParams);
              break;
            case 'walmart':
              upcResults = await walmartService.searchWalmartProducts(searchParams);
              break;
            case 'target':
              upcResults = await targetService.searchTargetProducts(searchParams);
              break;
          }
          
          if (upcResults && upcResults.length > 0) {
            console.log(`Found ${upcResults.length} results with UPC search`);
            matchedProducts = upcResults;
            searchSuccess = true;
          }
        } catch (error) {
          console.error(`UPC search error for ${marketplace}:`, error.message);
        }
      } else if (marketplace === 'amazon' && source_marketplace === 'amazon' && product_id) {
        // If searching Amazon from Amazon, try ASIN
        console.log(`Using ASIN for Amazon search: ${product_id}`);
        
        try {
          const asinResults = await amazonService.searchAmazonProducts({ asin: product_id });
          
          if (asinResults && asinResults.length > 0) {
            console.log(`Found ${asinResults.length} results with ASIN search`);
            matchedProducts = asinResults;
            searchSuccess = true;
          }
        } catch (error) {
          console.error(`ASIN search error:`, error.message);
        }
      }
      
      // STEP 2: If UPC/ASIN search failed, try brand + truncated title
      if (!searchSuccess && product_brand) {
        const truncatedTitle = getTruncatedTitle(product_title, 7); // Get first 7 significant words
        const brandTitleQuery = `${product_brand} ${truncatedTitle}`.trim();
        
        console.log(`No results from primary search. Trying Brand + Truncated Title search: ${brandTitleQuery}`);
        
        try {
          let brandTitleResults;
          
          switch (marketplace) {
            case 'amazon':
              brandTitleResults = await amazonService.searchAmazonProducts({ query: brandTitleQuery });
              break;
            case 'walmart':
              brandTitleResults = await walmartService.searchWalmartProducts({ query: brandTitleQuery });
              break;
            case 'target':
              brandTitleResults = await targetService.searchTargetProducts({ query: brandTitleQuery });
              break;
          }
          
          if (brandTitleResults && brandTitleResults.length > 0) {
            console.log(`Found ${brandTitleResults.length} results with Brand + Truncated Title search`);
            matchedProducts = brandTitleResults;
            searchSuccess = true;
          }
        } catch (error) {
          console.error(`Brand + Truncated Title search error for ${marketplace}:`, error.message);
        }
      }
      
      // STEP 3: If brand + truncated title failed and we have a model number, try brand + model
      if (!searchSuccess && modelNumber && product_brand) {
        const brandModelQuery = `${product_brand} ${modelNumber}`.trim();
        
        console.log(`No results from previous searches. Trying Brand + Model search: ${brandModelQuery}`);
        
        try {
          let modelBasedResults;
          
          switch (marketplace) {
            case 'amazon':
              modelBasedResults = await amazonService.searchAmazonProducts({ query: brandModelQuery });
              break;
            case 'walmart':
              modelBasedResults = await walmartService.searchWalmartProducts({ query: brandModelQuery });
              break;
            case 'target':
              modelBasedResults = await targetService.searchTargetProducts({ query: brandModelQuery });
              break;
          }
          
          if (modelBasedResults && modelBasedResults.length > 0) {
            console.log(`Found ${modelBasedResults.length} results with Brand + Model search`);
            matchedProducts = modelBasedResults;
            searchSuccess = true;
          }
        } catch (error) {
          console.error(`Model-based search error for ${marketplace}:`, error.message);
        }
      }
      
      console.log(`Got ${matchedProducts.length} results from ${marketplace}`);
      
      // Rank and score results
      const rankedProducts = rankResults(
        matchedProducts,
        {
          title: product_title,
          brand: product_brand
        },
        searchSuccess ? 'brand-title' : 'upc'
      );
      
      // Take top 3 results only
      const topResults = rankedProducts.slice(0, 3);
      
      // Add fee breakdown to each result
      const resultsWithFees = addFeeBreakdown(
        topResults,
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
