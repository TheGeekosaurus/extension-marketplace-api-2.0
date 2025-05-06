// src/content/index.ts - Main content script entry point

import { ProductData } from '../types';
import { extractAmazonProductData } from './extractors/amazon';
import { extractWalmartProductData } from './extractors/walmart';
import { extractTargetProductData } from './extractors/target';
import { extractHomeDepotProductData } from './extractors/homedepot';
import { runSelectorDebugger, highlightSelectors } from './utils/selectorTester';

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
  // FIX 1: Remove the manual match notification display
  if (message.action === 'MANUAL_MATCH_FOUND') {
    console.log('[E-commerce Arbitrage] Received match result:', message.match);
    // We're removing the notification display to prevent the dialog box
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
  
  // NEW: Handle selector testing request
  if (message.action === 'DEBUG_SELECTORS') {
    const marketplace = getCurrentMarketplace();
    
    if (!marketplace) {
      sendResponse({ 
        success: false, 
        error: 'Not on a supported marketplace page' 
      });
      return true;
    }
    
    console.log(`[E-commerce Arbitrage] Running selector debugger for ${marketplace}`);
    const results = runSelectorDebugger(marketplace);
    
    sendResponse({ 
      success: true, 
      marketplace,
      results
    });
    
    return true;
  }
  
  // NEW: Handle selector highlighting request
  if (message.action === 'HIGHLIGHT_SELECTORS') {
    const marketplace = getCurrentMarketplace();
    
    if (!marketplace) {
      sendResponse({ 
        success: false, 
        error: 'Not on a supported marketplace page' 
      });
      return true;
    }
    
    console.log(`[E-commerce Arbitrage] Highlighting selectors for ${marketplace}`);
    highlightSelectors(marketplace);
    
    sendResponse({ 
      success: true, 
      marketplace
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
