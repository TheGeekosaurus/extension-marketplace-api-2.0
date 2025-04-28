// server/utils/apiHelpers.js - API request helpers
const axios = require('axios');

/**
 * Make an API request with error handling and logging
 * @param {string} url - API endpoint URL
 * @param {object} params - Request parameters
 * @param {string} apiName - Name of the API for logging
 * @returns {Promise<object>} API response data
 * @throws {Error} If the request fails
 */
const makeApiRequest = async (url, params, apiName) => {
  console.log(`Making ${apiName} request with params:`, {
    ...params,
    api_key: params.api_key ? '[REDACTED]' : undefined
  });
  
  try {
    const response = await axios.get(url, { params });
    console.log(`${apiName} response status:`, response.status);
    
    // Check for API-specific errors
    if (response.data?.request_info?.success === false) {
      const errorMessage = response.data?.request_info?.message || 'API returned error status';
      console.error(`${apiName} API error:`, errorMessage);
      throw new Error(`${apiName} API error: ${errorMessage}`);
    }
    
    return response.data;
  } catch (error) {
    console.error(`${apiName} API request error:`, error.message);
    
    // Extract and log response details if available
    if (error.response) {
      console.error(`${apiName} API response status:`, error.response.status);
      console.error(`${apiName} API response data:`, error.response.data);
    }
    
    // Create a more informative error
    const enhancedError = new Error(`${apiName} API request failed: ${error.message}`);
    enhancedError.originalError = error;
    enhancedError.status = error.response?.status;
    throw enhancedError;
  }
};

/**
 * Throttle API requests to avoid rate limiting
 * @param {function} fn - The function to throttle
 * @param {number} delay - Delay in milliseconds between calls
 * @returns {function} Throttled function
 */
const throttleApiRequests = (fn, delay = 500) => {
  let lastCall = 0;
  
  return async function(...args) {
    const now = Date.now();
    const elapsed = now - lastCall;
    
    if (elapsed < delay) {
      const waitTime = delay - elapsed;
      console.log(`Throttling API request, waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    lastCall = Date.now();
    return fn(...args);
  };
};

module.exports = {
  makeApiRequest,
  throttleApiRequests
};
