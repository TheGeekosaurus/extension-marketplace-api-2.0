// src/content/extractors/target.ts - Target product data extractor

import { ProductData } from '../../types';
import { targetSelectors, targetRegexPatterns } from '../selectors/target';
import { 
  findElement, 
  extractText, 
  extractWithRegex, 
  parsePrice, 
  logExtraction
} from '../utils/extraction';

/**
 * Extracts product data from a Target product page
 * 
 * @returns Extracted product data or null if extraction fails
 */
export function extractTargetProductData(): ProductData | null {
  try {
    logExtraction('target', 'Starting extraction');
    
    // Extract TCIN from URL or page content
    const url = window.location.href;
    const pageSource = document.body.innerHTML;
    
    const productId = extractWithRegex(
      targetRegexPatterns.productId, 
      url
    ) || extractWithRegex(
      targetRegexPatterns.productId, 
      pageSource
    );
    
    logExtraction('target', 'Extracted Target product ID', productId);
    
    if (!productId) {
      logExtraction('target', 'No product ID found in Target URL or page');
      return null;
    }
    
    // Extract product title
    const titleElement = findElement(targetSelectors.title);
    const title = extractText(titleElement) || 'Unknown Product';
    logExtraction('target', 'Extracted title', title);
    
    // Extract product price
    const priceElement = findElement(targetSelectors.price);
    let price: number | null = null;
    
    if (priceElement) {
      const priceText = extractText(priceElement) || '';
      // Extract price using regex
      const match = priceText.match(targetRegexPatterns.price[0]);
      if (match && match[1]) {
        price = parseFloat(match[1]);
        logExtraction('target', 'Extracted price', price);
      }
    }
    
    // Extract brand
    const brandElement = findElement(targetSelectors.brand);
    const brand = extractText(brandElement);
    logExtraction('target', 'Extracted brand', brand);
    
    // Try to find UPC in page source - Target often doesn't expose this directly
    let upc: string | null = null;
    const upcMatch = pageSource.match(targetRegexPatterns.upc[0]);
    if (upcMatch && upcMatch[1]) {
      upc = upcMatch[1];
      logExtraction('target', 'Found UPC in page source', upc);
    }
    
    // Get main product image
    const imageElement = findElement(targetSelectors.image);
    const imageUrl = imageElement ? (imageElement as HTMLImageElement).src : null;
    logExtraction('target', 'Extracted image URL', imageUrl);
    
    const productData: ProductData = {
      title,
      price,
      marketplace: 'target',
      productId,
      brand,
      upc,
      asin: null,
      imageUrl,
      pageUrl: window.location.href
    };
    
    logExtraction('target', 'Extracted Target product data', productData);
    return productData;
  } catch (error) {
    console.error('Error extracting Target product data:', error);
    return null;
  }
}
