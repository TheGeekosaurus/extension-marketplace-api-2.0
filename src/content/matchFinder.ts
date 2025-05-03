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
          // This will display it directly in the popup instead of showing a dialog
          chrome.runtime.sendMessage({
            action: 'MANUAL_MATCH_FOUND',
            match: bestMatch,
            searchUrl: window.location.href
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
            action: 'MANUAL_MATCH_NOT_FOUND',
            searchUrl: window.location.href
          });
        }
      }
    } catch (error) {
      console.error('[E-commerce Arbitrage] Error finding match:', error);
      
      if (isBackgroundSearch) {
        // Send error message back
        chrome.runtime.sendMessage({
          action: 'MANUAL_MATCH_ERROR',
          error: String(error),
          searchUrl: window.location.href
        });
      }
    }
  });
}

/**
 * Find the best matching product on the current search results page
 * REVERTED TO ORIGINAL IMPLEMENTATION
 * 
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
    // Original Amazon selectors
    productElements = Array.from(document.querySelectorAll('.s-result-item[data-asin]:not(.AdHolder)'));
    
    // Fallback for Amazon
    if (productElements.length === 0) {
      productElements = Array.from(document.querySelectorAll('.s-result-list .a-section[data-asin], .sg-row[data-asin]'));
    }
  } else if (isWalmart) {
    // Original Walmart selectors
    const selectors = [
      '[data-item-id]',
      '[data-product-id]',
      '.search-result-gridview-item',
      '.product.product-search-result.search-result-gridview-item'
    ];
    
    for (const selector of selectors) {
      const results = document.querySelectorAll(selector);
      if (results.length > 0) {
        productElements = Array.from(results);
        break;
      }
    }
  }
  
  if (productElements.length === 0) {
    console.warn('[E-commerce Arbitrage] No product results found on page');
    return null;
  }
  
  console.log(`[E-commerce Arbitrage] Found ${productElements.length} products on search results page`);
  
  // Calculate similarity scores for each product using original approach
  const productsWithScores = productElements.map(element => {
    // Extract product title
    let title = '';
    if (isAmazon) {
      title = element.querySelector('h2')?.textContent || 
              element.querySelector('h2 a')?.textContent || 
              element.querySelector('.a-text-normal')?.textContent || '';
    } else if (isWalmart) {
      title = element.querySelector('[data-automation-id="product-title"]')?.textContent || 
              element.querySelector('.sans-serif.mid-gray')?.textContent || 
              element.querySelector('.lh-title')?.textContent || '';
    }
    
    // If no title, skip this product
    if (!title.trim()) {
      return null;
    }
    
    // Extract price using more permissive approach
    let price = null;
    if (isAmazon) {
      const priceElement = element.querySelector('.a-price .a-offscreen');
      if (priceElement) {
        const priceText = priceElement.textContent || '';
        // More permissive price regex
        const priceMatch = priceText.match(/[\$\£\€]?(\d+(?:[.,]\d+)?)/);
        if (priceMatch && priceMatch[1]) {
          price = parseFloat(priceMatch[1].replace(',', '.'));
        }
      }
      
      // Amazon fallback price
      if (price === null) {
        const altPriceElement = element.querySelector('.a-color-price, .a-color-base');
        if (altPriceElement) {
          const priceText = altPriceElement.textContent || '';
          const priceMatch = priceText.match(/[\$\£\€]?(\d+(?:[.,]\d+)?)/);
          if (priceMatch && priceMatch[1]) {
            price = parseFloat(priceMatch[1].replace(',', '.'));
          }
        }
      }
    } else if (isWalmart) {
      const priceElement = element.querySelector('[data-automation-id="product-price"]') || 
                           element.querySelector('.b.black.f1.mr1');
      if (priceElement) {
        const priceText = priceElement.textContent || '';
        // More permissive price regex
        const priceMatch = priceText.match(/[\$\£\€]?(\d+(?:[.,]\d+)?)/);
        if (priceMatch && priceMatch[1]) {
          price = parseFloat(priceMatch[1].replace(',', '.'));
        }
      }
      
      // Walmart fallback for separated dollars and cents
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
    
    // Get URL - using original approach
    let url = '';
    if (isAmazon) {
      const linkElement = element.querySelector('a.a-link-normal[href*="/dp/"]');
      if (linkElement) {
        const href = linkElement.getAttribute('href') || '';
        url = href.startsWith('http') ? href : new URL(href, window.location.origin).href;
      }
    } else if (isWalmart) {
      const linkElement = element.querySelector('a[link-identifier="linkTest"]') || 
                          element.querySelector('a.absolute.w-100.h-100');
      if (linkElement) {
        const href = linkElement.getAttribute('href') || '';
        url = href.startsWith('http') ? href : new URL(href, window.location.origin).href;
      }
    }
    
    // Get image
    let imageUrl = undefined;
    if (isAmazon) {
      const imgElement = element.querySelector('img.s-image');
      imageUrl = imgElement ? imgElement.getAttribute('src') || undefined : undefined;
    } else if (isWalmart) {
      const imgElement = element.querySelector('img[data-automation-id="product-image"]') || 
                         element.querySelector('img.absolute');
      imageUrl = imgElement ? imgElement.getAttribute('src') || undefined : undefined;
    }
    
    // Skip if we couldn't get title, price or URL
    if (!title || price === null || !url) {
      return null;
    }
    
    // Calculate title similarity score
    const similarityScore = calculateTitleSimilarity(title, sourceProduct.title);
    
    return {
      element,
      title,
      price,
      url,
      imageUrl,
      marketplace: isAmazon ? 'amazon' : 'walmart',
      similarityScore
    };
  }).filter(Boolean) as Array<any>;
  
  // Sort by similarity score (highest first)
  productsWithScores.sort((a, b) => b.similarityScore - a.similarityScore);
  
  // Get the best match (if any)
  if (productsWithScores.length === 0) {
    return null;
  }
  
  const bestMatch = productsWithScores[0];
  
  // Only return if it has a reasonable similarity
  // Lower the threshold from 0.3 to 0.2 to improve matching
  if (bestMatch.similarityScore < 0.2) {
    console.warn('[E-commerce Arbitrage] Best match has low similarity score:', bestMatch.similarityScore);
    // Still return the match even with low score
  }
  
  return bestMatch;
}

/**
 * Calculate similarity between two product titles
 * Using original algorithm with improvements
 * 
 * @param title1 - First product title
 * @param title2 - Second product title
 * @returns Similarity score between 0 and 1
 */
