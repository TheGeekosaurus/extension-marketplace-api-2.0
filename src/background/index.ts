// src/background/index.ts - Main background script entry point

import { ProductData, ProductComparison, ProductMatchResult } from '../types';
import { MarketplaceApi } from './api/marketplaceApi';
import { CacheService } from './services/cacheService';
import { ProfitService } from './services/profitService';
import { initializeSettings, getSettings, loadSettings, saveSettings } from './services/settingsService';
import { AuthService } from './services/authService';
import { createLogger } from './utils/logger';
import { handleError } from './utils/errorHandler';
import { extractProductFromPage, findBestMatch, fetchPage } from './services/searchService';

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
  
  // Handle background search request
  else if (message.action === 'BACKGROUND_SEARCH') {
    logger.info('Performing background search for:', message.sourceProduct);
    
    performBackgroundSearch(message.sourceProduct, message.searchUrl, message.marketplace)
      .then(result => {
        if (result.match) {
          logger.info('Found match in background search:', result.match);
          sendResponse({ 
            success: true, 
            match: result.match,
            similarity: result.similarity
          });
        } else {
          logger.warn('No good match found in background search');
          sendResponse({ 
            success: false, 
            error: 'No good match found' 
          });
        }
      })
      .catch(error => {
        logger.error('Error in background search:', error);
        sendResponse(handleError(error, 'background search'));
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
                // Calculate profit
                profit: {
                  amount: parseFloat((message.match.price - sourceProduct.price).toFixed(2)),
                  percentage: parseFloat((((message.match.price - sourceProduct.price) / sourceProduct.price) * 100).toFixed(2))
                }
              }
            ]
          },
          timestamp: Date.now()
        };
        
        // Store the comparison result
        chrome.storage.local.set({ comparison }, () => {
          logger.info('Stored manual comparison result');
        });
      }
    });
    
    sendResponse({ success: true });
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
 * Perform background search for product match
 * 
 * @param sourceProduct - Product to find matches for
 * @param searchUrl - URL to search for matches
 * @param marketplace - Marketplace to search
 * @returns Match result with best match and similarity score
 */
async function performBackgroundSearch(
  sourceProduct: ProductData, 
  searchUrl: string, 
  marketplace: string
): Promise<{ match: ProductMatchResult | null; similarity: number }> {
  try {
    logger.info(`Starting background search for ${marketplace}:`, sourceProduct.title);
    
    // Fetch the search results page HTML
    const pageHtml = await fetchPage(searchUrl);
    
    if (!pageHtml) {
      throw new Error('Failed to fetch search results page');
    }
    
    // Extract products from the page
    const products = await extractProductFromPage(pageHtml, marketplace, searchUrl);
    
    if (!products || products.length === 0) {
      logger.warn('No products found on search results page');
      return { match: null, similarity: 0 };
    }
    
    logger.info(`Found ${products.length} products on search results page`);
    
    // Find the best match
    const { bestMatch, similarity } = findBestMatch(sourceProduct, products);
    
    if (!bestMatch) {
      logger.warn('No good match found');
      return { match: null, similarity: 0 };
    }
    
    // Get settings for fee calculations
    const settings = await loadSettings();
    
    // Calculate profit for this product
    const matchedProduct = bestMatch as ProductMatchResult;
    
    // Fix price if needed (handle parsing errors)
    if (matchedProduct.price && matchedProduct.price > 1000) {
      const priceString = matchedProduct.price.toString();
      if (priceString.length > 5) {
        // Extract what's likely the real price
        matchedProduct.price = parseFloat(priceString.substring(0, 2) + '.' + priceString.substring(2, 4));
        logger.info('Fixed large price number:', matchedProduct.price);
      }
    }
    
    // Calculate profit
    if (matchedProduct.price && sourceProduct.price) {
      matchedProduct.profit = {
        amount: parseFloat((matchedProduct.price - sourceProduct.price).toFixed(2)),
        percentage: parseFloat((((matchedProduct.price - sourceProduct.price) / (sourceProduct.price || 1)) * 100).toFixed(2))
      };
      
      // Add fee breakdown if fees are enabled
      if (settings.includeFees) {
        const feePercentage = settings.estimatedFees[marketplace] || 0;
        const marketplaceFeeAmount = matchedProduct.price * feePercentage;
        const additionalFees = settings.additionalFees || 0;
        const totalFees = marketplaceFeeAmount + additionalFees;
        
        matchedProduct.fee_breakdown = {
          marketplace_fee_percentage: feePercentage,
          marketplace_fee_amount: parseFloat(marketplaceFeeAmount.toFixed(2)),
          additional_fees: parseFloat(additionalFees.toFixed(2)),
          total_fees: parseFloat(totalFees.toFixed(2))
        };
        
        // Adjust profit to include fees
        matchedProduct.profit.amount = parseFloat((matchedProduct.profit.amount - totalFees).toFixed(2));
        matchedProduct.profit.percentage = parseFloat(
          (((matchedProduct.price - sourceProduct.price - totalFees) / sourceProduct.price) * 100).toFixed(2)
        );
      }
    }
    
    // Add similarity score to matched product
    matchedProduct.similarity = similarity;
    
    return { 
      match: matchedProduct,
      similarity 
    };
  } catch (error) {
    logger.error('Error in background search:', error);
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
