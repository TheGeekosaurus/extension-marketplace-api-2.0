// src/content/matchFinderIntegration.ts - Content script integration with the match finder module

import { ProductData } from '../types';
import { extractBestMatch } from '../matchFinder';
import { SupportedMarketplace } from '../matchFinder/types';
import { createLogger } from '../matchFinder/utils/logger';

const logger = createLogger('MatchFinderIntegration');

/**
 * Initialize the match finder integration
 * This should be called when the content script loads
 */
export function initMatchFinderIntegration(): void {
  logger.info('Match finder integration initialized');
  
  // Check if this is part of a manual match search
  checkForManualMatchSearch();
}

/**
 * Check if this page load is part of a manual match search
 */
function checkForManualMatchSearch(): void {
  logger.info('Checking for manual match search');
  
  chrome.storage.local.get(['manualMatchInProgress', 'manualMatchSourceProduct'], (result) => {
    if (result.manualMatchInProgress && result.manualMatchSourceProduct) {
      logger.info('Manual match search is in progress, finding best match...');
      
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
  logger.info('Processing manual search for:', sourceProduct);
  
  // Delay to allow dynamic content to load
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  try {
    // Determine the marketplace from the URL
    const marketplace = determineMarketplace();
    
    if (!marketplace) {
      logger.error('Could not determine marketplace from URL');
      sendMatchResult({
        action: 'MANUAL_MATCH_ERROR',
        error: 'Could not determine marketplace from URL'
      });
      return;
    }
    
    // Get the current URL for the "View Search" button
    const searchUrl = window.location.href;
    
    // Extract the best match
    const bestMatch = extractBestMatch(sourceProduct, document, marketplace);
    
    if (bestMatch) {
      logger.info('Best match found:', bestMatch);
      
      // Add the search URL to the match
      const matchWithSearchUrl = {
        ...bestMatch,
        searchUrl
      };
      
      // Send the match back to the extension
      sendMatchResult({
        action: 'MANUAL_MATCH_FOUND',
        match: matchWithSearchUrl
      });
    } else {
      logger.warn('No good match found');
      
      // Send message that no match was found
      sendMatchResult({
        action: 'MANUAL_MATCH_NOT_FOUND'
      });
    }
  } catch (error) {
    logger.error('Error finding match:', error);
    
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
  logger.info('Sending match result:', message);
  
  chrome.runtime.sendMessage(message, (response) => {
    if (chrome.runtime.lastError) {
      logger.error('Error sending match result:', chrome.runtime.lastError);
    } else {
      logger.info('Match result sent successfully:', response);
    }
  });
}
