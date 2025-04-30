// src/types/api.ts - API-related type definitions

/**
 * Base request parameters for API calls
 */
export interface ApiBaseRequest {
  query?: string;
  upc?: string;
  asin?: string;
}

/**
 * Parameters for multi-marketplace search
 */
export interface MultiSearchRequest {
  source_marketplace: string;
  product_id?: string;
  product_title: string;
  product_brand?: string | null;
  selected_marketplace?: string | null;
}

/**
 * Generic API response structure
 */
export interface ApiResponse<T> {
  success: boolean;
  source?: 'api' | 'cache' | 'mock'; // Added 'mock' as a valid source
  data?: T;
  error?: string;
  errorDetails?: string;
  insufficientCredits?: boolean; // Added for credit handling
  balance?: number; // Added for credit balance
}

/**
 * Shape of the cache data stored
 */
export interface CacheData<T> {
  data: T;
  timestamp: number;
}

/**
 * Available cache operations
 */
export type CacheOperation = 'get' | 'set' | 'remove' | 'clear';

/**
 * Credit check response
 */
export interface CreditCheckResponse {
  sufficient: boolean;
  balance: number;
  error?: string;
}

/**
 * API key validation response
 */
export interface ApiKeyValidationResponse {
  valid: boolean;
  user?: {
    id: string;
    email: string;
    credits: number;
  };
  error?: string;
}
