// src/background/api/walmartApi.ts
// Direct Walmart Affiliate API implementation

import { 
  ApiBaseRequest, 
  ApiResponse, 
  ProductMatchResult 
} from '../../types';
import { 
  WalmartApiConfig, 
  WalmartSearchParams, 
  WalmartProductParams,
  WalmartItem,
  WalmartSearchResponse
} from '../../types/walmartApi';
import { createLogger } from '../utils/logger';
import { generateWalmartAuthHeaders } from '../utils/walmartSignatureGenerator';

// Initialize logger
const logger = createLogger('WalmartApi');

/**
 * Client for Walmart Affiliate API
 */
export class WalmartApi {
  private static config: WalmartApiConfig | null = null;
  
  /**
   * Configure the Walmart API client
   * 
   * @param config - Walmart API configuration
   */
  static configure(config: WalmartApiConfig): void {
    this.config = config;
    logger.info('WalmartApi configured');
  }
  
  /**
   * Check if the API client is properly configured
   * 
   * @returns True if configured, throws error if not
   */
  private static checkConfig(): boolean {
    if (!this.config) {
      throw new Error('WalmartApi not configured. Call WalmartApi.configure() first.');
    }
    return true;
  }
  
  /**
   * Make a request to the Walmart Affiliate API
   * 
   * @param endpoint - API endpoint (without base URL)
   * @param params - Query parameters
   * @returns API response
   */
  private static async makeRequest<T>(
    endpoint: string,
    params: Record<string, string> = {}
  ): Promise<ApiResponse<T>> {
    try {
      this.checkConfig();
      
      // Add publisher ID to all requests
      const queryParams = new URLSearchParams({
        ...params,
        publisherId: this.config!.publisherId
      });
      
      // Build the full URL
      const url = `${this.config!.baseUrl}${endpoint}?${queryParams}`;
      
      // Log configuration for debugging
      logger.info('WalmartApi configuration:', {
        consumerId: this.config!.consumerId,
        privateKeyLength: this.config!.privateKey.length,
        privateKeyVersion: this.config!.privateKeyVersion,
        publisherId: this.config!.publisherId,
        baseUrl: this.config!.baseUrl
      });
      
      // Debug log the first and last few characters of the private key
      const pkStart = this.config!.privateKey.substring(0, 30);
      const pkEnd = this.config!.privateKey.substring(this.config!.privateKey.length - 30);
      logger.info(`Private key starts with: ${pkStart}... and ends with ...${pkEnd}`);
      
      try {
        // Generate auth headers
        logger.info('Generating auth headers...');
        const authHeaders = await generateWalmartAuthHeaders(
          this.config!.consumerId,
          this.config!.privateKey,
          this.config!.privateKeyVersion
        );
        logger.info('Auth headers generated successfully:', Object.keys(authHeaders));
        
        // Log complete headers for debugging
        logger.info('Auth header values:', {
          'WM_CONSUMER.ID': authHeaders['WM_CONSUMER.ID'],
          'WM_CONSUMER.INTIMESTAMP': authHeaders['WM_CONSUMER.INTIMESTAMP'],
          'WM_SEC.KEY_VERSION': authHeaders['WM_SEC.KEY_VERSION'],
          'WM_SEC.AUTH_SIGNATURE_LENGTH': authHeaders['WM_SEC.AUTH_SIGNATURE']?.length || 0
        });
        
        logger.info(`Making request to: ${url}`);
        
        try {
          // Make the request with enhanced error handling
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Origin': chrome.runtime.getURL(''),
              ...authHeaders
            },
            // Add mode for CORS troubleshooting
            mode: 'cors'
          });
          
          logger.info(`Response status: ${response.status} ${response.statusText}`);
          
          if (!response.ok) {
            // Get detailed error information
            let errorText = '';
            try {
              errorText = await response.text();
            } catch (textError) {
              errorText = `Could not read response text: ${textError}`;
            }
            
            logger.error(`Walmart API error (${response.status}): ${errorText}`);
            
            // Log response headers for debugging
            const responseHeaders: Record<string, string> = {};
            response.headers.forEach((value, key) => {
              responseHeaders[key] = value;
            });
            logger.error('Error response headers:', responseHeaders);
            
            return {
              success: false,
              error: `Walmart API error: ${response.status} - ${errorText}`
            };
          }
          
          // Handle successful response
          try {
            const data = await response.json();
            logger.info('Successfully received and parsed data from Walmart API');
            logger.debug('Response data sample:', 
              typeof data === 'object' ? JSON.stringify(data).substring(0, 200) + '...' : 'Not an object');
            return {
              success: true,
              data
            };
          } catch (jsonError) {
            logger.error('Error parsing JSON response:', jsonError);
            return {
              success: false,
              error: `Error parsing API response: ${jsonError instanceof Error ? jsonError.message : String(jsonError)}`
            };
          }
        } catch (fetchError) {
          // This is likely the "Failed to fetch" error
          logger.error('Fetch operation failed:', fetchError);
          logger.error('Fetch error details:', {
            message: fetchError instanceof Error ? fetchError.message : String(fetchError),
            stack: fetchError instanceof Error ? fetchError.stack : 'No stack trace',
            name: fetchError instanceof Error ? fetchError.name : 'Unknown error type'
          });
          
          // Check if it's a CORS issue
          if (fetchError instanceof Error && 
              (fetchError.message.includes('CORS') || 
               fetchError.message.includes('cross-origin'))) {
            return {
              success: false,
              error: `CORS error when calling Walmart API. The API may not be configured to allow requests from the extension: ${fetchError.message}`
            };
          }
          
          return {
            success: false,
            error: `Failed to fetch from Walmart API: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`
          };
        }
      } catch (innerError) {
        logger.error('Error during auth or fetch operation:', innerError);
        return {
          success: false,
          error: `Auth or fetch error: ${innerError instanceof Error ? innerError.message : String(innerError)}`
        };
      }
    } catch (error) {
      logger.error(`Error making Walmart API request to ${endpoint}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Search for products on Walmart
   * 
   * @param params - Search parameters
   * @returns Search results
   */
  static async search(
    params: WalmartSearchParams
  ): Promise<ApiResponse<WalmartSearchResponse>> {
    logger.info(`Searching Walmart for: ${params.query}`);
    
    // Build query parameters for Affiliate API
    const queryParams: Record<string, string> = {
      query: params.query
    };
    
    // Map parameters to Affiliate API format
    if (params.start) queryParams.start = params.start.toString();
    if (params.sort) queryParams.sort = params.sort;
    if (params.numItems) queryParams.count = params.numItems.toString();
    if (params.responseGroup) queryParams.responseGroup = params.responseGroup;
    
    // The Affiliate API search endpoint
    logger.info(`Searching with endpoint: /api-proxy/service/affil/product/v2/search and parameters: ${JSON.stringify(queryParams)}`);
    return this.makeRequest<WalmartSearchResponse>(
      '/api-proxy/service/affil/product/v2/search',
      queryParams
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
  ): Promise<ApiResponse<WalmartItem>> {
    logger.info(`Getting Walmart product by UPC: ${upc}`);
    
    // For Affiliate API, use Product Lookup with UPC parameter
    logger.info(`Looking up UPC with endpoint: /api-proxy/service/affil/product/v2/items`);
    return this.makeRequest<WalmartItem>(
      '/api-proxy/service/affil/product/v2/items',
      { upc }
    );
  }
  
  /**
   * Get product by UPC - version that returns correct type for direct API usage
   * 
   * @param upc - Product UPC
   * @returns Standardized product details
   */
  static async getProductByUpcDirectApi(
    upc: string
  ): Promise<ApiResponse<ProductMatchResult[]>> {
    logger.info(`Getting Walmart product by UPC (direct API): ${upc}`);
    
    const response = await this.getProductByUpc(upc);
    
    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error || 'No product found'
      };
    }
    
    // Convert to standard format and wrap in array
    const result = this.convertToProductMatchResult(response.data);
    return {
      success: true,
      data: [result]
    };
  }
  
  /**
   * Get product details by Item ID
   * 
   * @param itemId - Walmart item ID
   * @returns Product details
   */
  static async getProductById(
    itemId: string
  ): Promise<ApiResponse<WalmartItem>> {
    logger.info(`Getting Walmart product by ID: ${itemId}`);
    
    // For Affiliate API, use Product Lookup with ids parameter
    logger.info(`Looking up item ID with endpoint: /api-proxy/service/affil/product/v2/items`);
    return this.makeRequest<WalmartItem>(
      '/api-proxy/service/affil/product/v2/items',
      { ids: itemId }
    );
  }
  
  /**
   * Search for products using the standard interface (compatible with BlueCartApi)
   * 
   * @param params - Search parameters (query, upc)
   * @returns Matching products in standardized format
   */
  static async searchProducts(
    params: ApiBaseRequest
  ): Promise<ApiResponse<ProductMatchResult[]>> {
    try {
      // If UPC is provided, use direct lookup
      if (params.upc) {
        return this.getProductByUpc(params.upc).then(response => {
          if (!response.success || !response.data) {
            return {
              success: false,
              error: response.error || 'No product found'
            };
          }
          
          // Convert to standard format
          const result = this.convertToProductMatchResult(response.data);
          return {
            success: true,
            data: [result]
          };
        });
      }
      
      // Otherwise, perform a search using the query
      if (params.query) {
        return this.search({
          query: params.query,
          numItems: 10,
          responseGroup: 'full'
        }).then(response => {
          if (!response.success || !response.data || !response.data.items) {
            return {
              success: false,
              error: response.error || 'No products found'
            };
          }
          
          // Convert each item to standard format
          const results = response.data.items.map(item => 
            this.convertToProductMatchResult(item)
          );
          
          return {
            success: true,
            data: results
          };
        });
      }
      
      return {
        success: false,
        error: 'No search criteria provided. Please provide a UPC or query.'
      };
    } catch (error) {
      logger.error('Error in searchProducts:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Convert Walmart Affiliate API item to standard ProductMatchResult format
   * 
   * @param item - Walmart Affiliate API item
   * @returns Standardized product data
   */
  private static convertToProductMatchResult(item: any): ProductMatchResult {
    // The Affiliate API has a different response structure
    // Common fields in Affiliate API response:
    // - itemId (numeric)
    // - name
    // - salePrice (numeric)
    // - upc
    // - brandName
    // - largeImage or imageUrl
    // - productUrl (instead of productTrackingUrl)
    // - customerRating (numeric)
    // - numReviews (numeric)
    
    // Extract average rating as a number
    let averageRating: number | null = null;
    if (item.customerRating !== undefined) {
      const rating = typeof item.customerRating === 'string' 
        ? parseFloat(item.customerRating) 
        : item.customerRating;
      if (!isNaN(rating)) {
        averageRating = rating;
      }
    }
    
    return {
      title: item.name || '',
      price: typeof item.salePrice === 'string' ? parseFloat(item.salePrice) : item.salePrice || 0,
      marketplace: 'walmart',
      brand: item.brandName || '',
      url: item.productUrl || item.affiliateAddToCartUrl || '',
      image: item.largeImage || item.imageUrl || '', // Required by ProductMatchResult
      imageUrl: item.largeImage || item.imageUrl || '', // Keep for compatibility
      item_id: String(item.itemId),
      upc: item.upc || '',
      similarityScore: 1.0, // Direct API match, high confidence
      sourceProductId: '', // This will be filled in by the caller
      searchUrl: '',       // This will be filled in by the caller
      ratings: {
        average: averageRating,
        count: item.numReviews || 0
      },
      isProfitable: false, // This will be calculated later
      profitAmount: 0,     // This will be calculated later
      profitPercentage: 0, // This will be calculated later
      // Include raw data for debugging
      rawData: item
    };
  }
  
  /**
   * Get product by UPC (BlueCartApi compatible method)
   * 
   * @param upc - Product UPC
   * @returns Product details
   */
  static async getProductByUpc_Compatible(
    upc: string
  ): Promise<ApiResponse<ProductMatchResult[]>> {
    return this.searchProducts({ upc });
  }
  
  /**
   * Search for products by query text (BlueCartApi compatible method)
   * 
   * @param query - Search query
   * @returns Matching products
   */
  static async searchByQuery(
    query: string
  ): Promise<ApiResponse<ProductMatchResult[]>> {
    return this.searchProducts({ query });
  }
  
  /**
   * Test the API connection by making a simple request
   * This can be used to validate credentials and troubleshoot connectivity issues
   * 
   * @returns Success/failure response with diagnostic information
   */
  static async testConnection(): Promise<ApiResponse<string>> {
    try {
      logger.info('Testing Walmart API connection');
      
      if (!this.config) {
        return {
          success: false,
          error: 'API not configured. Please configure the API credentials first.'
        };
      }
      
      // Log all config information
      logger.info('Testing with configuration:', {
        consumerId: this.config.consumerId,
        privateKeyLength: this.config.privateKey.length,
        privateKeyVersion: this.config.privateKeyVersion,
        publisherId: this.config.publisherId,
        baseUrl: this.config.baseUrl
      });
      
      // Try to make a simple request to test connectivity using the Trends endpoint
      const testResponse = await this.makeRequest<any>(
        '/api-proxy/service/affil/product/v2/trends',
        {} // Trends endpoint doesn't require parameters
      );
      
      if (testResponse.success) {
        logger.info('Walmart API connection test successful');
        return {
          success: true,
          data: 'Connection successful'
        };
      } else {
        logger.error('Walmart API connection test failed:', testResponse.error);
        return {
          success: false,
          error: `Connection test failed: ${testResponse.error}`
        };
      }
    } catch (error) {
      logger.error('Error testing Walmart API connection:', error);
      return {
        success: false,
        error: `Error testing connection: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
}