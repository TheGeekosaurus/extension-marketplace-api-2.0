// background.ts - Handles API communication and caching

// Configuration
const API_BASE_URL = 'https://extension-marketplace-api-2-0-1.onrender.com';

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
  console.log('E-commerce Arbitrage Extension installed');
  
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
  });
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle product data extracted from content script
  if (message.action === 'PRODUCT_DATA_EXTRACTED') {
    handleExtractedProductData(message.data);
    sendResponse({ success: true });
  }
  
  // Handle get pricing data request from popup
  else if (message.action === 'GET_PRICE_COMPARISON') {
    getPriceComparison(message.productData)
      .then(data => sendResponse({ success: true, data }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Indicates async response
  }
  
  // Handle clear cache request
  else if (message.action === 'CLEAR_CACHE') {
    chrome.storage.local.remove(['productCache'], () => {
      sendResponse({ success: true });
    });
    return true; // Indicates async response
  }
  
  // Handle settings update
  else if (message.action === 'UPDATE_SETTINGS') {
    chrome.storage.local.set({ settings: message.settings }, () => {
      sendResponse({ success: true });
    });
    return true; // Indicates async response
  }
});

// Store extracted product data temporarily
function handleExtractedProductData(productData: ProductData): void {
  chrome.storage.local.set({ currentProduct: productData });
}

// Get price comparison data for a product
async function getPriceComparison(productData: ProductData): Promise<ProductComparison> {
  // First check if we have a cached result
  try {
    const cacheKey = generateCacheKey(productData);
    const cachedResult = await getCachedComparison(cacheKey);
    
    if (cachedResult) {
      return cachedResult;
    }
    
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
    console.error('Error getting price comparison:', error);
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
          resolve(cachedItem);
          return;
        }
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
    
    // Create request body
    const requestData = {
      source_marketplace: productData.marketplace,
      product_id: productData.upc || productData.asin || productData.productId,
      product_title: productData.title,
      product_brand: productData.brand
    };
    
    // Make API request
    const response = await fetch(`${apiBaseUrl}/search/multi`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const result = await response.json();
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
  // Skip if source product has no price
  if (sourceProduct.price === null) {
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
