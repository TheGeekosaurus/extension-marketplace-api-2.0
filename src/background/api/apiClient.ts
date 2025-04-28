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
      const settings = getSettings();
      const apiBaseUrl = settings.apiBaseUrl;
      
      // Make sure endpoint has the right format
      // Ensure that the endpoint has the /api prefix
      let formattedEndpoint = endpoint;
      if (!formattedEndpoint.startsWith('/')) {
        formattedEndpoint = `/${formattedEndpoint}`;
      }
      
      // Always prepend /api to the endpoint if it's not already there
      if (!formattedEndpoint.startsWith('/api/')) {
        formattedEndpoint = `/api${formattedEndpoint}`;
      }
      
      // Make sure the apiBaseUrl doesn't end with '/' if the endpoint starts with '/'
      const formattedBaseUrl = apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl;
      
      // Construct the full URL
      const url = `${formattedBaseUrl}${formattedEndpoint}`;
      
      console.log(`[E-commerce Arbitrage API] Requesting ${method} ${url}`, data);
      
      const requestOptions: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: method === 'POST' ? JSON.stringify(data) : undefined
      };
      
      console.log('[E-commerce Arbitrage API] Request options:', requestOptions);
      
      const response = await fetch(url, requestOptions);
      
      console.log(`[E-commerce Arbitrage API] Response status:`, response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[E-commerce Arbitrage API] Error response:`, errorText);
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log(`[E-commerce Arbitrage API] Response from ${endpoint}:`, result);
      
      return {
        success: true,
        ...result
      };
    } catch (error) {
      console.error(`[E-commerce Arbitrage API] Error making API request to ${endpoint}:`, error);
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
    console.log('[E-commerce Arbitrage API] Getting API info');
    return this.makeRequest('/test', 'GET');
  }
  
  /**
   * Checks API health
   * 
   * @returns API health status
   */
  static async checkHealth(): Promise<ApiResponse<any>> {
    console.log('[E-commerce Arbitrage API] Checking API health');
    return this.makeRequest('/health', 'GET');
  }
}
