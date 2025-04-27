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
  
  try {
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
  } catch (error) {
    console.error('[E-commerce Arbitrage] Error in main extraction:', error);
    return null;
  }
}

/**
 * Extract data and send to background script
 */
function main() {
  console.log('[E-commerce Arbitrage] Content script executed - attempting to extract product data');
  try {
    const productData = extractProductData();
    
    if (productData) {
      // Send product data to background script
      chrome.runtime.sendMessage({
        action: 'PRODUCT_DATA_EXTRACTED',
        data: productData
      }, response => {
        if (chrome.runtime.lastError) {
          console.error('[E-commerce Arbitrage] Error sending product data:', chrome.runtime.lastError);
        } else {
          console.log('[E-commerce Arbitrage] Product data sent to background script with response:', response);
        }
      });
      
      console.log('[E-commerce Arbitrage] Product data extracted and sent:', productData);
    } else {
      console.warn('[E-commerce Arbitrage] No product data could be extracted from this page.');
    }
  } catch (error) {
    console.error('[E-commerce Arbitrage] Error in main function:', error);
  }
}

// Wait for page to fully load before extracting data
console.log('[E-commerce Arbitrage] Content script loaded, waiting for window load event');

// Run extraction on document complete
if (document.readyState === 'complete') {
  console.log('[E-commerce Arbitrage] Document already complete, running extraction');
  setTimeout(main, 500);
} else {
  window.addEventListener('load', () => {
    // Wait a bit longer for dynamic content to load
    console.log('[E-commerce Arbitrage] Window loaded, waiting additional time for dynamic content');
    setTimeout(main, 1500);
  });
}

// Re-extract when user navigates using browser back/forward
window.addEventListener('popstate', () => {
  console.log('[E-commerce Arbitrage] Navigation detected, re-extracting product data');
  setTimeout(main, 1500);
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[E-commerce Arbitrage] Received message in content script:', message);
  
  if (message.action === 'GET_PRODUCT_DATA') {
    console.log('[E-commerce Arbitrage] Retrieving fresh product data');
    try {
      const productData = extractProductData();
      console.log('[E-commerce Arbitrage] Sending product data response:', productData);
      sendResponse({ productData });
    } catch (error) {
      console.error('[E-commerce Arbitrage] Error retrieving product data:', error);
      sendResponse({ error: error.toString() });
    }
  }
  return true; // Keep the message channel open for async response
});

// Execute main function immediately in case the page is already loaded
// This helps with pages that don't trigger the load event
console.log('[E-commerce Arbitrage] Running initial extraction attempt');
setTimeout(main, 500);
