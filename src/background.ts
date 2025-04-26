// background.ts - Handles API communication and caching

// Configuration
const API_BASE_URL = 'https://extension-marketplace-api-2-0-1.onrender.com/api';

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
  console.log('[E-commerce Arbitrage Background] Extension installed or updated');
  
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
    console.log('[E-commerce Arbitrage Background] Default settings saved');
  });
  
  // Initialize currentProduct as null to avoid undefined issues
  chrome.storage.local.set({ currentProduct: null }, () => {
    console.log('[E-commerce Arbitrage Background] Initialized currentProduct as null');
  });
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[E-commerce Arbitrage Background] Received message:', message);
  
  // Handle product data extracted from content script
  if (message.action === 'PRODUCT_DATA_EXTRACTED') {
    handleExtractedProductData(message.data);
    sendResponse({ success: true, message: 'Product data received and stored' });
    return true; // Keep the message channel open for async response
  }
  
  // Handle get pricing data request from popup
  else if (message.action === 'GET_PRICE_COMPARISON') {
    console.log('[E-commerce Arbitrage Background] Getting price comparison for:', message.productData);
    getPriceComparison(message.productData)
      .then(data => {
        console.log('[E-commerce Arbitrage Background] Got price comparison data:', data);
        sendResponse({ success: true, data });
      })
      .catch(error => {
        console.error('Error getting price comparison:', error);
        sendResponse({ 
          success: false, 
          error: error.message,
          errorDetails: error.toString()
        });
      });
    return true; // Indicates async response
  }
  
  // Handle clear cache request
  else if (message.action === 'CLEAR_CACHE') {
    chrome.storage.local.remove(['productCache'], () => {
      console.log('[E-commerce Arbitrage Background] Cache cleared');
      sendResponse({ success: true });
    });
    return true; // Indicates async response
  }
  
  // Handle settings update
  else if (message.action === 'UPDATE_SETTINGS') {
    chrome.storage.local.set({ settings: message.settings }, () => {
      console.log('[E-commerce Arbitrage Background] Settings updated:', message.settings);
      sendResponse({ success: true });
    });
    return true; // Indicates async response
  }
  
  // If no handler matched, log a warning
  console.log('[E-commerce Arbitrage Background] No handler for message action:', message.action);
  return false;
});

// Store extracted product data temporarily
function handleExtractedProductData(productData: ProductData): void {
  console.log('[E-commerce Arbitrage Background] Storing product data:', productData);
  chrome.storage.local.set({ currentProduct: productData }, () => {
    if (chrome.runtime.lastError) {
      console.error('Error storing product data:', chrome.runtime.lastError);
    } else {
      console.log('[E-commerce Arbitrage Background] Product data stored successfully');
    }
  });
}

// Get price comparison data for a product
async function getPriceComparison(productData: ProductData): Promise<ProductComparison> {
  // First check if we have a cached result
  try {
    console.log('[E-commerce Arbitrage Background] Attempting to get price comparison for:', productData);
    
    if (!productData) {
      throw new Error('No product data provided');
    }
    
    const cacheKey = generateCacheKey(productData);
    console.log('[E-commerce Arbitrage Background] Generated cache key:', cacheKey);
    
    const cachedResult = await getCachedComparison(cacheKey);
    
    if (cachedResult) {
      console.log('[E-commerce Arbitrage Background] Found cached comparison result');
      return cachedResult;
    }
    
    console.log('[E-commerce Arbitrage Background] No cache hit, fetching from API');
    
    // Mock data for testing when API server is unavailable
    // Remove this in production or when API is working
    const useMockData = true;
    
    let matchedProducts;
    if (useMockData) {
      console.log('[E-commerce Arbitrage Background] Using mock data instead of API call');
      matchedProducts = generateMockProductMatches(productData);
    } else {
      // No cache hit, fetch from API
      matchedProducts = await fetchProductMatches(productData);
    }
    
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
    
    console.log('[E-commerce Arbitrage Background] Returning comparison result:', comparisonResult);
    return comparisonResult;
  } catch (error) {
    console.error('Error getting price comparison:', error);
    throw error;
  }
}

