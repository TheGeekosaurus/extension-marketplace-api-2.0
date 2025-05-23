// src/background/api/apiClient.ts - Base API client with common functionality

import { ApiBaseRequest, ApiResponse } from '../../types';
import { getSettings } from '../services/settingsService';
import { AuthService } from '../services/authService';
import { createLogger } from '../utils/logger';

const logger = createLogger('ApiClient');

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
      // Use hardcoded API URL from constants instead of settings
      const apiBaseUrl = 'https://ftliettyjscrejxhdnuj.functions.supabase.co';
      
      // Get API key if available
      const apiKey = await AuthService.getApiKey();
      logger.debug('Retrieved API key:', apiKey ? 'API key present' : 'No API key');
      
      // Make sure endpoint has the right format
      // For Supabase Edge Functions, paths start with /functions/v1/
      let formattedEndpoint = endpoint;
      
      // Convert endpoint paths to flat names for Supabase edge functions
      if (endpoint === 'search/multi') {
        formattedEndpoint = 'search-multi';
      } else if (endpoint === 'search/amazon') {
        formattedEndpoint = 'search-amazon';
      } else if (endpoint === 'search/walmart') {
        formattedEndpoint = 'search-walmart';
      } else if (endpoint === '/search/amazon') {
        formattedEndpoint = 'search-amazon';
      } else if (endpoint === '/search/walmart') {
        formattedEndpoint = 'search-walmart';
      }
      
      // Remove leading slash if present
      if (formattedEndpoint.startsWith('/')) {
        formattedEndpoint = formattedEndpoint.substring(1);
      }
      
      // Add proper prefix for Supabase Edge Functions
      formattedEndpoint = `/functions/v1/${formattedEndpoint}`;
      
      // Make sure the apiBaseUrl doesn't end with '/' if the endpoint starts with '/'
      const formattedBaseUrl = apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl;
      
      // Construct the full URL
      const url = `${formattedBaseUrl}${formattedEndpoint}`;
      
      logger.info(`Requesting ${method} ${url}`);
      logger.debug('Request data:', data);
      logger.info('API Key status:', apiKey ? 'API key present' : 'No API key found');
      
      // Set up headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Origin': chrome.runtime.getURL('') // Add origin for CORS
      };
      
      // Add API key to headers if available
      if (apiKey && !endpoint.includes('auth-verify-key')) {
        // For Supabase Edge Functions, we need both headers
        headers['x-api-key'] = apiKey; // Our custom API key
        // Add the Supabase anon key for the Authorization header
        // TODO: Replace with your actual Supabase anon key from dashboard -> Settings -> API
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0bGlldHR5anNjcmVqeGhkbnVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5NTAyNjIsImV4cCI6MjA2MTUyNjI2Mn0.MX2lqwbVIlXr6iXjs9genApuGRVDdhkMxLiGmcU6U44';
        headers['Authorization'] = `Bearer ${SUPABASE_ANON_KEY}`;
        logger.info('Added both x-api-key and Authorization headers for endpoint:', endpoint);
        logger.debug('Authorization header:', headers['Authorization']);
      } else {
        logger.warn('API key not added to headers:', { hasApiKey: !!apiKey, endpoint });
      }
      
      // Create request body
      const bodyData = method === 'POST' ? data : undefined;
      const bodyString = bodyData ? JSON.stringify(bodyData) : undefined;
      
      logger.info('Request body data:', {
        hasData: !!data,
        dataKeys: data ? Object.keys(data) : [],
        dataValues: data || null,
        stringified: bodyString
      });
      
      const requestOptions: RequestInit = {
        method,
        headers,
        body: bodyString
      };
      
      logger.info('Request headers:', JSON.stringify(headers));
      logger.info('Full request details:', {
        url,
        method,
        headers: JSON.stringify(headers),
        hasBody: !!requestOptions.body,
        body: data || null  // Use the original data instead of parsing requestOptions.body
      });
      logger.debug('Request options:', requestOptions);
      
      // Make the request
      const response = await fetch(url, requestOptions);
      
      logger.info(`Response status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`Error response: ${errorText}`);
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      logger.debug(`Response from ${endpoint}:`, result);
      
      return {
        success: true,
        ...result
      };
    } catch (error) {
      logger.error(`Error making API request to ${endpoint}:`, error);
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
    logger.info('Getting API info');
    return this.makeRequest('/test', 'GET');
  }
  
  /**
   * Checks API health
   * 
   * @returns API health status
   */
  static async checkHealth(): Promise<ApiResponse<any>> {
    logger.info('Checking API health');
    return this.makeRequest('/health', 'GET');
  }
}
