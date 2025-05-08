// src/content/matchFinder/core/types.ts
// Type definitions for the matchFinder module

import { ProductData } from '../../../types';

/**
 * Product match result from a search page
 */
export interface ProductMatchResult {
  // Basic product information
  title: string;
  price: number;
  marketplace: string;
  url: string;
  image?: string;
  
  // Marketplace-specific identifiers
  asin?: string;        // Amazon
  item_id?: string;     // Walmart
  tcin?: string;        // Target
  sku?: string;         // Home Depot
  upc?: string;         // Universal
  
  // Matching information
  similarityScore: number;
  matchReason?: string;
  
  // Additional product details
  brand?: string;
  ratings?: {
    average: number | null;
    count: number | null;
  };
  
  // Reference to source product and search
  sourceProductId?: string;
  searchUrl?: string;
}

/**
 * Configuration for match finding
 */
export interface MatchFinderConfig {
  // Matching thresholds
  minSimilarityScore: number;
  maxResults: number;
  
  // Debugging options
  debug: boolean;
  highlightResults: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  
  // Timeout settings
  searchTimeout: number;
  extractionTimeout: number;
}

/**
 * Interface for marketplace-specific matcher implementations
 */
export interface MarketplaceMatcher {
  // Identification
  marketplace: string;
  
  // Core methods
  findSearchResultElements(): Element[];
  extractSearchResult(element: Element): Partial<ProductMatchResult> | null;
  calculateSimilarity(sourceTitle: string, resultTitle: string): number;
  
  // Optional methods
  canHandlePage?(): boolean;
  prepareSearchPage?(): Promise<void>;
}

/**
 * Match finder result
 */
export interface MatchFinderResult {
  success: boolean;
  match?: ProductMatchResult;
  allMatches?: ProductMatchResult[];
  error?: string;
  searchUrl?: string;
  sourceProduct?: ProductData;
  timing?: {
    searchStart: number;
    elementsFound: number;
    extractionComplete: number;
    matchingComplete: number;
    total: number;
  };
}