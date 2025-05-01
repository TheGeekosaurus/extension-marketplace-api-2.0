// src/content/extractors/walmart.ts - Walmart product data extractor

import { ProductData } from '../../types';
import { walmartSelectors, walmartRegexPatterns } from '../selectors/walmart';
import { 
  findElement, 
  extractText, 
  extractWithRegex, 
  parsePrice, 
  logExtraction,
  findInElements,
  getImageUrl
} from '../utils/extraction';

/**
 * Extracts product data from a Walmart product page
 * 
 * @returns Extracted product data or null if extraction fails
 */
export function extractWalmartProductData(): Promise<ProductData | null> {
  try {
    logExtraction('walmart', 'Starting extraction');
    
    // Extract product ID from URL
    const url = window.location.href;
    const productId = extractWithRegex(walmartRegexPatterns.productId, url);
    
    logExtraction('walmart', 'Extracted product ID', productId);
    
    if (!productId) {
      logExtraction('walmart', 'No product ID found in Walmart URL');
      return Promise.resolve(null);
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
      
      // Try to parse price directly from the combined value
      price = parsePrice(dollarsValue);
      
      // If price couldn't be parsed, try with cents
      if (price === null || price === 0) {
        // Remove currency symbols and non-numeric characters except decimal point
        const cleanValue = dollarsValue.replace(/[^\d.]/g, '');
        
        // Add cents if needed
        if (!cleanValue.includes('.') && cents) {
          price = parseFloat(`${cleanValue}.${cents}`);
        } else {
          price = parseFloat(cleanValue);
        }
      }
      
      // Try to extract directly from the page
      if (isNaN(price) || price === 0) {
        const priceMatch = document.body.innerText.match(/\$\s*(\d+\.\d{2})/);
        if (priceMatch && priceMatch[1]) {
          price = parseFloat(priceMatch[1]);
        }
      }
      
      logExtraction('walmart', 'Extracted price', price);
    }
    
    // Extract brand
    const brandElement = findElement(walmartSelectors.brand);
    let brand = extractText(brandElement);
    
    // Clean up brand text
    if (brand?.includes('Visit the ')) {
      brand = brand.replace('Visit the ', '').replace(' Store', '');
    }
    
    logExtraction('walmart', 'Extracted brand', brand);
    
    // Try to find UPC in product details
    let upc: string | null = null;
    
    // Look in details section
    const detailsSection = findElement(['.prod-ProductDetails', '[data-testid="product-details"]']);
    
    if (detailsSection) {
      const detailItems = detailsSection.querySelectorAll('div');
      upc = findInElements(detailItems, 'upc', walmartRegexPatterns.upc[0]);
      if (upc) {
        logExtraction('walmart', 'Found UPC in details', upc);
      }
    }
    
    // If not found in details, try page source
    if (!upc) {
      const pageSource = document.documentElement.innerHTML;
      
      // Try specific regex patterns
      for (const pattern of walmartRegexPatterns.upc) {
        const upcMatch = pageSource.match(pattern);
        if (upcMatch && upcMatch[1]) {
          upc = upcMatch[1];
          logExtraction('walmart', 'Found UPC in page source', upc);
          break;
        }
      }
      
      // Try general search
      if (!upc) {
        const genericUpcMatch = pageSource.match(/UPC:?\s*(\d{12})/i);
        if (genericUpcMatch && genericUpcMatch[1]) {
          upc = genericUpcMatch[1];
          logExtraction('walmart', 'Found UPC with generic search', upc);
        }
      }
    }
    
    // Get main product image
    const imageElement = findElement(walmartSelectors.image);
    const imageUrl = getImageUrl(imageElement);
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
    return Promise.resolve(productData);
  } catch (error) {
    console.error('Error extracting Walmart product data:', error);
    return Promise.resolve(null);
  }
}
