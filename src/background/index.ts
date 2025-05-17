// src/background/index.ts - Main background script entry point

import { ProductData, ProductComparison, MarketplaceType, ApiResponse, ProductMatchResult } from '../types';
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
  logger.info('AuthService initialized');
});

// Also initialize when the extension starts
chrome.runtime.onStartup.addListener(async () => {
  logger.info('Extension started');
  
  // Initialize settings
  await loadSettings();
  
  // Initialize AuthService
  await AuthService.initialize();
  logger.info('AuthService initialized on startup');
  
  // Initialize direct marketplace APIs if enabled
  const settings = getSettings();
  if (settings.useDirectApis) {
    logger.info('Initializing direct marketplace APIs');
    try {
      // Import dynamically to avoid circular dependencies
      const { initializeDirectApis } = await import('./services/settingsService');
      initializeDirectApis(settings);
      logger.info('Direct marketplace APIs initialized');
    } catch (error) {
      logger.error('Error initializing direct marketplace APIs:', error);
    }
  }
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
    logger.info('Validating API key:', message.apiKey ? 'API key provided' : 'No API key');
    AuthService.verifyAndSaveApiKey(message.apiKey)
      .then((result) => {
        logger.info('API key validation result:', result);
        sendResponse({ success: result.valid, user: result.user });
      })
      .catch(error => {
        logger.error('API key validation error:', error);
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

  // Handle manual match selection
  else if (message.action === 'MANUAL_MATCH_SELECTED') {
    logger.info('Manual match selected:', message.match);
    
    // Get the current product from storage
    chrome.storage.local.get(['manualMatchSourceProduct'], (result) => {
      const sourceProduct = result.manualMatchSourceProduct;
      
      if (sourceProduct) {
        // Get settings for fee calculations
        chrome.storage.local.get(['settings'], (settingsResult) => {
          const settings = settingsResult.settings;
          
          // Initialize profit values
          let profit = 0;
          let profitPercentage = 0;
          
          // Calculate profit if source product has a price
          if (sourceProduct.price !== null) {
            profit = message.match.price - sourceProduct.price;
            profitPercentage = ((message.match.price - sourceProduct.price) / sourceProduct.price) * 100;
          }
          
          // Create fee breakdown if settings include fees
          let feeBreakdown = null;
          
          if (settings && settings.includeFees) {
            // Type safety for marketplace
            const marketplace = message.match.marketplace as keyof typeof settings.estimatedFees;
            const feePercentage = settings.estimatedFees[marketplace] || 0;
            const marketplaceFeeAmount = message.match.price * feePercentage;
            const additionalFees = settings.additionalFees || 0;
            const totalFees = marketplaceFeeAmount + additionalFees;
            
            // Recalculate profit with fees if price is available
            if (sourceProduct.price !== null) {
              profit = message.match.price - sourceProduct.price - totalFees;
              profitPercentage = (profit / sourceProduct.price) * 100;
            }
            
            feeBreakdown = {
              marketplace_fee_percentage: feePercentage,
              marketplace_fee_amount: parseFloat(marketplaceFeeAmount.toFixed(2)),
              additional_fees: parseFloat(additionalFees.toFixed(2)),
              total_fees: parseFloat(totalFees.toFixed(2))
            };
          }
          
          // Create comparison object
          const comparison = {
            sourceProduct: sourceProduct,
            matchedProducts: {
              [message.match.marketplace]: [
                {
                  title: message.match.title,
                  price: message.match.price,
                  image: message.match.imageUrl,
                  url: message.match.url,
                  marketplace: message.match.marketplace,
                  similarity: message.match.similarityScore,
                  // Add calculated profit
                  profit: {
                    amount: parseFloat(profit.toFixed(2)),
                    percentage: parseFloat(profitPercentage.toFixed(2))
                  },
                  // Add fee breakdown if available
                  fee_breakdown: feeBreakdown
                }
              ]
            },
            timestamp: Date.now(),
            manualMatch: true,
            searchUrl: message.match.searchUrl
          };
          
          // Store the comparison result
          chrome.storage.local.set({ comparison }, () => {
            logger.info('Stored manual comparison result with fee calculations');
          });
        });
      }
    });
    
    sendResponse({ success: true });
    return true; // Indicates async response
  }

  // NEW: Handle Home Depot product GraphQL API request
  else if (message.action === 'HD_FETCH_PRODUCT_API') {
    fetchHomeDepotProductData(message)
      .then(data => {
        sendResponse({ success: true, data });
      })
      .catch(error => {
        sendResponse(handleError(error, 'fetching Home Depot product data'));
      });
    
    return true; // Indicates async response
  }
  
  // Handle category batch processing
  else if (message.action === 'PROCESS_CATEGORY_BATCH') {
    logger.info(`Received PROCESS_CATEGORY_BATCH request with ${message.batch.length} products`);
    
    // Log the first product in the batch to help diagnose issues
    if (message.batch.length > 0) {
      logger.info('First product in batch:', message.batch[0]);
    }
    
    processCategoryBatch(message.batch, message.targetMarketplace)
      .then(comparisons => {
        logger.info(`Processed ${comparisons.length} products from category batch`);
        
        // Log the first comparison if available
        if (comparisons.length > 0) {
          logger.info('First comparison result:', comparisons[0]);
        }
        
        sendResponse({ success: true, comparisons });
      })
      .catch(error => {
        logger.error('Error in processCategoryBatch:', error);
        sendResponse(handleError(error, 'processing category batch'));
      });
    
    return true; // Indicates async response
  }
  
  // Handle opening category results in popup
  else if (message.action === 'OPEN_CATEGORY_RESULTS') {
    // Create a popup notification for the user
    chrome.action.setBadgeText({ text: 'NEW' });
    chrome.action.setBadgeBackgroundColor({ color: '#4a6bd8' });
    
    // Open the popup
    chrome.action.openPopup();
    
    sendResponse({ success: true });
    return true;
  }
  
  // Handle category processing complete notification
  else if (message.action === 'CATEGORY_PROCESSING_COMPLETE') {
    // Create a popup notification for the user
    chrome.action.setBadgeText({ text: 'DONE' });
    chrome.action.setBadgeBackgroundColor({ color: '#27ae60' });
    
    // Clear the badge after 10 seconds
    setTimeout(() => {
      chrome.action.setBadgeText({ text: '' });
    }, 10000);
    
    sendResponse({ success: true });
    return true;
  }
  
  // Handle direct Walmart API search request
  else if (message.action === 'SEARCH_WITH_DIRECT_WALMART_API') {
    logger.info('Received request to search with direct Walmart API');
    
    if (!message.productData) {
      sendResponse({
        success: false,
        error: 'No product data provided'
      });
      return true;
    }
    
    // First ensure we have the latest settings
    loadSettings()
      .then(settings => {
        if (!settings.walmartApiConfig) {
          sendResponse({
            success: false,
            error: 'Walmart API is not configured. Please configure it in settings first.'
          });
          return;
        }
        
        // Import dynamically to avoid circular dependencies
        const { WalmartApi } = require('./api/walmartApi');
        
        // Configure the Walmart API
        try {
          WalmartApi.configure(settings.walmartApiConfig);
          logger.info('Walmart API configured for direct search');
        } catch (configError) {
          logger.error('Error configuring Walmart API:', configError);
          sendResponse({
            success: false,
            error: `Configuration error: ${configError instanceof Error ? configError.message : String(configError)}`
          });
          return;
        }
        
        // Build the search query
        const searchQuery = message.productData.brand 
          ? `${message.productData.brand} ${message.productData.title}`
          : message.productData.title;
        
        logger.info(`Starting direct Walmart API search for: ${searchQuery}`);
        
        // Use UPC if available, otherwise search by query
        const searchPromise = message.productData.upc
          ? WalmartApi.getProductByUpcDirectApi(message.productData.upc)
          : WalmartApi.searchByQuery(searchQuery);
        
        searchPromise
          .then((result: ApiResponse<ProductMatchResult[]>) => {
            logger.info('Direct Walmart API search completed:', result.success);
            if (result.success) {
              logger.debug('Search result data:', result.data);
            } else {
              logger.error('Search failed:', result.error);
            }
            sendResponse(result);
          })
          .catch((error: unknown) => {
            logger.error('Error in direct Walmart API search:', error);
            sendResponse({
              success: false,
              error: `Search error: ${error instanceof Error ? error.message : String(error)}`
            });
          });
      })
      .catch(error => {
        logger.error('Error loading settings for direct Walmart API search:', error);
        sendResponse({
          success: false,
          error: `Settings error: ${error instanceof Error ? error.message : String(error)}`
        });
      });
    
    return true; // Indicates async response
  }
  
  // Handle Walmart API test connection request
  else if (message.action === 'TEST_WALMART_API_CONNECTION') {
    logger.info('Testing Walmart API connection');
    
    // First ensure we have the latest settings
    loadSettings()
      .then(settings => {
        if (!settings.useDirectApis) {
          sendResponse({
            success: false,
            error: 'Direct APIs are disabled in settings'
          });
          return;
        }
        
        if (!settings.walmartApiConfig) {
          sendResponse({
            success: false,
            error: 'Walmart API is not configured'
          });
          return;
        }
        
        // Import dynamically to avoid circular dependencies
        const { WalmartApi } = require('./api/walmartApi');
        
        // Ensure API is configured with latest settings
        try {
          WalmartApi.configure(settings.walmartApiConfig);
          logger.info('Walmart API configured for test');
        } catch (configError) {
          logger.error('Error configuring Walmart API for test:', configError);
          sendResponse({
            success: false,
            error: `Configuration error: ${configError instanceof Error ? configError.message : String(configError)}`
          });
          return;
        }
        
        // Test the connection
        WalmartApi.testConnection()
          .then((result: ApiResponse<string>) => {
            logger.info('Walmart API test result:', result);
            sendResponse(result);
          })
          .catch((error: unknown) => {
            logger.error('Error testing Walmart API connection:', error);
            sendResponse({
              success: false,
              error: `Test error: ${error instanceof Error ? error.message : String(error)}`
            });
          });
      })
      .catch((error: unknown) => {
        logger.error('Error loading settings for Walmart API test:', error);
        sendResponse({
          success: false,
          error: `Settings error: ${error instanceof Error ? error.message : String(error)}`
        });
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

/**
 * Process a batch of products from a category page
 * 
 * @param batch - Array of products to process
 * @param targetMarketplace - Target marketplace to search for matches
 * @returns Array of product comparisons
 */
async function processCategoryBatch(
  batch: ProductData[], 
  targetMarketplace: MarketplaceType = 'walmart'
): Promise<ProductComparison[]> {
  try {
    logger.info(`Processing category batch of ${batch.length} products for ${targetMarketplace}`);
    
    // Check if the user is authenticated
    const isAuthenticated = await AuthService.isAuthenticated();
    if (!isAuthenticated) {
      throw new Error('Authentication required. Please enter your API key in the settings.');
    }
    
    // Load current settings
    const settings = await loadSettings();
    
    // Calculate required credits (1 credit per product per marketplace)
    const requiredCredits = batch.length;
    logger.info(`Required credits for batch processing: ${requiredCredits}`);
    
    // Check if the user has enough credits
    const creditCheck = await AuthService.checkCredits(requiredCredits);
    if (!creditCheck.sufficient) {
      throw {
        message: 'Insufficient credits to process this batch',
        insufficientCredits: true,
        balance: creditCheck.balance
      };
    }
    
    // Process each product in the batch sequentially
    const comparisons: ProductComparison[] = [];
    
    for (const product of batch) {
      try {
        // Only search on the target marketplace
        // Override the settings temporarily
        const tempSettings = { ...settings, selectedMarketplace: targetMarketplace };
        
        // Generate a cache key specific to this product and target marketplace
        const cacheKey = CacheService.generateProductCacheKey(product) + `-${targetMarketplace}-category`;
        
        // Check cache first
        const cachedResult = await CacheService.get<ProductComparison>(cacheKey);
        
        if (cachedResult) {
          logger.info(`Found cached comparison for ${product.title}`);
          comparisons.push(cachedResult);
          continue;
        }
        
        // Call API to find matches
        logger.info(`Searching for matches for ${product.title} on ${targetMarketplace}`);
        logger.debug(`Product details:`, product);
        
        // First, validate product data has required fields
        if (!product.title) {
          logger.warn(`Skipping product with no title`);
          continue;
        }
        
        const response = await MarketplaceApi.searchSingleMarketplace(
          product,
          targetMarketplace
        );
        
        // Log the response in detail
        logger.debug(`API response for ${product.title}:`, response);
        
        if (!response.success) {
          logger.warn(`API search failed for ${product.title}: ${response.error}`);
          continue;
        }
        
        if (!response.data || response.data.length === 0) {
          logger.info(`No matches found for ${product.title} on ${targetMarketplace}`);
        } else {
          logger.info(`Found ${response.data.length} matches for ${product.title} on ${targetMarketplace}`);
        }
        
        const matchedProducts = { [targetMarketplace]: response.data || [] };
        
        // Calculate profit for each matched product
        const productsWithProfit = ProfitService.calculateProfitMargins(
          product,
          matchedProducts
        );
        
        // Create comparison result
        const comparisonResult: ProductComparison = {
          sourceProduct: product,
          matchedProducts: productsWithProfit,
          timestamp: Date.now()
        };
        
        // Cache the result
        await CacheService.set(cacheKey, comparisonResult);
        
        // Add to results array
        comparisons.push(comparisonResult);
        
      } catch (productError) {
        logger.error(`Error processing product ${product.title}:`, productError);
        // Continue with next product on error
      }
    }
    
    // Record usage of credits
    await AuthService.useCredits(requiredCredits, `Category batch processing (${batch.length} products)`, {
      products_count: batch.length,
      source_marketplace: batch[0]?.marketplace || 'unknown',
      target_marketplace: targetMarketplace,
      credits_used: requiredCredits,
      operation: 'category_batch_processing'
    });
    
    logger.info(`Successfully processed ${comparisons.length} products`);
    return comparisons;
    
  } catch (error) {
    logger.error('Error processing category batch:', error);
    throw error;
  }
}

/**
 * Fetch product data from Home Depot's GraphQL API
 * 
 * @param message - GraphQL request parameters
 * @returns Product data from GraphQL API
 */
async function fetchHomeDepotProductData(message: any): Promise<any> {
  try {
    logger.info('Fetching Home Depot product data from GraphQL API');
    
    const { itemId, storeId, zipCode } = message;
    
    if (!itemId) {
      throw new Error('Item ID is required for Home Depot product data request');
    }
    
    // Construct GraphQL query
    const query = `
      query productClientOnlyProduct($itemId: String!, $storeId: String, $zipCode: String) {
        productClientOnlyProduct(itemId: $itemId) {
          name
          brandName
          identifiers { 
            itemId 
            internetNumber
            modelNumber 
            storeSkuNumber 
            upc 
          }
          pricing(storeId: $storeId) {
            value
            currency
            original
          }
          inventory(storeId: $storeId, zipCode: $zipCode) {
            quantity
            isInStock
            isLimitedQuantity
          }
          media {
            images {
              url
              sizes {
                size
                url
              }
            }
          }
        }
      }
    `;
    
    // Construct variables object
    const variables: any = { itemId: String(itemId) };
    if (storeId) variables.storeId = String(storeId);
    if (zipCode) variables.zipCode = String(zipCode);
    
    // Make the GraphQL request
    const response = await fetch("https://www.homedepot.com/federation-gateway/graphql?opname=productClientOnlyProduct", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({ query, variables })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`Home Depot GraphQL API error: ${response.status} - ${errorText}`);
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    logger.debug('Home Depot GraphQL API response:', result);
    
    // Extract the product data from the response
    const product = result.data?.productClientOnlyProduct;
    
    if (!product) {
      logger.warn('No product data returned from Home Depot GraphQL API');
      return null;
    }
    
    // Extract and transform the data into a simplified format
    const transformedData = {
      name: product.name,
      brandName: product.brandName,
      price: product.pricing?.value,
      originalPrice: product.pricing?.original,
      upc: product.identifiers?.upc,
      internetNumber: product.identifiers?.internetNumber,
      modelNumber: product.identifiers?.modelNumber,
      inventory: {
        quantity: product.inventory?.quantity,
        inStock: product.inventory?.isInStock,
        limitedStock: product.inventory?.isLimitedQuantity
      },
      imageUrl: product.media?.images?.[0]?.url || null
    };
    
    logger.info('Successfully fetched and transformed Home Depot product data');
    return transformedData;
  } catch (error) {
    logger.error('Error fetching Home Depot product data:', error);
    throw error;
  }
}

// Handle manual match found message from search tab
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'MANUAL_MATCH_FOUND' || 
      message.action === 'MANUAL_MATCH_NOT_FOUND' || 
      message.action === 'MANUAL_MATCH_ERROR') {
    
    console.log('[E-commerce Arbitrage] Received manual match result:', message);
    
    // Get the active tab (which should be the original product page)
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs[0]?.id) {
        // Forward the message to the active tab
        chrome.tabs.sendMessage(tabs[0].id, message);
        
        // Close the search tab if we received a result
        if (sender.tab?.id && message.action === 'MANUAL_MATCH_FOUND') {
          chrome.tabs.remove(sender.tab.id);
        }
      }
    });
    
    return true; // Keep the message channel open for async response
  }
});
