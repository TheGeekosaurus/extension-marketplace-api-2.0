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
  product_id: string;
  product_title: string;
  product_brand: string | null;
}

/**
 * Generic API response structure
 */
export interface ApiResponse<T> {
  success: boolean;
  source?: 'api' | 'cache';
  data?: T;
  error?: string;
  errorDetails?: string;
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
