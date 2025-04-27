// src/background/index.ts - Main background script entry point

import { ProductData, ProductComparison } from '../types';
import { MarketplaceApi } from './api/marketplaceApi';
import { CacheService } from './services/cacheService';
import { MockService } from './services/mockService';
import { ProfitService } from './services/profitService';
import { initializeSettings, getSettings, saveSettings } from './services/settingsService';
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
    
    getPriceComparison(message.productData)
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
    
    const cacheKey = CacheService.generateProductCacheKey(productData);
    logger.info('Generated cache key:', cacheKey);
    
    // Check cache first
    const cachedResult = await CacheService.get<ProductComparison>(cacheKey);
    
    if (cachedResult) {
      logger.info('Found cached comparison result');
      return cachedResult;
    }
    
    logger.info('No cache hit, fetching fresh data');
    
    // Determine if we should use mock data
    const settings = getSettings();
    const useMockData = settings.useMockData || false;
    
    let matchedProducts;
    if (useMockData) {
      logger.info('Using mock data instead of API call');
      matchedProducts = MockService.generateEnhancedMockMatches(productData);
    } else {
      // No cache hit, fetch from API
      logger.info('Fetching product matches from API');
      const response = await MarketplaceApi.searchAcrossMarketplaces(productData);
      
      if (!response.success) {
        throw new Error(response.error || 'API request failed');
      }
      
      matchedProducts = response.data || {};
    }
    
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
    
    logger.info('Returning comparison result');
    logger.debug('Comparison result details:', comparisonResult);
    
    return comparisonResult;
  } catch (error) {
    logger.error('Error getting price comparison:', error);
    throw error;
  }
}
