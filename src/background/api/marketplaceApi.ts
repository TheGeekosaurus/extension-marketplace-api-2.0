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
  ): Promise<ApiResponse<Record<MarketplaceType, ProductMatchResult[]>>> {
    const settings = await getSettings();
    
    // Use mock data if set in settings
    if (settings.useMockData) {
      console.log('[E-commerce Arbitrage API] Using mock data');
      const mockData = MockService.generateEnhancedMockMatches(productData);
      
      // If a specific marketplace is selected, filter the results
      if (settings.selectedMarketplace) {
        const filteredData: Record<MarketplaceType, ProductMatchResult[]> = {} as any;
        
        // Only include the selected marketplace if it's not the source
        if (settings.selectedMarketplace !== productData.marketplace) {
          const matchedProducts = mockData[settings.selectedMarketplace];
          if (matchedProducts) {
            filteredData[settings.selectedMarketplace] = matchedProducts;
          }
        }
        
        return {
          success: true,
          source: 'mock',
          data: filteredData
        };
      }
      
      return {
        success: true,
        source: 'mock',
        data: mockData
      };
    }
    
    // Use real API data
    console.log('[E-commerce Arbitrage API] Using real API data');
    
    try {
      // Create request body for search
      const requestData: MultiSearchRequest = {
        source_marketplace: productData.marketplace,
        product_id: productData.upc || productData.asin || productData.productId,
        product_title: productData.title,
        product_brand: productData.brand
      };
      
      console.log('[E-commerce Arbitrage API] Multi-marketplace search for:', requestData);
      
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
      
      // Direct API search for specific marketplaces instead of using backend multi-search
      const results: Record<MarketplaceType, ProductMatchResult[]> = {} as any;
      
      // Search each marketplace individually
      await Promise.all(marketplaces.map(async (marketplace) => {
        try {
          console.log(`[E-commerce Arbitrage API] Searching ${marketplace}...`);
          
          // Get appropriate API for this marketplace
          const api = this.getApiForMarketplace(marketplace);
          
          // Construct search parameters
          const searchParams: any = {};
          
          // Add identifiers if available
          if (productData.upc) {
            searchParams.upc = productData.upc;
          } else if (marketplace === 'amazon' && productData.asin) {
            searchParams.asin = productData.asin;
          } else {
            // Fallback to text search
            searchParams.query = `${productData.brand || ''} ${productData.title}`.trim();
          }
          
          // Use the appropriate API for this marketplace
          let response;
          if (marketplace === 'amazon') {
            response = await RainforestApi.searchProducts(searchParams);
          } else if (marketplace === 'walmart') {
            response = await BlueCartApi.searchProducts(searchParams);
          } else if (marketplace === 'target') {
            response = await BigBoxApi.searchProducts(searchParams);
          }
          
          // Store results if successful
          if (response && response.success && response.data) {
            results[marketplace] = response.data;
          }
        } catch (error) {
          console.error(`[E-commerce Arbitrage API] Error searching ${marketplace}:`, error);
        }
      }));
      
      return {
        success: true,
        data: results
      };
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
