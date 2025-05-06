// src/matchFinder/index.ts - Main entry point for match finder

import { ProductData } from '../types';
import { createLogger } from './utils/logger';
import { openSearchTab, closeTab, sendMessageToTab } from './utils/messaging';
import { createSearchUrl } from './utils/common';
import { SupportedMarketplace, MatchResult, MatchFinderOptions, ExtractedMatch } from './types';
import { extractProductFromAmazon } from './extractors/amazon';
import { extractProductFromWalmart } from './extractors/walmart';
import { calculateTitleSimilarity } from './scoring/similarity';

// Initialize logger
const logger = createLogger('MatchFinder');

/**
 * Main function to find a match in the background
 * 
 * @param sourceProduct - Source product to find matches for
 * @param targetMarketplace - Marketplace to search in
 * @param options - Additional options
 * @returns Promise that resolves with match result
 */
export async function findMatch(
  sourceProduct: ProductData,
  targetMarketplace: SupportedMarketplace,
  options: MatchFinderOptions = {}
): Promise<MatchResult> {
  logger.info(`Starting match search for ${targetMarketplace}`, {
    product: sourceProduct.title,
    marketplace: targetMarketplace
  });
  
  try {
    // Create search URL
    const searchUrl = createSearchUrl(sourceProduct, targetMarketplace);
    logger.info(`Created search URL: ${searchUrl}`);
    
    // Save source product to storage for the content script to access
    await storeSourceProduct(sourceProduct);
    
    // Open search tab in background
    const searchTab = await openSearchTab(searchUrl);
    
    if (!searchTab || !searchTab.id) {
      throw new Error('Failed to open search tab');
    }
    
    logger.info(`Opened search tab with ID: ${searchTab.id}`);
    
    // Wait for match to be found or timeout
    const result = await waitForMatchResult(searchTab.id, options.timeout || 30000);
    
    // Close the search tab
    if (searchTab.id) {
      await closeTab(searchTab.id);
    }
    
    return result;
  } catch (error) {
    logger.error('Error in match finding:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  } finally {
    // Clean up storage
    await cleanupStorage();
  }
}

/**
 * Store source product in chrome storage for content script access
 * 
 * @param sourceProduct - Product to store
 * @returns Promise that resolves when storage is updated
 */
async function storeSourceProduct(sourceProduct: ProductData): Promise<void> {
  return new Promise<void>((resolve) => {
    chrome.storage.local.set({ 
      manualMatchSourceProduct: sourceProduct,
      manualMatchInProgress: true
    }, () => {
      resolve();
    });
  });
}

/**
 * Clean up storage after match finding
 * 
 * @returns Promise that resolves when storage is updated
 */
async function cleanupStorage(): Promise<void> {
  return new Promise<void>((resolve) => {
    chrome.storage.local.set({ 
      manualMatchInProgress: false
    }, () => {
      resolve();
    });
  });
}

/**
 * Wait for match result from content script
 * 
 * @param tabId - Tab ID to listen for messages from
 * @param timeout - Timeout in milliseconds
 * @returns Promise that resolves with match result
 */
function waitForMatchResult(tabId: number, timeout: number): Promise<MatchResult> {
  return new Promise<MatchResult>((resolve) => {
    // Set up message listener
    const messageListener = (message: any, sender: chrome.runtime.MessageSender) => {
      // Only listen for messages from our search tab
      if (sender.tab?.id === tabId) {
        if (message.action === 'MANUAL_MATCH_FOUND') {
          chrome.runtime.onMessage.removeListener(messageListener);
          resolve({
            success: true,
            match: message.match
          });
        } else if (message.action === 'MANUAL_MATCH_NOT_FOUND') {
          chrome.runtime.onMessage.removeListener(messageListener);
          resolve({
            success: false,
            error: 'No suitable match found'
          });
        } else if (message.action === 'MANUAL_MATCH_ERROR') {
          chrome.runtime.onMessage.removeListener(messageListener);
          resolve({
            success: false,
            error: message.error || 'Unknown error in match finding'
          });
        }
      }
    };
    
    chrome.runtime.onMessage.addListener(messageListener);
    
    // Set timeout
    setTimeout(() => {
      chrome.runtime.onMessage.removeListener(messageListener);
      resolve({
        success: false,
        error: 'Timeout waiting for match result'
      });
    }, timeout);
  });
}

/**
 * Extract best match from the loaded search page
 * 
 * @param sourceProduct - Source product to match against
 * @param document - Document object from the search page
 * @param marketplace - Marketplace being searched
 * @returns The best matching product or null if no good match found
 */
export function extractBestMatch(
  sourceProduct: ProductData,
  document: Document,
  marketplace: SupportedMarketplace
): ExtractedMatch | null {
  logger.info(`Extracting best match from ${marketplace}`);
  
  try {
    // Extract products based on marketplace
    let extractedProducts: ExtractedMatch[] = [];
    
    if (marketplace === 'amazon') {
      extractedProducts = extractProductFromAmazon(document, sourceProduct);
    } else if (marketplace === 'walmart') {
      extractedProducts = extractProductFromWalmart(document, sourceProduct);
    } else {
      throw new Error(`Unsupported marketplace: ${marketplace}`);
    }
    
    logger.info(`Extracted ${extractedProducts.length} products`);
    
    if (extractedProducts.length === 0) {
      return null;
    }
    
    // Sort by similarity score (highest first)
    extractedProducts.sort((a, b) => b.similarityScore - a.similarityScore);
    
    // Get the best match
    const bestMatch = extractedProducts[0];
    
    // Only return if it has a decent similarity score
    if (bestMatch.similarityScore < 0.3) {
      logger.warn(`Best match has low similarity score: ${bestMatch.similarityScore}`);
    }
    
    return bestMatch;
  } catch (error) {
    logger.error('Error extracting best match:', error);
    return null;
  }
}