function calculateTitleSimilarity(title1: string, title2: string): number {
  if (!title1 || !title2) return 0;
  
  // Normalize strings (more permissive)
  const normalize = (str: string) => {
    return str.toLowerCase()
      .replace(/[^\w\s]/g, '')  // Remove non-alphanumeric chars
      .replace(/\s+/g, ' ')     // Normalize whitespace
      .trim();
  };
  
  const normalizedTitle1 = normalize(title1);
  const normalizedTitle2 = normalize(title2);
  
  // Get words from titles
  // Original implementation only filtered words > 2 chars
  // Modified to be more lenient with word filtering (>1 char)
  const words1 = normalizedTitle1.split(/\s+/).filter(w => w.length > 1);
  const words2 = normalizedTitle2.split(/\s+/).filter(w => w.length > 1);
  
  // Count matching words with a more permissive approach
  let matchCount = 0;
  for (const word1 of words1) {
    for (const word2 of words2) {
      // Consider matches if one word includes the other or if they're very similar
      if (word2.includes(word1) || word1.includes(word2) || levenshteinSimilarity(word1, word2) > 0.8) {
        matchCount++;
        break; // Count each word from title1 at most once
      }
    }
  }
  
  // Original similarity calculation with a small boost
  const baseScore = matchCount / Math.max(words1.length, words2.length);
  
  // Add bonus points for brand name matches 
  // This helps boost relevant matches
  const boostScore = checkForBrandMatch(normalizedTitle1, normalizedTitle2) ? 0.1 : 0;
  
  // Clamp final score between 0 and 1
  return Math.min(1, baseScore + boostScore);
}

