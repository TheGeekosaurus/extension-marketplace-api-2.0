// src/matchFinder/types.ts - Type definitions for match finder

import { ProductData } from '../types';

/**
 * Supported marketplaces for background matching
 */
export type SupportedMarketplace = 'amazon' | 'walmart';

/**
 * Configuration options for match finder
 */
export interface MatchFinderOptions {
  /**
   * Timeout in milliseconds for search operation
   */
  timeout?: number;
  
  /**
   * Minimum similarity threshold for accepting a match
   */
  minSimilarity?: number;
  
  /**
   * Whether to use brand in the search query
   */
  includeBrand?: boolean;
  
  /**
   * Maximum number of words to use from title
   */
  maxTitleWords?: number;
}

/**
 * Result of a match finding operation
 */
export interface MatchResult {
  /**
   * Whether the operation was successful
   */
  success: boolean;
  
  /**
   * Error message if not successful
   */
  error?: string;
  
  /**
   * Matched product if successful
   */
  match?: {
    title: string;
    price: number;
    url: string;
    imageUrl: string;
    marketplace: SupportedMarketplace;
    similarityScore: number;
    searchUrl?: string; // Add search URL for "View Search" button
  };
}

/**
 * Extracted product data from search page
 */
export interface ExtractedMatch {
  /**
   * Product title
   */
  title: string;
  
  /**
   * Product price
   */
  price: number;
  
  /**
   * Product URL
   */
  url: string;
  
  /**
   * Product image URL
   */
  imageUrl: string;
  
  /**
   * Similarity score to source product
   */
  similarityScore: number;
  
  /**
   * Marketplace of the product
   */
  marketplace: SupportedMarketplace;
  
  /**
   * DOM element containing the product (optional)
   */
  element?: Element;
}

/**
 * Status of a search operation
 */
export enum SearchStatus {
  IDLE = 'idle',
  INITIALIZING = 'initializing',
  SEARCHING = 'searching',
  EXTRACTING = 'extracting',
  SCORING = 'scoring',
  COMPLETE = 'complete',
  ERROR = 'error'
}

/**
 * Progress of a search operation
 */
export interface SearchProgress {
  /**
   * Current status
   */
  status: SearchStatus;
  
  /**
   * Progress percentage
   */
  percentage: number;
  
  /**
   * Status message
   */
  message: string;
}
