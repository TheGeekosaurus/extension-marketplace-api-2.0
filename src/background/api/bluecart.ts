// src/background/api/bluecart.ts - BlueCart (Walmart) API integration

import { ApiBaseRequest, ApiResponse, ProductMatchResult } from '../../types';
import { ApiClient } from './apiClient';

/**
 * Client for BlueCart API (Walmart product data)
 */
export class BlueCartApi {
  /**
   * Search for products on Walmart using BlueCart API
   * 
   * @param params - Search parameters
   * @returns Matching products
   */
  static async searchProducts(
    params: ApiBaseRequest
  ): Promise<ApiResponse<ProductMatchResult[]>> {
    return ApiClient.makeRequest<ProductMatchResult[]>(
      'search-walmart', 
      'POST', 
      params
    );
  }
  
  /**
   * Get product details by UPC
   * 
   * @param upc - Product UPC
   * @returns Product details
   */
  static async getProductByUpc(
    upc: string
  ): Promise<ApiResponse<ProductMatchResult[]>> {
    return this.searchProducts({ upc });
  }
  
  /**
   * Search for products by query text
   * 
   * @param query - Search query
   * @returns Matching products
   */
  static async searchByQuery(
    query: string
  ): Promise<ApiResponse<ProductMatchResult[]>> {
    return this.searchProducts({ query });
  }
}
