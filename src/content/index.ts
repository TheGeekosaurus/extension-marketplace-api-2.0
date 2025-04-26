// src/content/index.ts - Main content script entry point

import { ProductData } from '../types';
import { extractAmazonProductData } from './extractors/amazon';
import { extractWalmartProductData } from './extractors/walmart';
import { extractTargetProductData } from './extractors/target';

/**
 * Main function to extract product data based on current page
 * 
 * @returns Extracted product data or null if extraction fails
 */
function extractProductData(): ProductData | null {
  const url = window.location.href;
  console.log('[E-commerce Arbitrage] Attempting to extract data from URL:', url);
  
  // Determine which marketplace we're on
  if (url.includes('amazon.com')) {
    console.log('[E-commerce Arbitrage] Detected Amazon page');
    return extractAmazonProductData();
  } else if (url.includes('walmart.com')) {
    console.log('[E-commerce Arbitrage] Detected Walmart page');
    return extractWalmartProductData();
  } else if (url.includes('target.com')) {
    console.log('[E-commerce Arbitrage] Detected Target page');
    return extractTargetProductData();
  }
  
  console.log('[E-commerce Arbitrage] No supported marketplace detected');
  return null;
}
