// src/content/index.ts - Main content script entry point

import { ProductData } from '../types';
import { extractAmazonProductData } from './extractors/amazon';
import { extractWalmartProductData } from './extractors/walmart';
import { extractTargetProductData } from './extractors/target';
import { extractHomeDepotProductData } from './extractors/homedepot';
import { runSelectorDebugger, highlightSelectors } from './utils/selectorTester';
import { runSearchSelectorDebugger, highlightSearchResultElements } from './utils/searchSelectorTester';

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
  console.log('[E-commerce Arbitrage] Content script executed - attempting to extract product data');
  
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
 * Determine if the current page is a search results page
 * 
 * @returns Boolean indicating if this is a search page
 */
function isSearchPage() {
  const url = window.location.href;
  
  // Amazon search pages
  if (url.includes('amazon.com/s?') || url.includes('amazon.com/s/?') || url.includes('amazon.com/search/')) {
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
