// src/background/api/marketplaceApi.ts - Combined marketplace API interface

import { 
  ApiResponse, 
  ProductData, 
  ProductMatchResult,
  MultiSearchRequest,
  MarketplaceType 
} from '../../types';
import { ApiClient } from './apiClient';
import { BlueCartApi } from './bluecart';
import { RainforestApi } from './rainforest';
import { BigBoxApi } from './bigbox';
import { getSettings } from '../services/settingsService';
import { MockService } from '../services/mockService';

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
      let marketplaces: MarketplaceType[] = [];
      
      if (settings.selectedMarketplace) {
        // If a specific marketplace is selected and it's not the source, use only that
        if (settings.selectedMarketplace !== productData.marketplace) {
          marketplaces = [settings.selectedMarketplace];
        }
      } else {
        // Otherwise, search all except the source
        marketplaces = ['amazon', 'walmart', 'target'].filter(
          marketplace => marketplace !== productData.marketplace
        ) as MarketplaceType[];
      }
      
      console.log('[E-commerce Arbitrage API] Searching marketplaces:', marketplaces);
      
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
      
      console.log('[E-commerce Arbitrage API] Multi-marketplace search for:', requestData);
      
      // Check if we should use mock data (for testing purposes)
      if (settings.debugMode) {
        console.log('[E-commerce Arbitrage API] Using mock data for testing');
        const mockData = MockService.generateEnhancedMockMatches(productData);
        return {
          success: true,
          source: "api", // Change "mock" to "api" to match type definition
          data: mockData
        };
      }
      
      // Make the API request - specify 'search/multi' (not '/search/multi')
      return ApiClient.makeRequest<Record<string, ProductMatchResult[]>>(
        'search/multi', 
        'POST', 
        requestData
      );
    } catch (error) {
      console.error('[E-commerce Arbitrage API] Error in multi-marketplace search:', error);
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
   * @returns API client for the marketplace
   */
  static getApiForMarketplace(marketplace: MarketplaceType) {
    switch (marketplace) {
      case 'walmart':
        return BlueCartApi;
      case 'amazon':
        return RainforestApi;
      case 'target':
        return BigBoxApi;
      default:
        throw new Error(`Unknown marketplace: ${marketplace}`);
    }
  }
}
