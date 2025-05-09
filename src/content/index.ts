// src/content/index.ts - Main content script entry point

import { ProductData } from '../types';
import { extractAmazonProductData } from './extractors/amazon';
import { extractWalmartProductData } from './extractors/walmart';
import { extractTargetProductData } from './extractors/target';
import { extractHomeDepotProductData } from './extractors/homedepot';
import { runSelectorDebugger, highlightSelectors } from './utils/selectorTester';
import { runSearchSelectorDebugger, highlightSearchResultElements } from './utils/searchSelectorTester';
import { initCategoryMode } from './categoryPage';

/**
 * Main function to extract product data based on current page
 * 
 * @returns Extracted product data or null if extraction fails
 */
async function extractProductData(): Promise<ProductData | null> {
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
    } else if (url.includes('homedepot.com')) {
      console.log('[E-commerce Arbitrage] Detected HomeDepot page');
      // Handle the Promise returned by extractHomeDepotProductData
      return await extractHomeDepotProductData();
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
  console.log('[E-commerce Arbitrage] Content script executed - determining mode and processing page');
  
  // Always use the standard extraction on page load
  // Category mode will only be triggered manually from the popup
  performStandardExtraction();
}

/**
 * Perform standard product extraction for individual products
 */
function performStandardExtraction() {
  console.log('[E-commerce Arbitrage] Performing standard product extraction');
  
  extractProductData()
    .then(productData => {
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
    })
    .catch(error => {
      console.error('[E-commerce Arbitrage] Error in extractProductData:', error);
    });
}

/**
 * Get the current marketplace from the URL
 * 
 * @returns Marketplace type or null if not supported
 */
function getCurrentMarketplace() {
  const url = window.location.href;
  
  if (url.includes('amazon.com')) return 'amazon';
  if (url.includes('walmart.com')) return 'walmart';
  if (url.includes('target.com')) return 'target';
  if (url.includes('homedepot.com')) return 'homedepot';
  
  return null;
}

/**
 * Determine if the current page is a search results or category page
 * 
 * @returns Boolean indicating if this is a search/category page
 */
