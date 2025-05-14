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
   * Search for the same product across marketplaces
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
      const requestData: MultiSearchRequest = {
        source_marketplace: productData.marketplace,
        product_id: productData.upc || productData.asin || productData.productId,
        product_title: productData.title,
        product_brand: productData.brand
      };
      
      logger.info('Multi-marketplace search for:', requestData);
      
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
      
      // Make the API request to the correct path
      // Use 'search/multi' which will be prefixed with /api/ by the ApiClient
      const response = await ApiClient.makeRequest<Record<string, ProductMatchResult[]>>(
        'search/multi', 
        'POST', 
        {
          ...requestData,
          // Add selected_marketplace to the request to tell the backend which marketplace to search
          selected_marketplace: settings.selectedMarketplace || null
        }
      );
      
      // If we have a specific marketplace selected, filter the response to only include that marketplace
      if (settings.selectedMarketplace && response.success && response.data) {
        const filteredData: Record<string, ProductMatchResult[]> = {};
        if (response.data[settings.selectedMarketplace]) {
          filteredData[settings.selectedMarketplace] = response.data[settings.selectedMarketplace];
        }
        return {
          ...response,
          data: filteredData
        };
      }
      
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
      
      // Use the same search/multi endpoint that works for individual products
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
      }
      
      return {
        success: false,
        error: response.error || 'No results found'
      };
    } catch (error) {
      logger.error(`Error in ${targetMarketplace} search:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Get the appropriate API client for a specific marketplace
   * 
   * @param marketplace - Marketplace name
   * @param useDirectApi - Whether to use direct marketplace APIs (true) or third-party services (false)
   * @returns API client for the marketplace
   */
  static getApiForMarketplace(marketplace: MarketplaceType, useDirectApi: boolean = true) {
    switch (marketplace) {
      case 'walmart':
        return useDirectApi ? WalmartApi : BlueCartApi;
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
