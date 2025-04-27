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

/**
 * Combined marketplace API for multi-marketplace searches
 */
export class MarketplaceApi {
  /**
   * Search for the same product across multiple marketplaces
   * 
   * @param productData - Source product data
   * @returns Matching products from other marketplaces
   */
  static async searchAcrossMarketplaces(
    productData: ProductData
  ): Promise<ApiResponse<Record<MarketplaceType, ProductMatchResult[]>>> {
    // Create request body for multi-search
    const requestData: MultiSearchRequest = {
      source_marketplace: productData.marketplace,
      product_id: productData.upc || productData.asin || productData.productId,
      product_title: productData.title,
      product_brand: productData.brand
    };
    
    console.log('[E-commerce Arbitrage API] Multi-marketplace search for:', requestData);
    
    return ApiClient.makeRequest<Record<MarketplaceType, ProductMatchResult[]>>(
      '/search/multi', 
      'POST', 
      requestData
    );
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