function isSearchPage() {
  const url = window.location.href;
  
  // Amazon search and category pages
  if (
    // Standard search pages
    url.includes('amazon.com/s?') || 
    url.includes('amazon.com/s/?') || 
    url.includes('amazon.com/search/') ||
    // Category browse pages
    url.includes('amazon.com/b?') ||
    url.includes('amazon.com/b/?') ||
    url.includes('/b/ref=') ||
    url.includes('node=') ||
    // Check for grid of products in the DOM
    (url.includes('amazon.com') && document.querySelectorAll('.s-result-item').length > 5)
  ) {
    return true;
  }
  
  // Walmart search pages
  if (url.includes('walmart.com/search') || url.includes('walmart.com/browse')) {
    return true;
  }
  
  // Target search pages
  if (url.includes('target.com/s?') || url.includes('target.com/search')) {
    return true;
  }
  
  // Home Depot search pages
  if (url.includes('homedepot.com/s/') || url.includes('homedepot.com/b/')) {
    return true;
  }
  
  return false;
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[E-commerce Arbitrage] Received message in content script:', message);
  
  if (message.action === 'GET_PRODUCT_DATA') {
    console.log('[E-commerce Arbitrage] Retrieving fresh product data');
    
    extractProductData()
      .then(productData => {
        console.log('[E-commerce Arbitrage] Sending product data response:', productData);
        sendResponse({ productData });
      })
      .catch(error => {
        console.error('[E-commerce Arbitrage] Error retrieving product data:', error);
        sendResponse({ error: error instanceof Error ? error.toString() : String(error) });
      });
    
    return true; // Keep the message channel open for async response
  }
  
  // Listen for match results being forwarded from background script
  if (message.action === 'MANUAL_MATCH_FOUND') {
    console.log('[E-commerce Arbitrage] Received match result:', message.match);
    return true;
  }
  
  if (message.action === 'MANUAL_MATCH_NOT_FOUND') {
    console.log('[E-commerce Arbitrage] No match found in background search');
    return true;
  }
  
  if (message.action === 'MANUAL_MATCH_ERROR') {
    console.error('[E-commerce Arbitrage] Error in background search:', message.error);
    return true;
  }
  
  // Handle category mode toggle
  if (message.action === 'TOGGLE_CATEGORY_MODE') {
    console.log('[E-commerce Arbitrage] Toggling category mode:', message.enabled);
    
    if (message.enabled && isSearchPage()) {
      // Initialize category mode if we're on a search/category page
      initCategoryMode();
      sendResponse({ success: true, status: 'category_mode_initialized' });
    } else if (message.enabled) {
      sendResponse({ success: false, error: 'Not on a search or category page' });
    } else {
      sendResponse({ success: true, status: 'category_mode_disabled' });
    }
    
    return true;
  }
  
  // Handle selector testing request
  if (message.action === 'DEBUG_SELECTORS') {
    const marketplace = getCurrentMarketplace();
    
    if (!marketplace) {
      sendResponse({ 
        success: false, 
        error: 'Not on a supported marketplace page' 
      });
      return true;
    }
    
    // Check if on search page or product page
    const isSearch = isSearchPage();
    console.log(`[E-commerce Arbitrage] Running selector debugger for ${marketplace} on ${isSearch ? 'search' : 'product'} page`);
    
    // Run appropriate debugger
    const results = isSearch 
      ? runSearchSelectorDebugger(marketplace)
      : runSelectorDebugger(marketplace);
    
    sendResponse({ 
      success: true, 
      marketplace,
      pageType: isSearch ? 'search' : 'product',
      results
    });
    
    return true;
  }
  
  // Handle selector highlighting request
  if (message.action === 'HIGHLIGHT_SELECTORS') {
    const marketplace = getCurrentMarketplace();
    
    if (!marketplace) {
      sendResponse({ 
        success: false, 
        error: 'Not on a supported marketplace page' 
      });
      return true;
    }
    
    // Check if on search page or product page
    const isSearch = isSearchPage();
    console.log(`[E-commerce Arbitrage] Highlighting selectors for ${marketplace} on ${isSearch ? 'search' : 'product'} page`);
    
    // Highlight elements appropriately
    if (isSearch) {
      highlightSearchResultElements(marketplace);
    } else {
      highlightSelectors(marketplace);
    }
    
    sendResponse({ 
      success: true, 
      marketplace,
      pageType: isSearch ? 'search' : 'product'
    });
    
    return true;
  }
  
  // Handle category page processing
  if (message.action === 'INIT_CATEGORY_MODE') {
    if (isSearchPage()) {
      console.log('[E-commerce Arbitrage] Initializing category mode from popup request');
      initCategoryMode();
      sendResponse({ success: true });
    } else {
      console.log('[E-commerce Arbitrage] Not on a search/category page, cannot initialize category mode');
      sendResponse({ success: false, error: 'Not on a search or category page' });
    }
    return true;
  }
  
  // Handle starting the batch processing
  if (message.action === 'START_CATEGORY_BATCH_PROCESSING') {
    console.log('[E-commerce Arbitrage] Received request to start category batch processing with method:', message.method);
    
    // Set the matching method flag in storage before initializing
    const useApiMatching = message.method === 'api';
    chrome.storage.local.set({ useApiMatching });
    
    // First ensure category mode is initialized
    if (isSearchPage()) {
      console.log('[E-commerce Arbitrage] Ensuring category mode is initialized');
      console.log(`[E-commerce Arbitrage] Will use ${useApiMatching ? 'API' : 'browser'}-based matching`);
      initCategoryMode();
      
      // Give time for the DOM to update with the button
      setTimeout(() => {
        // Find the batch processing button and click it programmatically
        const batchButton = document.getElementById('extension-start-batch-processing');
        if (batchButton) {
          console.log('[E-commerce Arbitrage] Found batch processing button, triggering click');
          batchButton.click();
          sendResponse({ success: true });
        } else {
          console.error('[E-commerce Arbitrage] Batch processing button not found. Category mode may not be initialized properly.');
          sendResponse({ success: false, error: 'Batch processing button not found. Try scraping the page again.' });
        }
      }, 500);
    } else {
      console.error('[E-commerce Arbitrage] Cannot process batch - not on a search/category page');
      sendResponse({ success: false, error: 'Not on a search or category page.' });
    }
    return true;
  }
  
  return true; // Keep the message channel open for async response
});

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

// Execute main function immediately in case the page is already loaded
// This helps with pages that don't trigger the load event
console.log('[E-commerce Arbitrage] Running initial extraction attempt');
setTimeout(main, 500);
