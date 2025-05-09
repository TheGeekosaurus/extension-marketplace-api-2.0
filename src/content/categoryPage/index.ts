// src/content/categoryPage/index.ts
// Entry point for the category page processing module

export * from './types';
export * from './amazonCategoryScraper';
export * from './walmartCategoryScraper';
export * from './categoryBatchProcessor';
export * from './categoryBatchMatcher';

import { initCategoryPageProcessing } from './categoryBatchProcessor';

// Initialize when imported
export function initCategoryMode(): void {
  // This function can be called to initialize category mode
  try {
    console.log('[E-commerce Arbitrage] Initializing category mode...');
    initCategoryPageProcessing();
  } catch (error) {
    console.error('[E-commerce Arbitrage] Error initializing category mode:', error);
  }
}