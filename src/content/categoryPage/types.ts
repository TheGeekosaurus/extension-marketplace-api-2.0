// src/content/categoryPage/types.ts
// Type definitions for category page scraping

import { ProductData } from '../../types';

/**
 * Interface for category page scrapers
 */
export interface CategoryPageScraper {
  // Identification
  marketplace: string;
  
  // Core methods
  canHandlePage(): boolean;
  findCategoryProducts(): Element[];
  extractProductData(element: Element): Partial<ProductData> | null;
  
  // Optional methods
  preparePage?(): Promise<void>;
}

/**
 * BatchProcessingOptions for controlling category page processing
 */
export interface BatchProcessingOptions {
  batchSize: number;
  maxProducts: number;
  minPrice?: number;
  maxPrice?: number;
  includeSponsored: boolean;
  priorityOrder: 'price_asc' | 'price_desc' | 'position';
}

/**
 * CategoryPageResult returned from batch processing
 */
export interface CategoryPageResult {
  products: ProductData[];
  marketplace: string;
  categoryName: string | null;
  pageUrl: string;
  timestamp: number;
  totalProductsFound: number;
  processedProducts: number;
}