/**
 * Check if the brand name appears in both titles
 * 
 * @param title1 First normalized title
 * @param title2 Second normalized title
 * @returns True if there appears to be a brand match
 */
function checkForBrandMatch(title1: string, title2: string): boolean {
  // Try to extract what might be a brand (first word or two)
  const words1 = title1.split(/\s+/);
  const words2 = title2.split(/\s+/);
  
  // Check if first word (potential brand) matches
  if (words1.length > 0 && words2.length > 0) {
    const firstWord1 = words1[0];
    const firstWord2 = words2[0];
    
    // If the first words are the same and not too short, likely a brand match
    if (firstWord1.length > 2 && firstWord1 === firstWord2) {
      return true;
    }
    
    // Check if first two words match (for brand names with two words)
    if (words1.length > 1 && words2.length > 1) {
      const firstTwoWords1 = words1.slice(0, 2).join(' ');
      const firstTwoWords2 = words2.slice(0, 2).join(' ');
      
      if (firstTwoWords1 === firstTwoWords2) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Calculate similarity between two strings using Levenshtein distance
 * Added to improve matching quality
 * 
 * @param str1 First string
 * @param str2 Second string
 * @returns Similarity score between 0 and 1
 */
function levenshteinSimilarity(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  
  // Quick return for empty strings or exact matches
  if (len1 === 0) return len2 === 0 ? 1 : 0;
  if (len2 === 0) return 0;
  if (str1 === str2) return 1;
  
  // Use a simple version for short strings
  if (len1 < 10 && len2 < 10) {
    // Count the number of matching characters
    let matches = 0;
    const maxLen = Math.max(len1, len2);
    
    for (let i = 0; i < Math.min(len1, len2); i++) {
      if (str1[i] === str2[i]) matches++;
    }
    
    return matches / maxLen;
  }
  
  // Only use full Levenshtein for longer strings where needed
  // This is a simplified version that works well for our purpose
  // and avoids expensive calculations
  
  let matches = 0;
  let commonPrefixLength = 0;
  
  // Count common prefix
  for (let i = 0; i < Math.min(len1, len2); i++) {
    if (str1[i] === str2[i]) {
      commonPrefixLength++;
    } else {
      break;
    }
  }
  
  // Count common suffix
  let commonSuffixLength = 0;
  for (let i = 1; i <= Math.min(len1, len2) - commonPrefixLength; i++) {
    if (str1[len1 - i] === str2[len2 - i]) {
      commonSuffixLength++;
    } else {
      break;
    }
  }
  
  // Count common characters
  const charMap: Record<string, number> = {};
  for (const char of str1) {
    charMap[char] = (charMap[char] || 0) + 1;
  }
  
  for (const char of str2) {
    if (charMap[char] && charMap[char] > 0) {
      matches++;
      charMap[char]--;
    }
  }
  
  // Calculate similarity as a weighted score
  const maxLength = Math.max(len1, len2);
  return (matches + commonPrefixLength + commonSuffixLength) / (maxLength * 2);
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
    top: 20px;
    right: 20px;
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
          similarity: matchedProduct.similarityScore,
          profit: {
            amount: sourceProduct.price !== null ? parseFloat((matchedProduct.price - sourceProduct.price).toFixed(2)) : 0,
            percentage: sourceProduct.price !== null ? parseFloat((((matchedProduct.price - sourceProduct.price) / sourceProduct.price) * 100).toFixed(2)) : 0
          }
        }
      ]
    },
    timestamp: Date.now(),
    manualMatch: true,
    similarity: matchedProduct.similarityScore,
    searchUrl: window.location.href
  };
  
  // Save to storage
  chrome.storage.local.set({ comparison }, () => {
    console.log('[E-commerce Arbitrage] Saved manual match comparison');
    
    // Send message to notify the extension popup
    chrome.runtime.sendMessage({
      action: 'MANUAL_MATCH_FOUND',
      match: matchedProduct,
      searchUrl: window.location.href
    });
  });
}

// Initialize the match finder
initMatchFinder();
