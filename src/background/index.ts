// src/background/index.ts - Main background script entry point

import { ProductData, ProductComparison } from '../types';
import { MarketplaceApi } from './api/marketplaceApi';
import { CacheService } from './services/cacheService';
import { ProfitService } from './services/profitService';
import { initializeSettings, getSettings, loadSettings, saveSettings } from './services/settingsService';
import { AuthService } from './services/authService';
import { createLogger } from './utils/logger';
import { handleError } from './utils/errorHandler';

// Initialize logger
const logger = createLogger('Background');

// Initialize the extension
chrome.runtime.onInstalled.addListener(async () => {
  logger.info('Extension installed or updated');
  
  // Initialize settings
  await initializeSettings();
  
  // Initialize current product as null to avoid undefined issues
  chrome.storage.local.set({ currentProduct: null }, () => {
    logger.info('Initialized currentProduct as null');
  });

  // Initialize AuthService
  await AuthService.initialize();
});

// Also initialize when the extension starts
chrome.runtime.onStartup.addListener(async () => {
  logger.info('Extension started');
  
  // Initialize settings
  await loadSettings();
  
  // Initialize AuthService
  await AuthService.initialize();
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  logger.info('Received message:', message);
  
  // Handle product data extracted from content script
  if (message.action === 'PRODUCT_DATA_EXTRACTED') {
    handleExtractedProductData(message.data)
      .then(() => sendResponse({ success: true, message: 'Product data received and stored' }))
      .catch(error => sendResponse(handleError(error, 'handling extracted product data')));
    return true; // Keep the message channel open for async response
  }
  
  // Handle get pricing data request from popup
  else if (message.action === 'GET_PRICE_COMPARISON') {
    logger.info('Getting price comparison for:', message.productData);
    
    // First ensure we have the latest settings
    loadSettings()
      .then(() => {
        return getPriceComparison(message.productData);
      })
      .then(data => {
        logger.info('Got price comparison data');
        logger.debug('Price comparison data details:', data);
        sendResponse({ success: true, data });
      })
      .catch(error => {
        sendResponse(handleError(error, 'getting price comparison'));
      });
    
    return true; // Indicates async response
  }
  
  // Handle clear cache request
  else if (message.action === 'CLEAR_CACHE') {
    CacheService.clear()
      .then(() => {
        logger.info('Cache cleared');
        sendResponse({ success: true });
      })
      .catch(error => {
        sendResponse(handleError(error, 'clearing cache'));
      });
    
    return true; // Indicates async response
  }
  
  // Handle settings update
  else if (message.action === 'UPDATE_SETTINGS') {
    saveSettings(message.settings)
      .then(() => {
        logger.info('Settings updated:', message.settings);
        sendResponse({ success: true });
      })
      .catch(error => {
        sendResponse(handleError(error, 'updating settings'));
      });
    
    return true; // Indicates async response
  }

  // Handle API key validation
  else if (message.action === 'VALIDATE_API_KEY') {
    AuthService.verifyAndSaveApiKey(message.apiKey)
      .then((result) => {
        logger.info('API key validation result:', result);
        sendResponse({ success: result.valid, user: result.user });
      })
      .catch(error => {
        sendResponse(handleError(error, 'validating API key'));
      });
    
    return true; // Indicates async response
  }
  
  // Handle get credits balance
  else if (message.action === 'GET_CREDITS_BALANCE') {
    AuthService.getCreditsBalance()
      .then((balance) => {
        logger.info('Credits balance:', balance);
        sendResponse({ success: true, balance });
      })
      .catch(error => {
        sendResponse(handleError(error, 'getting credits balance'));
      });
    
    return true; // Indicates async response
  }
  
  // Handle logout
  else if (message.action === 'LOGOUT') {
    AuthService.logout()
      .then(() => {
        logger.info('User logged out');
        sendResponse({ success: true });
      })
      .catch(error => {
        sendResponse(handleError(error, 'logging out'));
      });
    
    return true; // Indicates async response
  }
  
  // If no handler matched, log a warning
  logger.warn('No handler for message action:', message.action);
  return false;
});

/**
 * Store extracted product data temporarily
 * 
 * @param productData - Extracted product data
 */
