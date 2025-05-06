// src/content/matchFinderIntegration.ts - Content script integration with the match finder module

import { ProductData } from '../types';
import { extractBestMatch } from '../matchFinder';
import { SupportedMarketplace } from '../matchFinder/types';

/**
 * Initialize the match finder integration
 * This should be called when the content script loads
 */
export function initMatchFinderIntegration(): void {
  console.log('[E-commerce Arbitrage] Match finder integration initialized');
  
  // Check if this is part of a manual match search
  checkForManualMatchSearch();
}

/**
 * Check if this page load is part of a manual match search
 */
function checkForManualMatchSearch(): void {
  console.log('[E-commerce Arbitrage] Checking for manual match search');
  
  chrome.storage.local.get(['manualMatchInProgress', 'manualMatchSourceProduct'], (result) => {
    if (result.manualMatchInProgress && result.manualMatchSourceProduct) {
      console.log('[E-commerce Arbitrage] Manual match search is in progress, finding best match...');
      
      // Wait for page to load fully
      if (document.readyState === 'complete') {
        processManualSearch(result.manualMatchSourceProduct);
      } else {
        window.addEventListener('load', () => {
          processManualSearch(result.manualMatchSourceProduct);
        });
      }
    }
  });
}

/**
 * Process a manual search when the page is loaded
 * 
 * @param sourceProduct - Source product to match against
 */
async function processManualSearch(sourceProduct: ProductData): Promise<void> {
  console.log('[E-commerce Arbitrage] Processing manual search for:', sourceProduct);
  
  // Delay to allow dynamic content to load
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  try {
    // Determine the marketplace from the URL
    const marketplace = determineMarketplace();
    
    if (!marketplace) {
      console.error('[E-commerce Arbitrage] Could not determine marketplace from URL');
      sendMatchResult({
        action: 'MANUAL_MATCH_ERROR',
        error: 'Could not determine marketplace from URL'
      });
      return;
    }
    
    // Extract the best match
    const bestMatch = extractBestMatch(sourceProduct, document, marketplace);
    
    if (bestMatch) {
      console.log('[E-commerce Arbitrage] Best match found:', bestMatch);
      
      // Send the match back to the extension
      sendMatchResult({
        action: 'MANUAL_MATCH_FOUND',
        match: bestMatch
      });
    } else {
      console.warn('[E-commerce Arbitrage] No good match found');
      
      // Send message that no match was found
      sendMatchResult({
        action: 'MANUAL_MATCH_NOT_FOUND'
      });
    }
  } catch (error) {
    console.error('[E-commerce Arbitrage] Error finding match:', error);
    
    // Send error message back
    sendMatchResult({
      action: 'MANUAL_MATCH_ERROR',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Determine the marketplace from the current URL
 * 
 * @returns The marketplace or null if not supported
 */
function determineMarketplace(): SupportedMarketplace | null {
  const url = window.location.href;
  
  if (url.includes('amazon.com')) {
    return 'amazon';
  } else if (url.includes('walmart.com')) {
    return 'walmart';
  }
  
  return null;
}

/**
 * Send a match result back to the extension
 * 
 * @param message - Message to send
 */
function sendMatchResult(message: any): void {
  console.log('[E-commerce Arbitrage] Sending match result:', message);
  
  chrome.runtime.sendMessage(message, (response) => {
    if (chrome.runtime.lastError) {
      console.error('[E-commerce Arbitrage] Error sending match result:', chrome.runtime.lastError);
    } else {
      console.log('[E-commerce Arbitrage] Match result sent successfully:', response);
    }
  });
}
