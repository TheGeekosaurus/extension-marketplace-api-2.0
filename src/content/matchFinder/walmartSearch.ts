// src/content/matchFinder/walmartSearch.ts - Walmart search results page extraction

import { ProductMatchResult } from '../../types';

/**
 * Extract a product from a Walmart search result element
 * 
 * @param element - The search result DOM element
 * @returns Extracted product match data
 */
export function extractWalmartSearchResult(element: Element): Partial<ProductMatchResult> | null {
  try {
    // Extract title
    const titleElement = element.querySelector('[data-automation-id="product-title"], .sans-serif.mid-gray, .w_iUH, .lh-title');
    const title = titleElement?.textContent?.trim() || '';
    
    if (!title) {
      console.log('[E-commerce Arbitrage] No title found in Walmart search result');
      return null;
    }
    
    // Extract price - Walmart often has more complex price structures
    const priceElement = element.querySelector('[data-automation-id="product-price"], .b.black.f1.mr1, .w_iUH');
    let price: number | null = null;
    
    if (priceElement) {
      const priceText = priceElement.textContent || '';
      // Extract just the numeric part with up to 2 decimal places
      const priceMatch = priceText.match(/\$?(\d+(?:\.\d{1,2})?)/);
      if (priceMatch && priceMatch[1]) {
        price = parseFloat(priceMatch[1]);
      }
    }
    
    if (price === null || isNaN(price)) {
      // Try alternative price formats
      // Walmart sometimes separates dollars and cents
      const wholeDollarElement = element.querySelector('.w_C6.w_D.w_C7.w_Da');
      const centsElement = element.querySelector('.w_C6.w_D.w_C7.w_Db');
      
      if (wholeDollarElement && centsElement) {
        const dollars = wholeDollarElement.textContent?.replace(/[^\d]/g, '') || '0';
        const cents = centsElement.textContent?.replace(/[^\d]/g, '') || '00';
        price = parseFloat(`${dollars}.${cents}`);
      }
    }
    
    if (price === null || isNaN(price)) {
      console.log('[E-commerce Arbitrage] No valid price found in Walmart search result');
      return null;
    }
    
    // Get URL
    const linkElement = element.querySelector('a[link-identifier="linkTest"], a.absolute.w-100.h-100, .sans-serif.w_iUH a');
    const relativeUrl = linkElement ? linkElement.getAttribute('href') || '' : '';
    const url = relativeUrl ? new URL(relativeUrl, window.location.origin).href : '';
    
    if (!url) {
      console.log('[E-commerce Arbitrage] No URL found in Walmart search result');
      return null;
    }
    
    // Extract product ID
    let productId: string | undefined = undefined;
    if (url) {
      // Try multiple patterns that appear in Walmart URLs
      const idPatterns = [
        /\/ip\/(?:.*?)\/(\d+)/, // /ip/Title-Here/12345
        /\/ip\/(\d+)/, // /ip/12345
        /\/(\d+)(?:\?|\&|$)/ // /12345 or /12345?param
      ];
      
      for (const pattern of idPatterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
          productId = match[1];
          break;
        }
      }
      
      // Also check data attributes
      if (!productId) {
        productId = element.getAttribute('data-item-id') || 
                   element.getAttribute('data-product-id') || undefined;
      }
    }
    
    // Get image
    const imgElement = element.querySelector('img[data-automation-id="product-image"], img.absolute, img.w_iUF');
    const imageUrl = imgElement ? imgElement.getAttribute('src') || undefined : undefined;
    
    // Get ratings
    const ratingElement = element.querySelector('.stars-container, [data-automation-id="product-stars"]');
    let rating: number | null = null;
    
    if (ratingElement) {
      // Walmart often uses "width" percentage in a stars container to represent rating
      const styleWidth = ratingElement.getAttribute('style');
      if (styleWidth && styleWidth.includes('width')) {
        const widthMatch = styleWidth.match(/width:?\s*(\d+(?:\.\d+)?)%/);
        if (widthMatch && widthMatch[1]) {
          // Convert percentage to a 5-star rating (100% = 5 stars)
          rating = (parseFloat(widthMatch[1]) / 100) * 5;
        }
      } else {
        // Try to get the text rating
        const ratingText = ratingElement.textContent || '';
        const ratingMatch = ratingText.match(/(\d+(?:\.\d+)?)/);
        if (ratingMatch && ratingMatch[1]) {
          rating = parseFloat(ratingMatch[1]);
        }
      }
    }
    
    // Get review count
    const reviewCountElement = element.querySelector('.stars-reviews-count, [data-automation-id="product-reviews"]');
    let reviewCount: number | null = null;
    
    if (reviewCountElement) {
      const countText = reviewCountElement.textContent || '';
      const countMatch = countText.match(/(\d+(?:,\d+)*)/);
      if (countMatch && countMatch[1]) {
        reviewCount = parseInt(countMatch[1].replace(/,/g, ''), 10);
      }
    }
    
    return {
      title,
      price,
      image: imageUrl,
      url,
      marketplace: 'walmart',
      item_id: productId,
      ratings: {
        average: rating,
        count: reviewCount
      }
    };
  } catch (error) {
    console.error('[E-commerce Arbitrage] Error extracting Walmart search result:', error);
    return null;
  }
}

/**
 * Find all product elements on a Walmart search page
 * 
 * @returns Array of DOM elements representing search results
 */
export function findWalmartSearchResultElements(): Element[] {
  try {
    // Try multiple selectors as Walmart's DOM structure can vary
    const selectors = [
      '[data-item-id]', // Product with item ID
      '[data-product-id]', // Product with product ID
      '.search-result-gridview-item', // Grid view item
      '.product.product-search-result.search-result-gridview-item', // Old style grid view
      '.sans-serif.relative.pb3.pt2.ph3.w-100' // Common product container
    ];
    
    for (const selector of selectors) {
      const results = document.querySelectorAll(selector);
      if (results.length > 0) {
        console.log(`[E-commerce Arbitrage] Found ${results.length} Walmart search results using selector: ${selector}`);
        return Array.from(results);
      }
    }
    
    console.warn('[E-commerce Arbitrage] No Walmart search results found on page');
    return [];
  } catch (error) {
    console.error('[E-commerce Arbitrage] Error finding Walmart search results:', error);
    return [];
  }
}
