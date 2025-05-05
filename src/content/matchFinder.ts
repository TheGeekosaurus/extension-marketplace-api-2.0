// src/content/matchFinder.ts - Find best matching product on search results pages

import { ProductData } from '../types';
import { selectorConfig, isAmazonSelectors, isWalmartSelectors } from '../config/selectors.config';

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
  
  // Get the appropriate selectors based on marketplace
  const selectors = isAmazon ? selectorConfig.amazon : selectorConfig.walmart;
  
  let productElements: Element[] = [];
  
  // Wait a bit more for dynamic content to fully load
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Try primary container selector
  productElements = Array.from(document.querySelectorAll(selectors.productContainer));
  
  // If no elements found, try fallback selector
  if (productElements.length === 0 && selectors.fallbackContainer) {
    productElements = Array.from(document.querySelectorAll(selectors.fallbackContainer));
  }
  
  if (productElements.length === 0) {
    console.warn('[E-commerce Arbitrage] No product results found on page');
    return null;
  }
  
  console.log(`[E-commerce Arbitrage] Found ${productElements.length} products on search results page`);
  
  // Calculate similarity scores for each product
  const productsWithScores = productElements.map(element => {
    // Extract product title
    const titleElement = element.querySelector(selectors.title);
    const title = titleElement?.textContent?.trim() || '';
    
    // Extract brand name (improved brand extraction)
    const brandElement = element.querySelector(selectors.brand);
    let brand = brandElement?.textContent?.trim() || '';
    
    // Clean up brand text (sometimes includes "by" or "Visit the X Store")
    if (brand.includes('Visit the ')) {
      brand = brand.replace('Visit the ', '').replace(' Store', '');
    }
    if (brand.includes('by ')) {
      brand = brand.replace('by ', '');
    }
    
    // Extract price
    let price = null;
    let shippingPrice = 0;
    
    if (isAmazon) {
      const priceElement = element.querySelector(selectors.price);
      if (priceElement) {
        price = parseFloat(priceElement.textContent?.replace(/[^0-9.]/g, '') || '0');
      }
      
      // Try fallback price if primary not found or is zero
      if (!price || price === 0) {
        // Use type guard to safely access Amazon-specific selectors
        if (isAmazonSelectors(selectors)) {
          const fallbackPriceElement = element.querySelector(selectors.fallbackPrice);
          if (fallbackPriceElement) {
            const priceText = fallbackPriceElement.textContent || '';
            const priceMatch = priceText.match(/\$?(\d+(?:\.\d{1,2})?)/);
            if (priceMatch && priceMatch[1]) {
              price = parseFloat(priceMatch[1]);
            }
          }
        }
      }
      
      // Check for shipping price
      const shippingElement = element.querySelector('.a-color-secondary');
      if (shippingElement) {
        const shippingText = shippingElement.textContent || '';
        const shippingMatch = shippingText.match(/\+\s*\$?([\d.]+)\s*shipping/i);
        if (shippingMatch && shippingMatch[1]) {
          shippingPrice = parseFloat(shippingMatch[1]);
        }
      }
      
    } else if (isWalmart) {
      const priceElement = element.querySelector(selectors.price);
      if (priceElement) {
        price = parseFloat(priceElement.textContent?.replace(/[^0-9.]/g, '') || '0');
      }
      
      // Try Walmart's separated dollars and cents format
      if (!price || price === 0) {
        // Use type guard to safely access Walmart-specific selectors
        if (isWalmartSelectors(selectors)) {
          const dollarsElement = element.querySelector(selectors.priceDollars);
          const centsElement = element.querySelector(selectors.priceCents);
          
          if (dollarsElement && centsElement) {
            const dollars = dollarsElement.textContent?.replace(/[^\d]/g, '') || '0';
            const cents = centsElement.textContent?.replace(/[^\d]/g, '') || '00';
            price = parseFloat(`${dollars}.${cents}`);
          }
        }
      }
      
      // Check for shipping price in Walmart
      const shippingElement = element.querySelector('[data-automation-id="shipping-message"], .shipping-text');
      if (shippingElement) {
        const shippingText = shippingElement.textContent || '';
        const shippingMatch = shippingText.match(/\+\s*\$?([\d.]+)\s*shipping|shipping\s*\$?([\d.]+)/i);
        if (shippingMatch) {
          shippingPrice = parseFloat(shippingMatch[1] || shippingMatch[2]);
        }
      }
    }
    
    // Calculate title similarity score
    const titleSimilarity = calculateTitleSimilarity(title, sourceProduct.title);
    
    // Check for exact brand match - this is critical for accurate matching
    let exactBrandMatch = false;
    let brandSimilarity = 0;
    
    if (sourceProduct.brand && brand) {
      const sourceBrandLower = sourceProduct.brand.toLowerCase().trim();
      const targetBrandLower = brand.toLowerCase().trim();
      
      // Check for exact brand match first
      exactBrandMatch = (sourceBrandLower === targetBrandLower);
      
      // Calculate brand similarity score
      if (!exactBrandMatch) {
        brandSimilarity = calculateTitleSimilarity(sourceBrandLower, targetBrandLower);
      } else {
        // If exact match, set to 1.0
        brandSimilarity = 1.0;
      }
    }
    
    // Calculate final similarity score with strong emphasis on brand matching
    // This is the core of our improved matching algorithm
    let finalScore = titleSimilarity;
    
    // If brands exist on both products, brand matching is extremely important
    if (sourceProduct.brand && brand) {
      if (exactBrandMatch) {
        // Exact brand match gets a massive bonus (essentially guaranteeing it's at the top)
        // This should solve the issue where identical products are being missed
        finalScore = Math.min(titleSimilarity + 0.6, 1.0);
        console.log(`[E-commerce Arbitrage] EXACT brand match: "${brand}" vs "${sourceProduct.brand}". Adding 0.6 bonus to score.`);
      } else if (brandSimilarity > 0.8) {
        // Strong brand match (80%+): add 40% bonus (capped at 1.0)
        finalScore = Math.min(titleSimilarity + 0.4, 1.0);
        console.log(`[E-commerce Arbitrage] Strong brand match (${brandSimilarity.toFixed(2)}) for "${brand}" vs "${sourceProduct.brand}". Adding 0.4 bonus.`);
      } else if (brandSimilarity > 0.5) {
        // Moderate brand match (50-80%): add 25% bonus
        finalScore = Math.min(titleSimilarity + 0.25, 1.0);
        console.log(`[E-commerce Arbitrage] Moderate brand match (${brandSimilarity.toFixed(2)}) for "${brand}" vs "${sourceProduct.brand}". Adding 0.25 bonus.`);
      }
    }
    
    // DEBUG: Log matching information for this product
    console.log(`[E-commerce Arbitrage] Product: "${title}" | Brand: "${brand}" | Title Similarity: ${titleSimilarity.toFixed(2)} | Brand Similarity: ${brandSimilarity.toFixed(2)} | Final Score: ${finalScore.toFixed(2)}`);
    
    // Check for exact title match (case insensitive)
    if (title.toLowerCase() === sourceProduct.title.toLowerCase()) {
      console.log(`[E-commerce Arbitrage] EXACT title match found! Boosting score to maximum.`);
      finalScore = 1.0;
    }
    
    // Get URL
    let url = '';
    const linkElement = element.querySelector(selectors.link);
    if (linkElement) {
      url = linkElement.getAttribute('href') || '';
      // Convert relative URLs to absolute
      if (url && !url.startsWith('http')) {
        url = new URL(url, window.location.origin).href;
      }
    }
    
    // Get image
    let imageUrl = '';
    const imgElement = element.querySelector(selectors.image);
    if (imgElement) {
      imageUrl = imgElement.getAttribute('src') || '';
    }
    
    return {
      element,
      title,
      brand,
      price,
      shippingPrice,
      totalPrice: price !== null ? price + shippingPrice : null,
      brandSimilarity,
      titleSimilarity,
      exactBrandMatch,
      similarityScore: finalScore, // Enhanced similarity with brand bonus
      url,
      imageUrl,
      marketplace: isAmazon ? 'amazon' : 'walmart'
    };
  });
  
  // Filter out products with missing title or price
  const validProducts = productsWithScores.filter(p => p.title && p.price !== null);
  
  if (validProducts.length === 0) {
    console.warn('[E-commerce Arbitrage] No valid products found with price and title');
    return null;
  }
  
  // Sort by similarity score (highest first)
  validProducts.sort((a, b) => b.similarityScore - a.similarityScore);
  
  // Print the top 3 matches for debugging
  console.log('[E-commerce Arbitrage] Top 3 matches:');
  validProducts.slice(0, 3).forEach((match, idx) => {
    console.log(`[E-commerce Arbitrage] Match #${idx + 1}: "${match.title}" | Brand: "${match.brand}" | Score: ${match.similarityScore.toFixed(2)}`);
  });
  
  const bestMatch = validProducts[0];
  
  // DEBUG: Log information about the best match
  console.log(`[E-commerce Arbitrage] Best match: "${bestMatch.title}" with score ${bestMatch.similarityScore.toFixed(2)}`);
  console.log(`[E-commerce Arbitrage] Price: ${bestMatch.price}, Shipping: ${bestMatch.shippingPrice}, Total: ${bestMatch.totalPrice}`);
  
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
  
  // Normalize strings - remove non-alphanumeric characters and extra spaces
  const normalize = (str: string) => {
    // Replace non-alphanumeric characters with spaces, then convert to lowercase
    const normalized = str.toLowerCase().replace(/[^\w\s]/g, ' ');
    // Replace multiple spaces with a single space
    return normalized.replace(/\s+/g, ' ').trim();
  };
  
  const normalizedTitle1 = normalize(title1);
  const normalizedTitle2 = normalize(title2);
  
  // Early return for exact matches after normalization
  if (normalizedTitle1 === normalizedTitle2) {
    return 1.0;
  }
  
  // Get significant words from titles (filter out very short words)
  const words1 = normalizedTitle1.split(/\s+/).filter(w => w.length > 2);
  const words2 = normalizedTitle2.split(/\s+/).filter(w => w.length > 2);
  
  if (words1.length === 0 || words2.length === 0) {
    return 0;
  }
  
  // Count exact word matches (gives higher weight to exact matches)
  let exactMatchCount = 0;
  const usedIndices = new Set<number>();
  
  words1.forEach(word1 => {
    for (let i = 0; i < words2.length; i++) {
      if (!usedIndices.has(i) && words2[i] === word1) {
        exactMatchCount++;
        usedIndices.add(i);
        break;
      }
    }
  });
  
  // Count partial matches for words not exactly matched
  let partialMatchCount = 0;
  words1.forEach(word1 => {
    for (let i = 0; i < words2.length; i++) {
      if (!usedIndices.has(i) && (words2[i].includes(word1) || word1.includes(words2[i]))) {
        partialMatchCount += 0.5; // partial matches count as half
        usedIndices.add(i);
        break;
      }
    }
  });
  
  // Calculate similarity score with more weight on exact matches
  const totalScore = exactMatchCount + partialMatchCount;
  const maxPossibleScore = Math.max(words1.length, words2.length);
  
  return totalScore / maxPossibleScore;
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
  
  // Calculate profit - use totalPrice if available (price + shipping)
  const comparePrice = matchedProduct.totalPrice !== null ? matchedProduct.totalPrice : matchedProduct.price;
  const profit = comparePrice && sourceProduct.price !== null 
    ? comparePrice - sourceProduct.price 
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
      ${sourceProduct.brand ? `<div style="font-size: 13px; margin-top: 4px;">Brand: ${sourceProduct.brand}</div>` : ''}
    </div>
    <div style="margin-bottom: 12px;">
      <div style="font-weight: bold; font-size: 14px; margin-bottom: 4px;">Matched Product:</div>
      <div style="font-size: 13px; color: #555;">${matchedProduct.title}</div>
      <div style="font-size: 13px; margin-top: 4px;">Price: ${matchedProduct.price?.toFixed(2) || 'N/A'}</div>
      ${matchedProduct.shippingPrice > 0 ? `<div style="font-size: 13px; margin-top: 4px;">Shipping: ${matchedProduct.shippingPrice.toFixed(2)}</div>` : ''}
      ${matchedProduct.brand ? `<div style="font-size: 13px; margin-top: 4px;">Brand: ${matchedProduct.brand}</div>` : ''}
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
  // Calculate profit - use totalPrice if available (price + shipping)
  const comparePrice = matchedProduct.totalPrice !== null ? matchedProduct.totalPrice : matchedProduct.price;
  const profitAmount = sourceProduct.price !== null ? comparePrice - sourceProduct.price : 0;
  const profitPercentage = sourceProduct.price !== null ? ((comparePrice - sourceProduct.price) / sourceProduct.price) * 100 : 0;
  
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
          brand: matchedProduct.brand, // Added brand to the saved match
          similarity: matchedProduct.similarityScore, // Add similarity score
          shippingPrice: matchedProduct.shippingPrice || 0, // Include shipping price
          profit: {
            amount: parseFloat(profitAmount.toFixed(2)),
            percentage: parseFloat(profitPercentage.toFixed(2))
          }
        }
      ]
    },
    timestamp: Date.now(),
    manualMatch: true,
    similarity: matchedProduct.similarityScore, // Add overall similarity
    searchUrl: window.location.href // Save the search URL
  };
  
  // Save to storage
  chrome.storage.local.set({ comparison }, () => {
    console.log('[E-commerce Arbitrage] Saved manual match comparison');
  });
}

// Initialize the match finder
initMatchFinder();
