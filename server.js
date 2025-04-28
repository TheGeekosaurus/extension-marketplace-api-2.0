// server.js - Main Express server for E-commerce Arbitrage Extension
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const NodeCache = require('node-cache');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Setup middleware
app.use(cors());
app.use(express.json());

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('Request headers:', req.headers);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Request body:', req.body);
  }
  next();
});

// Initialize cache with 1 hour TTL
const productCache = new NodeCache({ stdTTL: 3600 });

// Root endpoint - Add this to handle requests to the root path
app.get('/', (req, res) => {
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

// API Routes
const apiRouter = express.Router();

// Walmart product search using BlueCart API
apiRouter.post('/search/walmart', async (req, res) => {
  try {
    console.log('Walmart search called with:', req.body);
    const { query, upc, asin } = req.body;
    
    // Generate cache key based on search parameters
    const cacheKey = `walmart-${upc || asin || query}`;
    
    // Check cache first
    const cachedResult = productCache.get(cacheKey);
    if (cachedResult) {
      console.log('Serving cached Walmart result for:', cacheKey);
      return res.json({ source: 'cache', data: cachedResult });
    }
    
    // Log API key status (redacted for security)
    console.log('BlueCart API Key available:', !!process.env.BLUECART_API_KEY);
    
    // Construct API request for BlueCart
    const blueCartUrl = 'https://api.bluecartapi.com/request';
    let params = {
      api_key: process.env.BLUECART_API_KEY,
      walmart_domain: 'walmart.com'
    };
    
    // Use UPC or ASIN if available for more precise product lookup
    if (upc) {
      params.type = 'product';
      params.gtin = upc;
    } else if (asin) {
      // For walmart search with ASIN, it's better to use text search
      params.type = 'search';
      params.search_term = query;
    } else {
      // Regular text search
      params.type = 'search';
      params.search_term = query;
    }
    
    console.log('Making BlueCart API request with params:', { ...params, api_key: '[REDACTED]' });
    
    const response = await axios.get(blueCartUrl, { params });
    console.log('BlueCart API response status:', response.status);
    
    // Process and format the response
    const formattedResponse = processWalmartResponse(response.data);
    console.log('Processed Walmart results:', formattedResponse.length);
    
    // Cache the result
    productCache.set(cacheKey, formattedResponse);
    
    res.json({ source: 'api', data: formattedResponse });
  } catch (error) {
    console.error('Walmart search error:', error.message);
    if (error.response) {
      console.error('API response status:', error.response.status);
      console.error('API response data:', error.response.data);
    }
    res.status(500).json({ 
      error: 'Failed to fetch Walmart data', 
      message: error.message 
    });
  }
});

// Amazon product search using Rainforest API
apiRouter.post('/search/amazon', async (req, res) => {
  try {
    console.log('Amazon search called with:', req.body);
    const { query, upc, asin } = req.body;
    
    // Generate cache key based on search parameters
    const cacheKey = `amazon-${asin || upc || query}`;
    
    // Check cache first
    const cachedResult = productCache.get(cacheKey);
    if (cachedResult) {
      console.log('Serving cached Amazon result for:', cacheKey);
      return res.json({ source: 'cache', data: cachedResult });
    }
    
    // Log API key status (redacted for security)
    console.log('Rainforest API Key available:', !!process.env.RAINFOREST_API_KEY);
    
    // Construct API request for Rainforest
    const rainforestUrl = 'https://api.rainforestapi.com/request';
    const params = {
      api_key: process.env.RAINFOREST_API_KEY,
      type: 'search',
      amazon_domain: 'amazon.com',
      search_term: query
    };
    
    // Use ASIN if available for more precise search
    if (asin) {
      params.type = 'product';
      params.asin = asin;
      delete params.search_term;
    }
    
    console.log('Making Rainforest API request with params:', { ...params, api_key: '[REDACTED]' });
    
    const response = await axios.get(rainforestUrl, { params });
    console.log('Rainforest API response status:', response.status);
    
    // Process and format the response
    const formattedResponse = processAmazonResponse(response.data);
    console.log('Processed Amazon results:', formattedResponse.length);
    
    // Cache the result
    productCache.set(cacheKey, formattedResponse);
    
    res.json({ source: 'api', data: formattedResponse });
  } catch (error) {
    console.error('Amazon search error:', error.message);
    if (error.response) {
      console.error('API response status:', error.response.status);
      console.error('API response data:', error.response.data);
    }
    res.status(500).json({ 
      error: 'Failed to fetch Amazon data', 
      message: error.message 
    });
  }
});

// Target product search using BigBox API (if available)
apiRouter.post('/search/target', async (req, res) => {
  try {
    console.log('Target search called with:', req.body);
    const { query, upc } = req.body;
    
    // Generate cache key based on search parameters
    const cacheKey = `target-${upc || query}`;
    
    // Check cache first
    const cachedResult = productCache.get(cacheKey);
    if (cachedResult) {
      console.log('Serving cached Target result for:', cacheKey);
      return res.json({ source: 'cache', data: cachedResult });
    }
    
    // Log API key status (redacted for security)
    console.log('BigBox API Key available:', !!process.env.BIGBOX_API_KEY);
    
    // Construct API request for BigBox API
    const bigboxUrl = 'https://api.bigboxapi.com/request';
    const params = {
      api_key: process.env.BIGBOX_API_KEY,
      type: 'search',
      search_term: query
    };
    
    // Use UPC if available for more precise search
    if (upc) {
      params.type = 'product';
      params.upc = upc;
      delete params.search_term;
    }
    
    console.log('Making BigBox API request with params:', { ...params, api_key: '[REDACTED]' });
    
    const response = await axios.get(bigboxUrl, { params });
    console.log('BigBox API response status:', response.status);
    
    // Process and format the response
    const formattedResponse = processTargetResponse(response.data);
    console.log('Processed Target results:', formattedResponse.length);
    
    // Cache the result
    productCache.set(cacheKey, formattedResponse);
    
    res.json({ source: 'api', data: formattedResponse });
  } catch (error) {
    console.error('Target search error:', error.message);
    if (error.response) {
      console.error('API response status:', error.response.status);
      console.error('API response data:', error.response.data);
    }
    res.status(500).json({ 
      error: 'Failed to fetch Target data', 
      message: error.message 
    });
  }
});

// Multi-marketplace search for a given product
apiRouter.post('/search/multi', async (req, res) => {
  try {
    console.log('Multi-marketplace search called with:', req.body);
    const { 
      source_marketplace, // Where the product was found (amazon, walmart, target)
      product_id, // UPC, ASIN, or other product identifier
      product_title, // Product title for fuzzy matching if IDs fail
      product_brand, // Brand name for improved matching
      selected_marketplace // The marketplace selected in the settings (if any)
    } = req.body;
    
    // Generate unique cache key for this request
    const marketplaceSuffix = selected_marketplace ? `-${selected_marketplace}` : '';
    const cacheKey = `multi-${source_marketplace}-${product_id}-${product_title?.substring(0, 20)}${marketplaceSuffix}`;
    
    // Check cache first
    const cachedResult = productCache.get(cacheKey);
    if (cachedResult) {
      console.log('Serving cached multi-marketplace result for:', cacheKey);
      return res.json({ source: 'cache', data: cachedResult });
    }
    
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
        // Construct the search request based on marketplace and available identifiers
        const searchParams = { 
          query: `${product_brand || ''} ${product_title}`.trim()
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
        
        // Call the appropriate endpoint for this marketplace
        const endpointPath = `/search/${marketplace}`;
        
        console.log(`Making internal API request to: ${endpointPath}`, searchParams);
        
        // Use the current Express app to handle the request directly
        const response = await axios.post(
          `http://localhost:${PORT}/api${endpointPath}`,
          searchParams
        );
        
        console.log(`Got ${marketplace} search response:`, response.status);
        results[marketplace] = response.data.data || [];
      } catch (error) {
        console.error(`Multi-search ${marketplace} error:`, error.message);
        results[marketplace] = { error: error.message };
      }
    }));
    
    console.log('Got search results:', Object.keys(results));
    
    // Cache the result
    productCache.set(cacheKey, results);
    
    res.json({
      source: 'api',
      data: results
    });
  } catch (error) {
    console.error('Multi-marketplace search error:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch multi-marketplace data', 
      message: error.message 
    });
  }
});

