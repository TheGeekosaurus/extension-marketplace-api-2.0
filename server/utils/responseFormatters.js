// server/utils/responseFormatters.js - Format API responses

/**
 * Process Walmart API response into standard format
 * @param {Object} data - The raw API response
 * @returns {Array} Standardized product results
 */
const processWalmartResponse = (data) => {
  try {
    console.log('Processing Walmart response');
    
    // Check if the response was successful
    if (!data.request_info || data.request_info.success !== true) {
      console.error('BlueCart API error:', data);
      return [];
    }
    
    // Handle search results
    if (data.search_results && Array.isArray(data.search_results)) {
      console.log(`Found ${data.search_results.length} Walmart search results`);
      return data.search_results.map(item => ({
        title: item.product?.title || '',
        price: extractPrice(item),
        image: extractImage(item),
        url: item.product?.link || '',
        marketplace: 'walmart',
        item_id: item.product?.item_id || null,
        upc: item.product?.upc || null,
        ratings: {
          average: item.product?.rating || null,
          count: item.product?.ratings_total || 0
        },
        // Include additional data that might be useful
        brand: item.product?.brand || '',
        in_stock: item.inventory?.in_stock === true
      }));
    }
    
    // Handle single product result (for product type requests)
    if (data.product) {
      console.log('Found Walmart product result');
      return [{
        title: data.product.title || '',
        price: data.product.buybox_winner?.price || null,
        image: extractProductImage(data.product),
        url: data.product.link || '',
        marketplace: 'walmart',
        item_id: data.product.item_id || null,
        upc: data.product.upc || null,
        ratings: {
          average: data.product.rating || null,
          count: data.product.ratings_total || 0
        },
        brand: data.product.brand || '',
        in_stock: data.product.buybox_winner?.availability?.in_stock === true
      }];
    }
    
    console.log('No Walmart search results or product data found in response');
    return [];
  } catch (error) {
    console.error('Error processing Walmart response:', error);
    console.error('Raw response structure:', JSON.stringify(Object.keys(data), null, 2));
    return [];
  }
};

/**
 * Process Amazon API response into standard format
 * @param {Object} data - The raw API response
 * @returns {Array} Standardized product results
 */
const processAmazonResponse = (data) => {
  try {
    console.log('Processing Amazon response');
    
    // Handle search results
    if (data.search_results) {
      console.log(`Found ${data.search_results.length} Amazon search results`);
      return data.search_results.map(item => ({
        title: item.title,
        price: parseFloat(item.price?.value || 0),
        image: item.image,
        url: item.link,
        marketplace: 'amazon',
        asin: item.asin,
        ratings: {
          average: item.rating,
          count: item.ratings_total
        },
        brand: item.brand || ''
      }));
    }
    
    // Handle single product result
    if (data.product) {
      console.log('Found Amazon product result');
      return [{
        title: data.product.title,
        price: parseFloat(data.product.buybox_winner?.price?.value || 0),
        image: data.product.main_image?.link,
        url: data.product.link,
        marketplace: 'amazon',
        asin: data.product.asin,
        ratings: {
          average: data.product.rating,
          count: data.product.ratings_total
        },
        brand: data.product.brand || ''
      }];
    }
    
    console.log('No Amazon search results or product data found');
    return [];
  } catch (error) {
    console.error('Error processing Amazon response:', error);
    return [];
  }
};

/**
 * Process Target API response into standard format
 * @param {Object} data - The raw API response
 * @returns {Array} Standardized product results
 */
const processTargetResponse = (data) => {
  try {
    console.log('Processing Target response');
    
    // Target API response structure may vary
    if (data.search_results) {
      console.log(`Found ${data.search_results.length} Target search results`);
      return data.search_results.map(item => ({
        title: item.title,
        price: item.price?.current_price || null,
        image: item.image,
        url: item.link,
        marketplace: 'target',
        tcin: item.tcin || null,
        upc: item.upc || null,
        ratings: {
          average: item.rating || null,
          count: item.ratings_total || 0
        },
        brand: item.brand || ''
      }));
    }
    
    // Handle single product result
    if (data.product) {
      console.log('Found Target product result');
      return [{
        title: data.product.title || '',
        price: data.product.price?.current_price || null,
        image: data.product.images?.[0] || null,
        url: data.product.url || '',
        marketplace: 'target',
        tcin: data.product.tcin || null,
        upc: data.product.upc || null,
        ratings: {
          average: data.product.rating || null,
          count: data.product.rating_count || 0
        },
        brand: data.product.brand || ''
      }];
    }
    
    console.log('No Target search results found');
    return [];
  } catch (error) {
    console.error('Error processing Target response:', error);
    return [];
  }
};

/**
 * Helper function to extract price from different possible structures
 * @param {Object} item - Product item from API
 * @returns {number|null} Extracted price
 */
const extractPrice = (item) => {
  if (item.offers?.primary?.price) {
    return parseFloat(item.offers.primary.price);
  }
  
  if (item.product?.price) {
    return parseFloat(item.product.price);
  }
  
  if (item.price?.current_price) {
    return parseFloat(item.price.current_price);
  }
  
  if (item.price?.value) {
    return parseFloat(item.price.value);
  }
  
  return null;
};

/**
 * Helper function to extract image URL from different possible structures
 * @param {Object} item - Product item from API
 * @returns {string|null} Image URL
 */
const extractImage = (item) => {
  if (item.product?.main_image) {
    return item.product.main_image;
  }
  
  if (item.product?.images && item.product.images.length > 0) {
    return item.product.images[0];
  }
  
  if (item.image) {
    return item.image;
  }
  
  return null;
};

/**
 * Helper function to extract product image from different possible structures
 * @param {Object} product - Product object from API
 * @returns {string|null} Image URL
 */
const extractProductImage = (product) => {
  if (product.main_image?.link) {
    return product.main_image.link;
  }
  
  if (product.images && product.images.length > 0) {
    if (product.images[0].link) {
      return product.images[0].link;
    }
    return product.images[0];
  }
  
  if (product.image) {
    return product.image;
  }
  
  return null;
};

/**
 * Format the response to be sent back to the client
 * @param {Array} data - Data to format
 * @param {string} source - Source of the data (api, cache)
 * @returns {Object} Formatted response
 */
const formatApiResponse = (data, source = 'api') => {
  return {
    success: true,
    source,
    data
  };
};

/**
 * Format an error response
 * @param {Error} error - Error object
 * @param {number} status - HTTP status code
 * @returns {Object} Formatted error response
 */
const formatErrorResponse = (error, status = 500) => {
  return {
    success: false,
    error: error.message || 'Unknown error',
    status,
    details: process.env.NODE_ENV === 'development' ? error.stack : undefined
  };
};

module.exports = {
  processWalmartResponse,
  processAmazonResponse,
  processTargetResponse,
  extractPrice,
  extractImage,
  extractProductImage,
  formatApiResponse,
  formatErrorResponse
};
