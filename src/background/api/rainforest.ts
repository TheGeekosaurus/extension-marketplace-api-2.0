// src/background/api/rainforest.ts - Rainforest (Amazon) API integration

import { ApiBaseRequest, ApiResponse, ProductMatchResult } from '../../types';
import { ApiClient } from './apiClient';

/**
 * Client for Rainforest API (Amazon product data)
 */
export class RainforestApi {
  /**
   * Search for products on Amazon using Rainforest API
   * 
   * @param params - Search parameters
   * @returns Matching products
   */
  static async searchProducts(
    params: ApiBaseRequest
  ): Promise<ApiResponse<ProductMatchResult[]>> {
    return ApiClient.makeRequest<ProductMatchResult[]>(
      'search-amazon', 
      'POST', 
      params
    );
  }
  
  /**
   * Get product details by ASIN
   * 
   * @param asin - Product ASIN
   * @returns Product details
   */
  static async getProductByAsin(
    asin: string
  ): Promise<ApiResponse<ProductMatchResult[]>> {
    return this.searchProducts({ asin });
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
