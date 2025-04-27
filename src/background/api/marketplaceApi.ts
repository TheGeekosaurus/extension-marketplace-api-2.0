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
          console.log('[E-commerce Arbitrage API] Searching only in selected marketplace:', marketplaces);
        } else {
          console.log('[E-commerce Arbitrage API] Selected marketplace is the same as source, no marketplaces to search');
          // Return empty result when the selected marketplace is the same as the source
          return {
            success: true,
            data: {}
          };
        }
      } else {
        // Otherwise, search all except the source
        marketplaces = ['amazon', 'walmart', 'target'].filter(
          marketplace => marketplace !== productData.marketplace
        ) as MarketplaceType[];
        console.log('[E-commerce Arbitrage API] No marketplace selected, searching all other marketplaces:', marketplaces);
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
      
      // Make the API request - specify 'search/multi' (not '/search/multi')
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
