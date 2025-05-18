// src/background/api/marketplaceApi.ts - Combined marketplace API interface

import { 
  ApiResponse, 
  ProductData, 
  ProductMatchResult,
  MultiSearchRequest,
  MarketplaceType,
  ResellableMarketplaceType,
  RESELLABLE_MARKETPLACES,
  WalmartApiConfig
} from '../../types';
import { ApiClient } from './apiClient';
import { BlueCartApi } from './bluecart';
import { WalmartApi } from './walmartApi';
import { RainforestApi } from './rainforest';
import { getSettings } from '../services/settingsService';
import { AuthService } from '../services/authService';
import { createLogger } from '../utils/logger';

// Initialize logger
const logger = createLogger('MarketplaceApi');

/**
 * Combined marketplace API for multi-marketplace searches
 */
export class MarketplaceApi {
  /**
   * Search for the same product across marketplaces using official APIs
   * 
   * @param productData - Source product data
   * @returns Matching products from other marketplaces
   */
  static async searchAcrossMarketplacesOfficial(
    productData: ProductData
  ): Promise<ApiResponse<Record<string, ProductMatchResult[]>>> {
    const settings = getSettings();
    
    try {
      // Check if Walmart API is configured
      if (!settings.walmartApiConfig?.publisherId || !settings.walmartApiConfig?.privateKey) {
        return {
          success: false,
          error: 'Walmart API is not configured'
        };
      }
      
      // Determine which marketplaces to search
      let marketplaces: ResellableMarketplaceType[] = [];
      
      if (settings.selectedMarketplace) {
        // If a specific marketplace is selected and it's not the source, use only that
        if (settings.selectedMarketplace !== productData.marketplace &&
            RESELLABLE_MARKETPLACES.includes(settings.selectedMarketplace as ResellableMarketplaceType)) {
          marketplaces = [settings.selectedMarketplace as ResellableMarketplaceType];
          logger.info('Searching only in selected marketplace (official API):', marketplaces);
        } else {
          logger.info('Selected marketplace is the same as source or not resellable, no marketplaces to search');
          // Return empty result when the selected marketplace is the same as the source
          return {
            success: true,
            data: {}
          };
        }
      } else {
        // Otherwise, search all resellable marketplaces except the source
        marketplaces = RESELLABLE_MARKETPLACES.filter(
          marketplace => marketplace !== productData.marketplace
        ) as ResellableMarketplaceType[];
        logger.info('No marketplace selected, searching all other resellable marketplaces (official API):', marketplaces);
      }
      
      logger.info('Searching marketplaces with official APIs:', marketplaces);
      
      // If no marketplaces to search, return empty result
      if (marketplaces.length === 0) {
        return {
          success: true,
          data: {}
        };
      }
      
      // Create request body for multi-search
      const requestData: any = {
        query: productData.title,
        upc: productData.upc,
        asin: productData.asin
      };
      
      // Include brand in the query if available
      if (productData.brand) {
        requestData.query = `${productData.brand} ${productData.title}`;
      }
      
      logger.info('Multi-marketplace search with official APIs for:', requestData);
      
      // Verify user is authenticated
      const isAuthenticated = await AuthService.isAuthenticated();
      if (!isAuthenticated) {
        return {
          success: false,
          error: 'Authentication required. Please enter your API key in the settings.'
        };
      }
      
      // Check if user has enough credits
      const creditCheck = await AuthService.checkCredits(5);
      if (!creditCheck.sufficient) {
        return {
          success: false,
          error: 'Insufficient credits to perform this operation',
          insufficientCredits: true,
          balance: creditCheck.balance
        };
      }
      
      // Use direct APIs for each marketplace
      const results: Record<string, ProductMatchResult[]> = {};
      
      // Make sure WalmartApi is initialized
      WalmartApi.configure(settings.walmartApiConfig);
      
      // For each marketplace, use the appropriate direct API
      for (const marketplace of marketplaces) {
        if (marketplace === 'walmart') {
          logger.info('Using direct Walmart API');
          
          try {
            // Build search query from product data
            let searchQuery = productData.title;
            if (productData.brand) {
              searchQuery = `${productData.brand} ${productData.title}`;
            }
            
            // Use UPC if available, otherwise search by query
            let apiResponse;
            if (productData.upc) {
              logger.info(`Searching Walmart directly by UPC: ${productData.upc}`);
              apiResponse = await WalmartApi.getProductByUpcDirectApi(productData.upc);
            } else {
              logger.info(`Searching Walmart directly by query: ${searchQuery}`);
              apiResponse = await WalmartApi.searchByQuery(searchQuery);
            }
            
            // Process the results
            if (apiResponse.success && apiResponse.data) {
              logger.info('Direct Walmart API search successful:', {
                resultCount: Array.isArray(apiResponse.data) ? apiResponse.data.length : 1
              });
              
              results[marketplace] = apiResponse.data;
            } else {
              logger.warn('Direct Walmart API search failed:', apiResponse.error);
            }
          } catch (directApiError) {
            logger.error(`Direct ${marketplace} API failed:`, directApiError);
          }
        }
        // Note: We only support Walmart official API for now
        // Amazon official API would be added here when available
      }
      
      return {
        success: true,
        data: results
      };
    } catch (error) {
      logger.error('Error in multi-marketplace official API search:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Search for the same product across marketplaces using 3rd party APIs
   * 
   * @param productData - Source product data
   * @returns Matching products from other marketplaces
   */
  static async searchAcrossMarketplaces(
    productData: ProductData
  ): Promise<ApiResponse<Record<string, ProductMatchResult[]>>> {
    const settings = getSettings();
    
    try {
      // Determine which marketplaces to search
      let marketplaces: ResellableMarketplaceType[] = [];
      
      if (settings.selectedMarketplace) {
        // If a specific marketplace is selected and it's not the source, use only that
        if (settings.selectedMarketplace !== productData.marketplace &&
            RESELLABLE_MARKETPLACES.includes(settings.selectedMarketplace as ResellableMarketplaceType)) {
          marketplaces = [settings.selectedMarketplace as ResellableMarketplaceType];
          logger.info('Searching only in selected marketplace:', marketplaces);
        } else {
          logger.info('Selected marketplace is the same as source or not resellable, no marketplaces to search');
          // Return empty result when the selected marketplace is the same as the source
          return {
            success: true,
            data: {}
          };
        }
      } else {
        // Otherwise, search all resellable marketplaces except the source
        marketplaces = RESELLABLE_MARKETPLACES.filter(
          marketplace => marketplace !== productData.marketplace
        ) as ResellableMarketplaceType[];
        logger.info('No marketplace selected, searching all other resellable marketplaces:', marketplaces);
      }
      
      logger.info('Searching marketplaces:', marketplaces);
      
      // If no marketplaces to search, return empty result
      if (marketplaces.length === 0) {
        return {
          success: true,
          data: {}
        };
      }
      
      // Create request body for multi-search
      const requestData: any = {
        query: productData.title,
        upc: productData.upc,
        asin: productData.asin
      };
      
      // Include brand in the query if available
      if (productData.brand) {
        requestData.query = `${productData.brand} ${productData.title}`;
      }
      
      logger.info('Multi-marketplace search for:', requestData);
      logger.info('Request data details:', {
        query: requestData.query,
        upc: requestData.upc,
        asin: requestData.asin,
        hasQuery: !!requestData.query,
        hasUpc: !!requestData.upc,
        hasAsin: !!requestData.asin
      });
      
      // Verify user is authenticated
      const isAuthenticated = await AuthService.isAuthenticated();
      if (!isAuthenticated) {
        return {
          success: false,
          error: 'Authentication required. Please enter your API key in the settings.'
        };
      }
      
      // Check if user has enough credits
      const creditCheck = await AuthService.checkCredits(5);
      if (!creditCheck.sufficient) {
        return {
          success: false,
          error: 'Insufficient credits to perform this operation',
          insufficientCredits: true,
          balance: creditCheck.balance
        };
      }
      
      // If searching only one marketplace, use the specific endpoint
      if (marketplaces.length === 1) {
        const marketplace = marketplaces[0];
        const endpoint = marketplace === 'amazon' ? 'search-amazon' : 'search-walmart';
        
        logger.info(`Using single marketplace endpoint: ${endpoint}`);
        
        const response = await ApiClient.makeRequest<ProductMatchResult[]>(
          endpoint,
          'POST',
          requestData
        );
        
        // Format response to match multi-search structure
        if (response.success && response.data) {
          const formattedData: Record<string, ProductMatchResult[]> = {};
          formattedData[marketplace] = response.data;
          return {
            success: true,
            data: formattedData
          };
        }
        
        return {
          success: false,
          error: response.error
        };
      }
      
      // Multiple marketplaces, use search-multi
      logger.info('Using multi-marketplace endpoint for:', marketplaces);
      
      const response = await ApiClient.makeRequest<Record<string, ProductMatchResult[]>>(
        'search-multi', 
        'POST', 
        {
          ...requestData,
          marketplaces: marketplaces // Pass specific marketplaces to search
        }
      );
      
      return response;
    } catch (error) {
      logger.error('Error in multi-marketplace search:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Search for products on a specific marketplace using official APIs
   * 
   * @param productData - Source product data
   * @param targetMarketplace - Target marketplace to search in
   * @returns Matching products from the target marketplace
   */
  static async searchSingleMarketplaceOfficial(
    productData: ProductData,
    targetMarketplace: MarketplaceType
  ): Promise<ApiResponse<ProductMatchResult[]>> {
    try {
      logger.info(`Searching for ${productData.title} on ${targetMarketplace} using official APIs`);
      
      // Verify user is authenticated
      const isAuthenticated = await AuthService.isAuthenticated();
      if (!isAuthenticated) {
        return {
          success: false,
          error: 'Authentication required. Please enter your API key in the settings.'
        };
      }
      
      // Get current settings
      const settings = getSettings();
      
      // Only Walmart official API is supported for now
      if (targetMarketplace === 'walmart' && settings.walmartApiConfig) {
        logger.info('Using direct Walmart API for single marketplace search');
        
        try {
          // Make sure WalmartApi is initialized
          WalmartApi.configure(settings.walmartApiConfig);
          
          // Build search query from product data
          let searchQuery = productData.title;
          if (productData.brand) {
            searchQuery = `${productData.brand} ${productData.title}`;
          }
          
          // Use UPC if available, otherwise search by query
          let apiResponse;
          if (productData.upc) {
            logger.info(`Searching Walmart directly by UPC: ${productData.upc}`);
            apiResponse = await WalmartApi.getProductByUpcDirectApi(productData.upc);
          } else {
            logger.info(`Searching Walmart directly by query: ${searchQuery}`);
            apiResponse = await WalmartApi.searchByQuery(searchQuery);
          }
          
          // Return the results
          if (apiResponse.success && apiResponse.data) {
            logger.info('Direct Walmart API search successful:', {
              resultCount: Array.isArray(apiResponse.data) ? apiResponse.data.length : 1
            });
            
            return {
              success: true,
              data: apiResponse.data
            };
          } else {
            logger.warn('Direct Walmart API search failed:', apiResponse.error);
            return {
              success: false,
              error: apiResponse.error || 'No results found'
            };
          }
        } catch (directApiError) {
          logger.error('Direct Walmart API failed:', directApiError);
          return {
            success: false,
            error: `Direct API failed: ${directApiError instanceof Error ? directApiError.message : String(directApiError)}`
          };
        }
      }
      
      // If target marketplace isn't supported for official API
      return {
        success: false,
        error: `Official API not available for ${targetMarketplace}`
      };
    } catch (error) {
      logger.error(`Error in ${targetMarketplace} official API search:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Search for products on a specific marketplace
   * 
   * @param productData - Source product data
   * @param targetMarketplace - Target marketplace to search in
   * @returns Matching products from the target marketplace
   */
  static async searchSingleMarketplace(
    productData: ProductData,
    targetMarketplace: MarketplaceType
  ): Promise<ApiResponse<ProductMatchResult[]>> {
    try {
      logger.info(`Searching for ${productData.title} on ${targetMarketplace}`);
      
      // Verify user is authenticated
      const isAuthenticated = await AuthService.isAuthenticated();
      if (!isAuthenticated) {
        return {
          success: false,
          error: 'Authentication required. Please enter your API key in the settings.'
        };
      }
      
      // Create request body for single marketplace search
      const requestData = {
        source_marketplace: productData.marketplace,
        product_id: productData.upc || productData.asin || productData.productId,
        product_title: productData.title,
        product_brand: productData.brand,
        target_marketplace: targetMarketplace
      };
      
      // Use the multi-search endpoint but with a specific target marketplace
      // This ensures we use the same matching algorithm for batch and individual products
      logger.info(`Making API request for ${requestData.product_title} on ${targetMarketplace}`);
      
      // Try using the backend API (3rd party)
      const response = await ApiClient.makeRequest<Record<string, ProductMatchResult[]>>(
        'search/multi', 
        'POST', 
        {
          source_marketplace: productData.marketplace,
          product_id: productData.productId || productData.asin || productData.upc,  
          product_title: productData.title,
          product_brand: productData.brand,
          selected_marketplace: targetMarketplace
        }
      );
      
      // Extract the results for the target marketplace
      if (response.success && response.data && response.data[targetMarketplace]) {
        return {
          success: true,
          data: response.data[targetMarketplace]
        };
      } else if (response.success) {
        // If successful but no data for the target marketplace
        return {
          success: true,
          data: []
        };
      } else {
        return {
          success: false,
          error: response.error || 'No results found'
        };
      }
    } catch (error) {
      logger.error(`Error in ${targetMarketplace} search:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Get the appropriate 3rd party API client for a specific marketplace
   * 
   * @param marketplace - Marketplace name
   * @returns 3rd party API client for the marketplace
   */
  static getThirdPartyApiForMarketplace(marketplace: MarketplaceType) {
    switch (marketplace) {
      case 'walmart':
        return BlueCartApi;
      case 'amazon':
        return RainforestApi;
      case 'target':
        // No longer using BigBox API for Target
        throw new Error('Target marketplace is not supported for reselling');
      default:
        throw new Error(`Unknown marketplace: ${marketplace}`);
    }
  }
  
  /**
   * Get the appropriate official API client for a specific marketplace
   * 
   * @param marketplace - Marketplace name
   * @returns Official API client for the marketplace
   */
  static getOfficialApiForMarketplace(marketplace: MarketplaceType) {
    switch (marketplace) {
      case 'walmart':
        return WalmartApi;
      case 'amazon':
        // Amazon official API not yet implemented
        throw new Error('Amazon official API is not yet implemented');
      case 'target':
        throw new Error('Target marketplace is not supported for reselling');
      default:
        throw new Error(`Unknown marketplace: ${marketplace}`);
    }
  }
  
  /**
   * Initialize the direct marketplace APIs with their configurations
   * 
   * @param walmartConfig - Walmart API configuration
   */
  static initializeDirectApis(walmartConfig: WalmartApiConfig): void {
    // Initialize Walmart API
    WalmartApi.configure(walmartConfig);
    
    logger.info('Direct marketplace APIs initialized');
  }
}
