// src/background/api/bigbox.ts - BigBox (Target) API integration

import { ApiBaseRequest, ApiResponse, ProductMatchResult } from '../../types';
import { ApiClient } from './apiClient';

/**
 * Client for BigBox API (Target product data)
 */
export class BigBoxApi {
  /**
   * Search for products on Target using BigBox API
   * 
   * @param params - Search parameters
   * @returns Matching products
   */
  static async searchProducts(
    params: ApiBaseRequest
  ): Promise<ApiResponse<ProductMatchResult[]>> {
    return ApiClient.makeRequest<ProductMatchResult[]>(
      '/search/target', 
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