// Generate mock product matches for testing
function generateMockProductMatches(productData: ProductData): {
  amazon?: ProductMatchResult[];
  walmart?: ProductMatchResult[];
  target?: ProductMatchResult[];
} {
  const result: {
    amazon?: ProductMatchResult[];
    walmart?: ProductMatchResult[];
    target?: ProductMatchResult[];
  } = {};
  
  // Don't create mock matches for the source marketplace
  if (productData.marketplace !== 'amazon') {
    result.amazon = [{
      title: `${productData.title} - Amazon Version`,
      price: productData.price ? productData.price * 1.2 : 19.99, // 20% higher price for profit
      image: productData.imageUrl,
      url: `https://amazon.com/dp/B07XYZABC`,
      marketplace: 'amazon',
      asin: 'B07XYZABC',
      ratings: {
        average: 4.5,
        count: 128
      }
    }];
  }
  
  if (productData.marketplace !== 'walmart') {
    result.walmart = [{
      title: `${productData.title} - Walmart Version`,
      price: productData.price ? productData.price * 0.9 : 15.99, // 10% lower price
      image: productData.imageUrl,
      url: `https://walmart.com/ip/12345`,
      marketplace: 'walmart',
      item_id: '12345',
      ratings: {
        average: 4.2,
        count: 87
      }
    }];
  }
  
  if (productData.marketplace !== 'target') {
    result.target = [{
      title: `${productData.title} - Target Version`,
      price: productData.price ? productData.price * 1.1 : 17.99, // 10% higher price
      image: productData.imageUrl,
      url: `https://target.com/p/item/-/A-12345`,
      marketplace: 'target',
      ratings: {
        average: 4.0,
        count: 63
      }
    }];
  }
  
  return result;
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
      console.log('[E-commerce Arbitrage Background] Got from storage:', { cache: result.productCache ? 'exists' : 'not found', settings: result.settings });
      
      const cache = result.productCache || {};
      const settings = result.settings || {};
      const cacheExpiration = (settings.cacheExpiration || 24) * 60 * 60 * 1000; // Convert hours to ms
      
      if (cache[cacheKey]) {
        const cachedItem = cache[cacheKey];
        const now = Date.now();
        
        // Check if cache is still valid
        if (now - cachedItem.timestamp < cacheExpiration) {
          console.log('[E-commerce Arbitrage Background] Using valid cached item');
          resolve(cachedItem);
          return;
        } else {
          console.log('[E-commerce Arbitrage Background] Cache expired');
        }
      }
      
      console.log('[E-commerce Arbitrage Background] No valid cache found');
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
        console.log('[E-commerce Arbitrage Background] Saved comparison result to cache');
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
    // Get backend URL from settings
    const settings = await getSettings();
    const apiBaseUrl = settings.apiBaseUrl || API_BASE_URL;
    
    console.log('[E-commerce Arbitrage Background] Using API base URL:', apiBaseUrl);
    
    // Create request body
    const requestData = {
      source_marketplace: productData.marketplace,
      product_id: productData.upc || productData.asin || productData.productId,
      product_title: productData.title,
      product_brand: productData.brand
    };
    
    console.log('[E-commerce Arbitrage Background] Sending API request with data:', requestData);
    
    // Make API request
    const response = await fetch(`${apiBaseUrl}/search/multi`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log('[E-commerce Arbitrage Background] Received API response:', result);
    
    return result.data;
  } catch (error) {
    console.error('Error fetching product matches:', error);
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
  console.log('[E-commerce Arbitrage Background] Calculating profit margins');
  
  // Skip if source product has no price
  if (sourceProduct.price === null) {
    console.log('[E-commerce Arbitrage Background] Source product has no price, skipping profit calculation');
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
    
    console.log('[E-commerce Arbitrage Background] Using fee settings:', { includeFees, estimatedFees });
    
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
        }
        
        const profitAmount = sellPrice - sourceProduct.price!;
        const profitPercentage = (profitAmount / sourceProduct.price!) * 100;
        
        product.profit = {
          amount: parseFloat(profitAmount.toFixed(2)),
          percentage: parseFloat(profitPercentage.toFixed(2))
        };
        
        console.log(`[E-commerce Arbitrage Background] Calculated profit for ${marketplace} product:`, product.profit);
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
