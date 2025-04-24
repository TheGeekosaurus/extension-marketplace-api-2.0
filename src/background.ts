// background.ts - Handles API communication and caching

// Configuration
const API_BASE_URL = 'https://extension-marketplace-api-2-0.onrender.com/api';

// Add debug logging
function debugLog(message: string, data?: any) {
  console.log(`[E-commerce Arbitrage Background] ${message}`, data || '');
}

debugLog('Background script loaded');

// Types
interface ProductData {
  title: string;
  price: number | null;
  marketplace: string;
  productId: string;
  brand: string | null;
  upc: string | null;
  asin: string | null;
  imageUrl: string | null;
  pageUrl: string;
}

interface ProductComparison {
  sourceProduct: ProductData;
  matchedProducts: {
    amazon?: ProductMatchResult[];
    walmart?: ProductMatchResult[];
    target?: ProductMatchResult[];
  };
  timestamp: number;
}

interface ProductMatchResult {
  title: string;
  price: number | null;
  image: string | null;
  url: string;
  marketplace: string;
  item_id?: string;
  asin?: string;
  upc?: string;
  profit?: {
    amount: number;
    percentage: number;
  };
  ratings?: {
    average: number | null;
    count: number | null;
  };
}

// Initialize
chrome.runtime.onInstalled.addListener(() => {
  debugLog('Extension installed or updated');
  
  // Set default settings
  chrome.storage.local.set({
    settings: {
      apiBaseUrl: API_BASE_URL,
      cacheExpiration: 24, // Hours
      minimumProfitPercentage: 10,
      includeFees: true,
      estimatedFees: {
        amazon: 0.15,
        walmart: 0.12,
        target: 0.10
      }
    }
  }, () => {
    debugLog('Default settings initialized');
  });
  
  // Test API connection
  testApiConnection();
});

// Test the API connection on startup
async function testApiConnection() {
  try {
    debugLog('Testing API connection to:', API_BASE_URL);
    const response = await fetch(`${API_BASE_URL}/health`);
    
    if (response.ok) {
      const data = await response.json();
      debugLog('API connection successful:', data);
    } else {
      debugLog('API connection failed. Status:', response.status);
    }
  } catch (error) {
    debugLog('API connection error:', error);
  }
}

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  debugLog('Received message:', message);
  
  // Handle product data extracted from content script
  if (message.action === 'PRODUCT_DATA_EXTRACTED') {
    handleExtractedProductData(message.data);
    sendResponse({ success: true, message: 'Product data received' });
  }
  
  // Handle get pricing data request from popup
  else if (message.action === 'GET_PRICE_COMPARISON') {
    debugLog('Get price comparison requested for:', message.productData?.title);
    
    getPriceComparison(message.productData)
      .then(data => {
        debugLog('Price comparison fetched successfully');
        sendResponse({ success: true, data });
      })
      .catch(error => {
        debugLog('Error getting price comparison:', error);
        sendResponse({ success: false, error: error.message });
      });
    
    return true; // Indicates async response
  }
  
  // Handle clear cache request
  else if (message.action === 'CLEAR_CACHE') {
    chrome.storage.local.remove(['productCache'], () => {
      debugLog('Cache cleared');
      sendResponse({ success: true });
    });
    return true; // Indicates async response
  }
  
  // Handle settings update
  else if (message.action === 'UPDATE_SETTINGS') {
    chrome.storage.local.set({ settings: message.settings }, () => {
      debugLog('Settings updated');
      sendResponse({ success: true });
    });
    return true; // Indicates async response
  }
  
  // Handle ping request (for testing connectivity)
  else if (message.action === 'PING') {
    debugLog('Ping received from:', sender.tab?.url || 'popup');
    sendResponse({ pong: true, timestamp: Date.now() });
  }
  
  return true; // Keep message channel open for async responses
});

// Store extracted product data temporarily
function handleExtractedProductData(productData: ProductData): void {
  debugLog('Storing extracted product data:', productData.title);
  chrome.storage.local.set({ currentProduct: productData });
}

// Get price comparison data for a product
async function getPriceComparison(productData: ProductData): Promise<ProductComparison> {
  debugLog('Getting price comparison for:', productData.title);
  
  // First check if we have a cached result
  try {
    const cacheKey = generateCacheKey(productData);
    const cachedResult = await getCachedComparison(cacheKey);
    
    if (cachedResult) {
      debugLog('Cache hit for:', productData.title);
      return cachedResult;
    }
    
    debugLog('No cache hit, fetching from API');
    
    // No cache hit, fetch from API
    const matchedProducts = await fetchProductMatches(productData);
    
    // Calculate profit for each matched product
    calculateProfitMargins(productData, matchedProducts);
    
    // Create the comparison result
    const comparisonResult: ProductComparison = {
      sourceProduct: productData,
      matchedProducts,
      timestamp: Date.now()
    };
    
    // Cache the result
    await cacheComparisonResult(cacheKey, comparisonResult);
    
    return comparisonResult;
  } catch (error) {
    debugLog('Error getting price comparison:', error);
    throw error;
  }
}

