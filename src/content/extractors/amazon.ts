// src/content/extractors/amazon.ts - Amazon product data extractor

import { ProductData } from '../../types';
import { amazonSelectors, amazonRegexPatterns } from '../selectors/amazon';
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
 * Extracts product data from an Amazon product page
 * 
 * @returns Extracted product data or null if extraction fails
 */
export function extractAmazonProductData(): Promise<ProductData | null> {
  try {
    logExtraction('amazon', 'Starting extraction');
    
    // Extract ASIN from URL
    const url = window.location.href;
    const asin = extractWithRegex(amazonRegexPatterns.asin, url);
    
    logExtraction('amazon', 'Extracted ASIN', asin);
    
    if (!asin) {
      logExtraction('amazon', 'No ASIN found in URL');
      return Promise.resolve(null);
    }
    
    // Extract product title
    const titleElement = findElement(amazonSelectors.title);
    const title = extractText(titleElement) || 'Unknown Product';
    logExtraction('amazon', 'Extracted title', title);
    
    // Extract product price
    const priceElement = findElement(amazonSelectors.price);
    const priceText = extractText(priceElement);
    const price = parsePrice(priceText);
    logExtraction('amazon', 'Extracted price', price);
    
    // Extract brand
    const brandElement = findElement(amazonSelectors.brand);
    let brand = extractText(brandElement);
    if (brand?.startsWith('Brand: ')) {
      brand = brand.replace('Brand: ', '');
    }
    if (brand?.startsWith('Visit the ')) {
      brand = brand.replace('Visit the ', '').replace(' Store', '');
    }
    logExtraction('amazon', 'Extracted brand', brand);
    
    // Try to find UPC/EAN in product details
    let upc: string | null = null;
    
    // Check in detail elements
    const detailRows = document.querySelectorAll(amazonSelectors.details.join(', '));
    
    upc = findInElements(detailRows, 'upc', amazonRegexPatterns.upc) || 
          findInElements(detailRows, 'ean', amazonRegexPatterns.upc) || 
          findInElements(detailRows, 'gtin', amazonRegexPatterns.upc);
    
    // If not found in elements, try page source
    if (!upc) {
      const pageSource = document.documentElement.innerHTML;
      const upcMatch = pageSource.match(/UPC.*?(\d{12,13})/i) || 
                       pageSource.match(/EAN.*?(\d{12,13})/i) ||
                       pageSource.match(/ISBN.*?(\d{10,13})/i);
      
      if (upcMatch && upcMatch[1]) {
        upc = upcMatch[1];
      }
    }
    
    if (upc) {
      logExtraction('amazon', 'Found UPC/EAN', upc);
    }
    
    // Get main product image
    const imageElement = findElement(amazonSelectors.image);
    const imageUrl = getImageUrl(imageElement);
    logExtraction('amazon', 'Extracted image URL', imageUrl);
    
    const productData: ProductData = {
      title,
      price,
      marketplace: 'amazon',
      productId: asin,
      brand,
      upc,
      asin,
      imageUrl,
      pageUrl: window.location.href
    };
    
    logExtraction('amazon', 'Extracted product data', productData);
    return Promise.resolve(productData);
  } catch (error) {
    console.error('Error extracting Amazon product data:', error);
    return Promise.resolve(null);
  }
}
