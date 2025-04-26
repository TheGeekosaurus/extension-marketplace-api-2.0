// src/content/extractors/walmart.ts - Walmart product data extractor

import { ProductData } from '../../types';
import { walmartSelectors, walmartRegexPatterns } from '../selectors/walmart';
import { 
  findElement, 
  extractText, 
  extractWithRegex, 
  parsePrice, 
  logExtraction,
  findInElements
} from '../utils/extraction';

/**
 * Extracts product data from a Walmart product page
 * 
 * @returns Extracted product data or null if extraction fails
 */
export function extractWalmartProductData(): ProductData | null {
  try {
    logExtraction('walmart', 'Starting extraction');
    
    // Extract product ID from URL
    const url = window.location.href;
    const productId = extractWithRegex(walmartRegexPatterns.productId, url);
    
    logExtraction('walmart', 'Extracted product ID', productId);
    
    if (!productId) {
      logExtraction('walmart', 'No product ID found in Walmart URL');
      return null;
    }
    
    // Extract product title
    const titleElement = findElement(walmartSelectors.title);
    const title = extractText(titleElement) || 'Unknown Product';
    logExtraction('walmart', 'Extracted title', title);
    
    // Extract product price
    const priceElement = findElement(walmartSelectors.price);
    let price: number | null = null;
    
    if (priceElement) {
      const dollarsAttr = priceElement.getAttribute('content');
      const textContent = priceElement.textContent;
      const dollarsValue = dollarsAttr || textContent || '';
      
      const centsElement = findElement(walmartSelectors.priceCents);
      const cents = centsElement ? extractText(centsElement) || '00' : '00';
      
      const priceText = dollarsValue.replace(/[^0-9.]/g, '');
      
      if (priceText) {
        price = parseFloat(priceText);
        if (centsElement && !priceText.includes('.')) {
          price += parseFloat(cents) / 100;
        }
        logExtraction('walmart', 'Extracted price', price);
      }
    }
    
    // Extract brand
    const brandElement = findElement(walmartSelectors.brand);
    const brand = extractText(brandElement);
    logExtraction('walmart', 'Extracted brand', brand);
    
    // Try to find UPC in product details
    let upc: string | null = null;
    const detailsSection = findElement(['.prod-ProductDetails', '[data-testid="product-details"]']);
    
    if (detailsSection) {
      const detailItems = detailsSection.querySelectorAll('div');
      upc = findInElements(detailItems, 'upc', walmartRegexPatterns.upc[0]);
      if (upc) {
        logExtraction('walmart', 'Found UPC in details', upc);
      }
    }
    
    // For Walmart, we can often find this in the page source
    if (!upc) {
      const pageSource = document.documentElement.innerHTML;
      const upcMatch = pageSource.match(walmartRegexPatterns.upc[1]);
      if (upcMatch && upcMatch[1]) {
        upc = upcMatch[1];
        logExtraction('walmart', 'Found UPC in page source', upc);
      }
    }
    
    // Get main product image
    const imageElement = findElement(walmartSelectors.image);
    const imageUrl = imageElement ? (imageElement as HTMLImageElement).src : null;
    logExtraction('walmart', 'Extracted image URL', imageUrl);
    
    const productData: ProductData = {
      title,
      price,
      marketplace: 'walmart',
      productId,
      brand,
      upc,
      asin: null,
      imageUrl,
      pageUrl: window.location.href
    };
    
    logExtraction('walmart', 'Extracted Walmart product data', productData);
    return productData;
  } catch (error) {
    console.error('Error extracting Walmart product data:', error);
    return null;
  }
}