async function handleExtractedProductData(productData: ProductData): Promise<void> {
  logger.info('Storing product data:', productData);
  
  return new Promise<void>((resolve, reject) => {
    chrome.storage.local.set({ currentProduct: productData }, () => {
      if (chrome.runtime.lastError) {
        const error = chrome.runtime.lastError;
        logger.error('Error storing product data:', error);
        reject(error);
      } else {
        logger.info('Product data stored successfully');
        resolve();
      }
    });
  });
}

/**
 * Calculate required credits based on marketplaces to search
 * 
 * @param productData - Product data
 * @param settings - User settings
 * @returns Number of credits required
 */
function calculateRequiredCredits(productData: ProductData, settings: any): number {
  if (settings.selectedMarketplace) {
    // If a specific marketplace is selected, it's just 1 credit
    return 1;
  } else {
    // If searching all marketplaces, count how many we'll search (excluding source marketplace)
    // Only include Amazon and Walmart as resellable marketplaces
    const allMarketplaces = ['amazon', 'walmart'];
    const searchableMarketplaces = allMarketplaces.filter(
      marketplace => marketplace !== productData.marketplace
    );
    return searchableMarketplaces.length;
  }
}

/**
 * Get price comparison data for a product
 * 
 * @param productData - Product to compare
 * @returns Comparison data with matching products
 */
async function getPriceComparison(productData: ProductData): Promise<ProductComparison> {
  try {
    logger.info('Attempting to get price comparison for:', productData);
    
    if (!productData) {
      throw new Error('No product data provided');
    }
    
    // Check if the user is authenticated
    const isAuthenticated = await AuthService.isAuthenticated();
    if (!isAuthenticated) {
      throw new Error('Authentication required. Please enter your API key in the settings.');
    }
    
    // Load current settings (ensures we have the latest)
    const settings = await loadSettings();
    logger.info('Using settings:', settings);
    
    // Calculate required credits based on marketplaces to search
    const requiredCredits = calculateRequiredCredits(productData, settings);
    logger.info(`Required credits for this search: ${requiredCredits}`);
    
    // Check if the user has enough credits for this operation
    const creditCheck = await AuthService.checkCredits(requiredCredits);
    if (!creditCheck.sufficient) {
      throw {
        message: 'Insufficient credits to perform this operation',
        insufficientCredits: true,
        balance: creditCheck.balance
      };
    }
    
    // Check if the current product is from the selected marketplace
    if (settings.selectedMarketplace && productData.marketplace === settings.selectedMarketplace) {
      logger.info('Current product is from the selected marketplace. No search needed.');
      // Return empty comparison when the product is from the selected marketplace
      return {
        sourceProduct: productData,
        matchedProducts: {},
        timestamp: Date.now()
      };
    }
    
    // Generate a cache key that includes the selected marketplace setting
    const marketplaceSuffix = settings.selectedMarketplace ? `-${settings.selectedMarketplace}` : '';
    const cacheKey = CacheService.generateProductCacheKey(productData) + marketplaceSuffix;
    logger.info('Generated cache key:', cacheKey);
    
    // Check cache first
    const cachedResult = await CacheService.get<ProductComparison>(cacheKey);
    
    if (cachedResult) {
      logger.info('Found cached comparison result');
      return cachedResult;
    }
    
    logger.info('No cache hit, fetching fresh data');
    
    // Fetch from API
    logger.info('Fetching product matches from API');
    const response = await MarketplaceApi.searchAcrossMarketplaces(productData);
    
    if (!response.success) {
      throw new Error(response.error || 'API request failed');
    }
    
    const matchedProducts = response.data || {};
    
    // Calculate profit for each matched product
    const productsWithProfit = ProfitService.calculateProfitMargins(
      productData,
      matchedProducts
    );
    
    // Create the comparison result
    const comparisonResult: ProductComparison = {
      sourceProduct: productData,
      matchedProducts: productsWithProfit,
      timestamp: Date.now()
    };
    
    // Cache the result
    await CacheService.set(cacheKey, comparisonResult);
    
    // Record usage of credits for this operation
    await AuthService.useCredits(requiredCredits, `Price comparison for ${productData.title}`, {
      product_id: productData.productId,
      marketplace: productData.marketplace,
      selected_marketplace: settings.selectedMarketplace || 'all',
      credits_used: requiredCredits,
      operation: 'price_comparison'
    });
    
    logger.info('Returning comparison result');
    logger.debug('Comparison result details:', comparisonResult);
    
    return comparisonResult;
  } catch (error) {
    logger.error('Error getting price comparison:', error);
    throw error;
  }
}
