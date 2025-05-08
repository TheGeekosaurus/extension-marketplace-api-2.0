<<<<<<< Updated upstream
// src/content/matchFinder.ts - Find best matching product on search results pages

import { ProductData } from '../types';

/**
 * Main function to initialize the match finder on search results pages
 */
function initMatchFinder() {
  console.log('[E-commerce Arbitrage] Match finder script loaded on search results page');
  
  // Check if this is part of a manual match search
  chrome.storage.local.get(['manualMatchInProgress', 'manualMatchSourceProduct'], (result) => {
    if (result.manualMatchInProgress && result.manualMatchSourceProduct) {
      console.log('[E-commerce Arbitrage] Manual match search is in progress, finding best match...');
      loadSourceProductAndFindMatch(true);
    } else {
      console.log('[E-commerce Arbitrage] Regular match finder initialized');
      
      // Wait for page to fully load
      if (document.readyState === 'complete') {
        loadSourceProductAndFindMatch(false);
      } else {
        window.addEventListener('load', () => loadSourceProductAndFindMatch(false));
      }
    }
  });
}

/**
 * Load the source product from storage and find its match on the current page
 * @param isBackgroundSearch Whether this is a background search that should send results back
 */
async function loadSourceProductAndFindMatch(isBackgroundSearch: boolean = false) {
  // Delay a bit to allow all dynamic content to load
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Get the source product from local storage
  chrome.storage.local.get(['manualMatchSourceProduct'], async (result) => {
    const sourceProduct = result.manualMatchSourceProduct as ProductData | undefined;
    
    if (!sourceProduct) {
      console.warn('[E-commerce Arbitrage] No source product found in storage for matching');
      return;
    }
    
    console.log('[E-commerce Arbitrage] Finding best match for:', sourceProduct);
    
    try {
      // Find the best match on the page
      const bestMatch = await findBestMatchOnPage(sourceProduct);
      
      if (bestMatch) {
        console.log('[E-commerce Arbitrage] Best match found:', bestMatch);
        
        if (isBackgroundSearch) {
          // If this is a background search, send the result back to the original tab
          chrome.runtime.sendMessage({
            action: 'MANUAL_MATCH_FOUND',
            match: bestMatch
          });
        } else {
          // Regular workflow - highlight the matched product
          highlightMatchedProduct(bestMatch.element, sourceProduct, bestMatch);
        }
      } else {
        console.warn('[E-commerce Arbitrage] No good matches found on this page');
        
        if (isBackgroundSearch) {
          // Send message that no match was found
          chrome.runtime.sendMessage({
            action: 'MANUAL_MATCH_NOT_FOUND'
          });
        }
      }
    } catch (error) {
      console.error('[E-commerce Arbitrage] Error finding match:', error);
      
      if (isBackgroundSearch) {
        // Send error message back
        chrome.runtime.sendMessage({
          action: 'MANUAL_MATCH_ERROR',
          error: String(error)
        });
      }
=======
// src/content/matchFinder.ts
// Main entry point for the matchFinder content script that runs on search pages

import { MatchFinder, createLogger, LogLevel } from './matchFinder/index';
import { ProductData } from '../types';

// Initialize logger
const logger = createLogger('MatchFinder');
logger.setLevel(LogLevel.INFO);

/**
 * Initialize the match finder
 * This runs on Amazon and Walmart search pages
 */
function initializeMatchFinder(): void {
  logger.info('Match finder initializing on search page:', window.location.href);
  
  // Check if a manual match search is in progress
  chrome.storage.local.get(['manualMatchInProgress', 'manualMatchSourceProduct'], (result) => {
    if (result.manualMatchInProgress && result.manualMatchSourceProduct) {
      logger.info('Manual match in progress with source product:', result.manualMatchSourceProduct.title);
      
      try {
        // Add a timeout safety mechanism to prevent hanging
        const searchTimeout = setTimeout(() => {
          logger.error('Match finding timed out after 30 seconds');
          
          // Clean up storage state to prevent future issues
          chrome.storage.local.set({ manualMatchInProgress: false });
          
          // Send timeout error message
          chrome.runtime.sendMessage({
            action: 'MANUAL_MATCH_ERROR',
            error: 'Match finding operation timed out after 30 seconds.'
          });
        }, 30000); // 30 second timeout
        
        // Initialize the matcher with the source product
        const matcher = new MatchFinder({
          minSimilarityScore: 0.7,
          maxResults: 5,
          searchTimeout: 25000, // Slightly less than our global timeout
          logLevel: 'debug'     // More detailed logging for troubleshooting
        });
        
        // Set the source product
        matcher.setSourceProduct(result.manualMatchSourceProduct);
        
        // Find matches with improved error handling
        matcher.findMatches()
          .then(matchResult => {
            // Clear the timeout since operation completed
            clearTimeout(searchTimeout);
            
            // Process the result
            handleMatchResult(matchResult, result.manualMatchSourceProduct);
          })
          .catch(error => {
            // Clear the timeout since operation errored
            clearTimeout(searchTimeout);
            
            logger.error('Error finding matches:', error);
            
            // Clean up storage state
            chrome.storage.local.set({ manualMatchInProgress: false });
            
            // Send error message back
            chrome.runtime.sendMessage({
              action: 'MANUAL_MATCH_ERROR',
              error: error instanceof Error ? error.message : String(error)
            });
          });
      } catch (error) {
        // Handle any errors in the initialization process
        logger.error('Error initializing match finder:', error);
        
        // Clean up storage state
        chrome.storage.local.set({ manualMatchInProgress: false });
        
        // Send error message
        chrome.runtime.sendMessage({
          action: 'MANUAL_MATCH_ERROR',
          error: error instanceof Error ? error.message : String(error)
        });
      }
    } else {
      logger.info('No manual match in progress, exiting');
>>>>>>> Stashed changes
    }
  });
}

/**
 * Find the best matching product on the current search results page
 * @param sourceProduct - The source product to match
 * @returns The best matching product or null if no good match found
 */
async function findBestMatchOnPage(sourceProduct: ProductData) {
  // Different selectors based on marketplace
  const isAmazon = window.location.hostname.includes('amazon.com');
  const isWalmart = window.location.hostname.includes('walmart.com');
  
  let productElements: Element[] = [];
  
  // Wait a bit more for dynamic content to fully load
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  if (isAmazon) {
    productElements = Array.from(document.querySelectorAll('.s-result-item[data-asin]:not(.AdHolder)'));
  } else if (isWalmart) {
    productElements = Array.from(document.querySelectorAll('[data-item-id], [data-product-id], .search-result-gridview-item'));
  }
  
  if (productElements.length === 0) {
    console.warn('[E-commerce Arbitrage] No product results found on page');
    return null;
  }
  
  console.log(`[E-commerce Arbitrage] Found ${productElements.length} products on search results page`);
  
  // Calculate similarity scores for each product
  const productsWithScores = productElements.map(element => {
    // Extract product title
    let title = '';
    if (isAmazon) {
      title = element.querySelector('h2')?.textContent || '';
    } else if (isWalmart) {
      title = element.querySelector('[data-automation-id="product-title"], .sans-serif.mid-gray')?.textContent || '';
    }
    
    // Extract price
    let price = null;
    if (isAmazon) {
      const priceElement = element.querySelector('.a-price .a-offscreen');
      price = priceElement ? parseFloat(priceElement.textContent?.replace(/[^0-9.]/g, '') || '0') : null;
    } else if (isWalmart) {
      // Try multiple selectors for Walmart prices
      const priceSelectors = [
        // Primary selector for current HTML structure
        'span.w_1UH7',
        // Backup selectors for other possible structures
        '[data-automation-id="product-price"]', 
        '.b.black.f1.mr1', 
        '.w_iUH'
      ];
      
      // Try each selector until we find a valid price
      for (const selector of priceSelectors) {
        const priceElement = element.querySelector(selector);
        if (priceElement) {
          const priceText = priceElement.textContent || '';
          
          // Extract only dollars and cents with a more precise regex
          // This looks for a price format like $XX.XX
          const priceMatch = priceText.match(/\$\s*(\d+(?:\.\d{2})?)/);
          
          if (priceMatch && priceMatch[1]) {
            price = parseFloat(priceMatch[1]);
            
            // Sanity check - if extracted price seems unreasonable (too high)
            if (price > 10000) {
              console.log('[E-commerce Arbitrage] Suspicious price detected:', price);
              price = null; // Reset and try next selector
            } else {
              break; // We found a valid price, stop trying more selectors
            }
          }
        });
      } catch (error) {
        clearTimeout(timeout);
        logger.error('Exception sending message:', error);
        reject(error);
      }
      
      // If we still couldn't find a price, try looking specifically for separate dollar/cents elements
      if (price === null) {
        const wholeDollarElement = element.querySelector('.w_C6.w_D.w_C7.w_Da');
        const centsElement = element.querySelector('.w_C6.w_D.w_C7.w_Db');
        
        if (wholeDollarElement && centsElement) {
          const dollars = wholeDollarElement.textContent?.replace(/[^\d]/g, '') || '0';
          const cents = centsElement.textContent?.replace(/[^\d]/g, '') || '00';
          price = parseFloat(`${dollars}.${cents}`);
        }
      }
    }
    
    // Calculate title similarity score
    const similarityScore = calculateTitleSimilarity(title, sourceProduct.title);
    
    // Get URL
    let url = '';
    if (isAmazon) {
      const linkElement = element.querySelector('a.a-link-normal[href*="/dp/"]');
      url = linkElement ? new URL(linkElement.getAttribute('href') || '', window.location.origin).href : '';
    } else if (isWalmart) {
      const linkElement = element.querySelector('a[link-identifier="linkTest"], a.absolute.w-100.h-100');
      url = linkElement ? new URL(linkElement.getAttribute('href') || '', window.location.origin).href : '';
    }
    
    // Get image
    let imageUrl = '';
    if (isAmazon) {
      const imgElement = element.querySelector('img.s-image');
      imageUrl = imgElement ? imgElement.getAttribute('src') || '' : '';
    } else if (isWalmart) {
      const imgElement = element.querySelector('img[data-automation-id="product-image"], img.absolute');
      imageUrl = imgElement ? imgElement.getAttribute('src') || '' : '';
    }
    
    return {
      element,
      title,
      price,
      similarityScore,
      url,
      imageUrl,
      marketplace: isAmazon ? 'amazon' : 'walmart'
    };
  });
  
  // Filter out products with missing title or price
  const validProducts = productsWithScores.filter(p => p.title && p.price !== null);
  
  // Sort by similarity score (highest first)
  validProducts.sort((a, b) => b.similarityScore - a.similarityScore);
  
  // Get the best match (if any)
  if (validProducts.length === 0) {
    return null;
  }
  
  const bestMatch = validProducts[0];
  
  // Only return match if it has a decent similarity score
  if (bestMatch.similarityScore < 0.3) {
    console.warn('[E-commerce Arbitrage] Best match has low similarity score:', bestMatch.similarityScore);
  }
  
  return bestMatch;
}

/**
 * Calculate similarity between two product titles
 * @param title1 - First product title
 * @param title2 - Second product title
 * @returns Similarity score between 0 and 1
 */
function calculateTitleSimilarity(title1: string, title2: string): number {
  if (!title1 || !title2) return 0;
  
  // Normalize strings
  const normalize = (str: string) => str.toLowerCase().replace(/[^\w\s]/g, '');
  
  const normalizedTitle1 = normalize(title1);
  const normalizedTitle2 = normalize(title2);
  
  // Get words from titles (filter out very short words)
  const words1 = normalizedTitle1.split(/\s+/).filter(w => w.length > 2);
  const words2 = normalizedTitle2.split(/\s+/).filter(w => w.length > 2);
  
  // Count matching words
  let matchCount = 0;
  for (const word1 of words1) {
    if (words2.some(word2 => word2.includes(word1) || word1.includes(word2))) {
      matchCount++;
    }
  }
  
  // Calculate similarity score (0-1)
  return matchCount / Math.max(words1.length, words2.length);
}

/**
 * Highlight the matched product and add selection button
 * @param element - The matched product element
 * @param sourceProduct - The source product
 * @param matchedProduct - The matched product data
 */
function highlightMatchedProduct(
  element: Element, 
  sourceProduct: ProductData, 
  matchedProduct: any
) {
  // Create highlight container
  const highlightContainer = document.createElement('div');
  highlightContainer.id = 'extension-match-highlight';
  const containerStyle = highlightContainer.style;
  containerStyle.cssText = `
    position: fixed;
    top: 0;
    right: 0;
    width: 300px;
    background-color: #fff;
    border: 2px solid #4a6bd8;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    z-index: 10000;
    padding: 16px;
    max-height: 90vh;
    overflow-y: auto;
    font-family: Arial, sans-serif;
  `;
  
  // Calculate profit
  const profit = matchedProduct.price && sourceProduct.price !== null 
    ? matchedProduct.price - sourceProduct.price 
    : 0;
  
  const profitPercent = sourceProduct.price !== null 
    ? (profit / sourceProduct.price) * 100 
    : 0;
  
  // Add content to highlight box
  highlightContainer.innerHTML = `
    <div style="margin-bottom: 8px; text-align: right;">
      <button id="extension-close-highlight" style="border: none; background: none; cursor: pointer; font-size: 16px;">×</button>
    </div>
    <h3 style="margin: 0 0 8px; font-size: 16px; color: #4a6bd8;">Found Potential Match</h3>
    <div style="margin-bottom: 12px;">
      <div style="font-weight: bold; font-size: 14px; margin-bottom: 4px;">Source Product:</div>
      <div style="font-size: 13px; color: #555;">${sourceProduct.title}</div>
      <div style="font-size: 13px; margin-top: 4px;">Price: ${sourceProduct.price?.toFixed(2) || 'N/A'}</div>
    </div>
    <div style="margin-bottom: 12px;">
      <div style="font-weight: bold; font-size: 14px; margin-bottom: 4px;">Matched Product:</div>
      <div style="font-size: 13px; color: #555;">${matchedProduct.title}</div>
      <div style="font-size: 13px; margin-top: 4px;">Price: ${matchedProduct.price?.toFixed(2) || 'N/A'}</div>
      <div style="font-size: 13px; margin-top: 4px;">Similarity: ${(matchedProduct.similarityScore * 100).toFixed(1)}%</div>
    </div>
    <div style="margin-bottom: 16px;">
      <div style="font-weight: bold; font-size: 14px; margin-bottom: 4px;">Potential Profit:</div>
      <div style="font-size: 15px; color: ${profit > 0 ? '#27ae60' : '#e74c3c'}; font-weight: bold;">
        ${profit.toFixed(2)} (${profitPercent.toFixed(1)}%)
      </div>
    </div>
    <button id="extension-select-match" style="
      background-color: #4a6bd8;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 8px 16px;
      font-size: 14px;
      cursor: pointer;
      width: 100%;
    ">Select This Match</button>
    <button id="extension-find-manually" style="
      background-color: transparent;
      color: #4a6bd8;
      border: 1px solid #4a6bd8;
      border-radius: 4px;
      padding: 8px 16px;
      font-size: 14px;
      cursor: pointer;
      width: 100%;
      margin-top: 8px;
    ">Find Another Match</button>
  `;
  
  // Add highlight to page
  document.body.appendChild(highlightContainer);
  
  // Highlight the matched product
  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  
  // Save original styles
  const htmlElement = element as HTMLElement;
  const originalBorder = htmlElement.style.border;
  const originalBoxShadow = htmlElement.style.boxShadow;
  
  // Set new styles
  htmlElement.style.border = '3px solid #4a6bd8';
  htmlElement.style.boxShadow = '0 0 10px rgba(74, 107, 216, 0.5)';
  
  // Add event listeners
  document.getElementById('extension-close-highlight')?.addEventListener('click', () => {
    highlightContainer.remove();
    htmlElement.style.border = originalBorder;
    htmlElement.style.boxShadow = originalBoxShadow;
  });
  
  document.getElementById('extension-select-match')?.addEventListener('click', () => {
    saveMatchToStorage(sourceProduct, matchedProduct);
    highlightContainer.innerHTML = `
      <div style="text-align: center; padding: 20px;">
        <div style="color: #27ae60; font-size: 24px; margin-bottom: 16px;">✓</div>
        <h3 style="margin: 0 0 8px; font-size: 16px; color: #4a6bd8;">Match Selected!</h3>
        <p style="font-size: 14px; margin-bottom: 16px;">The match has been saved.</p>
        <button id="extension-close-after-save" style="
          background-color: #4a6bd8;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 8px 16px;
          font-size: 14px;
          cursor: pointer;
        ">Close</button>
      </div>
    `;
    
    document.getElementById('extension-close-after-save')?.addEventListener('click', () => {
      highlightContainer.remove();
      htmlElement.style.border = originalBorder;
      htmlElement.style.boxShadow = originalBoxShadow;
    });
  });
  
  document.getElementById('extension-find-manually')?.addEventListener('click', () => {
    highlightContainer.remove();
    htmlElement.style.border = originalBorder;
    htmlElement.style.boxShadow = originalBoxShadow;
  });
}

/**
 * Save the matched product to storage
 * @param sourceProduct - The source product
 * @param matchedProduct - The matched product
 */
function saveMatchToStorage(sourceProduct: ProductData, matchedProduct: any) {
  // Create a comparison object
  const comparison = {
    sourceProduct,
    matchedProducts: {
      [matchedProduct.marketplace]: [
        {
          title: matchedProduct.title,
          price: matchedProduct.price,
          image: matchedProduct.imageUrl,
          url: matchedProduct.url,
          marketplace: matchedProduct.marketplace,
          profit: {
            amount: sourceProduct.price !== null ? parseFloat((matchedProduct.price - sourceProduct.price).toFixed(2)) : 0,
            percentage: sourceProduct.price !== null ? parseFloat((((matchedProduct.price - sourceProduct.price) / sourceProduct.price) * 100).toFixed(2)) : 0
          }
        }
      ]
    },
    timestamp: Date.now()
  };
  
  // Save to storage
  chrome.storage.local.set({ comparison }, () => {
    console.log('[E-commerce Arbitrage] Saved manual match comparison');
  });
}

// Initialize the match finder
initMatchFinder();