// Generate a cache key for a product
function generateCacheKey(productData: ProductData): string {
  const identifier = productData.upc || productData.asin || productData.productId;
  return `${productData.marketplace}-${identifier}`;
}

// Get cached comparison result if available
async function getCachedComparison(cacheKey: string): Promise<ProductComparison | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['productCache', 'settings'], (result) => {
      const cache = result.productCache || {};
      const settings = result.settings || {};
      const cacheExpiration = (settings.cacheExpiration || 24) * 60 * 60 * 1000; // Convert hours to ms
      
      if (cache[cacheKey]) {
        const cachedItem = cache[cacheKey];
        const now = Date.now();
        
        // Check if cache is still valid
        if (now - cachedItem.timestamp < cacheExpiration) {
          debugLog('Valid cache found for key:', cacheKey);
          resolve(cachedItem);
          return;
        } else {
          debugLog('Cache expired for key:', cacheKey);
        }
      } else {
        debugLog('No cache found for key:', cacheKey);
      }
      
      resolve(null);
    });
  });
}

// Cache comparison result
async function cacheComparisonResult(cacheKey: string, comparisonResult: ProductComparison): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['productCache'], (result) => {
      const cache = result.productCache || {};
      
      // Add new item to cache
      cache[cacheKey] = comparisonResult;
      
      // Save updated cache
      chrome.storage.local.set({ productCache: cache }, () => {
        debugLog('Cached comparison result for key:', cacheKey);
        resolve();
      });
    });
  });
}

// Fetch matching products from all marketplaces
async function fetchProductMatches(productData: ProductData): Promise<{
  amazon?: ProductMatchResult[];
  walmart?: ProductMatchResult[];
  target?: ProductMatchResult[];
}> {
  try {
    debugLog('Fetching product matches for:', productData.title);
    
    // Get backend URL from settings
    const settings = await getSettings();
    const apiBaseUrl = settings.apiBaseUrl || API_BASE_URL;
    
    debugLog('Using API URL:', apiBaseUrl);
    
    // Create request body
    const requestData = {
      source_marketplace: productData.marketplace,
      product_id: productData.upc || productData.asin || productData.productId,
      product_title: productData.title,
      product_brand: productData.brand
    };
    
    debugLog('API request data:', requestData);
    
    // Make API request
    const response = await fetch(`${apiBaseUrl}/search/multi`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });
    
    debugLog('API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    debugLog('API response data:', result);
    
    return result.data;
  } catch (error) {
    debugLog('Error fetching product matches:', error);
    throw error;
  }
}

// Calculate profit margins for matched products
function calculateProfitMargins(
  sourceProduct: ProductData,
  matchedProducts: {
    amazon?: ProductMatchResult[];
    walmart?: ProductMatchResult[];
    target?: ProductMatchResult[];
  }
): void {
  // Skip if source product has no price
  if (sourceProduct.price === null) {
    debugLog('Source product has no price, skipping profit calculation');
    return;
  }
  
  // Get settings for fee calculations
  chrome.storage.local.get(['settings'], (result) => {
    const settings = result.settings || {};
    const includeFees = settings.includeFees !== false; // Default to true
    const estimatedFees = settings.estimatedFees || {
      amazon: 0.15,
      walmart: 0.12,
      target: 0.10
    };
    
    debugLog('Calculating profit margins with settings:', 
             { includeFees, estimatedFees });
    
    // Calculate for each marketplace
    Object.keys(matchedProducts).forEach(marketplace => {
      const products = matchedProducts[marketplace as keyof typeof matchedProducts];
      
      if (!products) return;
      
      products.forEach(product => {
        if (product.price === null) {
          product.profit = {
            amount: 0,
            percentage: 0
          };
          return;
        }
        
        let sellPrice = product.price;
        
        // Apply estimated fees if enabled
        if (includeFees && estimatedFees[marketplace as keyof typeof estimatedFees]) {
          const feePercentage = estimatedFees[marketplace as keyof typeof estimatedFees];
          sellPrice = sellPrice * (1 - feePercentage);
          debugLog(`Applied ${marketplace} fee of ${feePercentage * 100}%`);
        }
        
        const profitAmount = sellPrice - sourceProduct.price!;
        const profitPercentage = (profitAmount / sourceProduct.price!) * 100;
        
        product.profit = {
          amount: parseFloat(profitAmount.toFixed(2)),
          percentage: parseFloat(profitPercentage.toFixed(2))
        };
        
        debugLog(`Calculated profit for ${product.title}: $${profitAmount.toFixed(2)} (${profitPercentage.toFixed(2)}%)`);
      });
    });
  });
}

// Helper to get settings
async function getSettings(): Promise<any> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['settings'], (result) => {
      resolve(result.settings || {});
    });
  });
}

// Initial API test on script load
setTimeout(() => {
  testApiConnection();
}, 2000);

debugLog('Background script initialization complete');
