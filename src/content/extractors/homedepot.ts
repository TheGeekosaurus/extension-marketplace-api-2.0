// src/content/extractors/homedepot.ts - HomeDepot product data extractor

import { ProductData } from '../../types';
import { homedepotSelectors, homedepotRegexPatterns } from '../selectors/homedepot';
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
 * Extracts product data from a HomeDepot product page
 * 
 * @returns Extracted product data or null if extraction fails
 */
export function extractHomeDepotProductData(): ProductData | null {
  try {
    logExtraction('homedepot', 'Starting extraction');
    
    // Extract Internet # (product ID) from URL or page content
    const url = window.location.href;
    let productId = extractWithRegex(homedepotRegexPatterns.productId, url);
    
    // If not found in URL, try to find in the page content
    if (!productId) {
      const internetElement = findElement(homedepotSelectors.internetNumber);
      if (internetElement) {
        const internetText = extractText(internetElement);
        if (internetText) {
          const match = internetText.match(/\d+/);
          if (match) {
            productId = match[0];
          }
        }
      }
    }
    
    // If still not found, try with regex on page content
    if (!productId) {
      const pageText = document.body.innerText;
      const match = pageText.match(/Internet\s+#\s*(\d+)/i);
      if (match && match[1]) {
        productId = match[1];
      }
    }
    
    logExtraction('homedepot', 'Extracted product ID', productId);
    
    if (!productId) {
      logExtraction('homedepot', 'No product ID found in HomeDepot URL or page');
      return null;
    }
    
    // Extract product title
    const titleElement = findElement(homedepotSelectors.title);
    const title = extractText(titleElement) || 'Unknown Product';
    logExtraction('homedepot', 'Extracted title', title);
    
    // Extract product price
    const priceElement = findElement(homedepotSelectors.price);
    let price: number | null = null;
    
    if (priceElement) {
      const priceText = extractText(priceElement);
      price = parsePrice(priceText);
    }
    
    // If price not found with selectors, try regex on page content
    if (price === null) {
      const pageText = document.body.innerText;
      const match = pageText.match(/\$\s*(\d+(?:\.\d{1,2})?)/);
      if (match && match[1]) {
        price = parseFloat(match[1]);
      }
    }
    
    logExtraction('homedepot', 'Extracted price', price);
    
    // Extract brand
    const brandElement = findElement(homedepotSelectors.brand);
    let brand = extractText(brandElement);
    
    // If brand not found with selectors, try to extract from title (common format: "Brand Product Name")
    if (!brand && title) {
      // Often the first word in the title is the brand
      const possibleBrand = title.split(' ')[0];
      if (possibleBrand && possibleBrand.length > 2) {
        brand = possibleBrand;
      }
    }
    
    logExtraction('homedepot', 'Extracted brand', brand);
    
    // Try to find UPC in product details
    let upc: string | null = null;
    
    // Look for UPC with dedicated selectors
    const upcElement = findElement(homedepotSelectors.upc);
    if (upcElement) {
      const upcText = extractText(upcElement);
      if (upcText) {
        const match = upcText.match(/\d+/);
        if (match) {
          upc = match[0];
        }
      }
    }
    
    // If not found, try with regex on page source
    if (!upc) {
      const pageSource = document.documentElement.innerHTML;
      for (const pattern of homedepotRegexPatterns.upc) {
        const match = pageSource.match(pattern);
        if (match && match[1]) {
          upc = match[1];
          break;
        }
      }
    }
    
    logExtraction('homedepot', 'Extracted UPC', upc);
    
    // Get main product image
    const imageElement = findElement(homedepotSelectors.image);
    const imageUrl = getImageUrl(imageElement);
    logExtraction('homedepot', 'Extracted image URL', imageUrl);
    
    const productData: ProductData = {
      title,
      price,
      marketplace: 'homedepot',
      productId,
      brand,
      upc,
      asin: null, // HomeDepot doesn't use ASIN
      imageUrl,
      pageUrl: window.location.href
    };
    
    logExtraction('homedepot', 'Extracted HomeDepot product data', productData);
    return productData;
  } catch (error) {
    console.error('Error extracting HomeDepot product data:', error);
    return null;
  }
}