// Helper functions to process API responses from different providers
function processWalmartResponse(data) {
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
        image: item.product?.main_image || item.product?.images?.[0] || null,
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
        image: data.product.main_image?.link || data.product.images?.[0]?.link || null,
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
}

// Helper function to extract price from different possible structures
function extractPrice(item) {
  if (item.offers?.primary?.price) {
    return parseFloat(item.offers.primary.price);
  }
  
  if (item.product?.price) {
    return parseFloat(item.product.price);
  }
  
  return null;
}

function processAmazonResponse(data) {
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
        }
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
        }
      }];
    }
    
    console.log('No Amazon search results or product data found');
    return [];
  } catch (error) {
    console.error('Error processing Amazon response:', error);
    return [];
  }
}

function processTargetResponse(data) {
  try {
    console.log('Processing Target response');
    
    // Target API response structure may vary
    // This is a placeholder implementation
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
        }
      }));
    }
    
    console.log('No Target search results found');
    return [];
  } catch (error) {
    console.error('Error processing Target response:', error);
    return [];
  }
}

// Mount API router to /api path
app.use('/api', apiRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// API health check endpoint (mounted under /api)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    apiKeys: {
      blueCart: !!process.env.BLUECART_API_KEY,
      rainforest: !!process.env.RAINFOREST_API_KEY,
      bigBox: !!process.env.BIGBOX_API_KEY
    }
  });
});

// API test endpoint (mounted under /api)
app.get('/api/test', (req, res) => {
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

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API endpoints available at http://localhost:${PORT}/api/*`);
});

module.exports = app;
