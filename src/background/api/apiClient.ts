// src/background/api/apiClient.ts - Base API client with common functionality

import { ApiBaseRequest, ApiResponse } from '../../types';
import { getSettings } from '../services/settingsService';

/**
 * Base API client with common functionality for all API services
 */
export class ApiClient {
  /**
   * Makes an API request to the specified endpoint
   * 
   * @param endpoint - API endpoint to call
   * @param method - HTTP method
   * @param data - Request data
   * @returns API response
   */
  static async makeRequest<T, R = any>(
    endpoint: string, 
    method: 'GET' | 'POST' = 'POST', 
    data?: R
  ): Promise<ApiResponse<T>> {
    try {
      const settings = await getSettings();
      const apiBaseUrl = settings.apiBaseUrl;
      
      // Ensure endpoint starts with a slash if the base URL doesn't end with one
      const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
      const url = `${apiBaseUrl}${formattedEndpoint}`;
      
      console.log(`[E-commerce Arbitrage API] Requesting ${method} ${url}`, data);
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: method === 'POST' ? JSON.stringify(data) : undefined
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log(`[E-commerce Arbitrage API] Response from ${endpoint}:`, result);
      
      return {
        success: true,
        ...result
      };
    } catch (error) {
      console.error(`Error making API request to ${endpoint}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Gets the available API services
   * 
   * @returns Information about API services
   */
  static async getApiInfo(): Promise<ApiResponse<any>> {
    return this.makeRequest('/test', 'GET');
  }
  
  /**
   * Checks API health
   * 
   * @returns API health status
   */
  static async checkHealth(): Promise<ApiResponse<any>> {
    return this.makeRequest('/health', 'GET');
  }
}
