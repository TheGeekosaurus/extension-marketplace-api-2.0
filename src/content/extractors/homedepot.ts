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
    
    // Method 1: Look for Internet # directly in the product info bar
    const internetNumberElement = findElement(homedepotSelectors.internetNumber);
    let productId = null;
    
    if (internetNumberElement) {
      const internetText = extractText(internetNumberElement);
      if (internetText) {
        // Extract only the number part
        const match = internetText.match(/\d+/);
        if (match) {
          productId = match[0];
        }
      }
    }
    
    // Method 2: Try extracting from URL if method 1 failed
    if (!productId) {
      const url = window.location.href;
      productId = extractWithRegex(homedepotRegexPatterns.productId, url);
    }
    
    // Method 3: Look for Internet # in page content
    if (!productId) {
      // Try to find text that contains "Internet #" followed by digits
      const pageText = document.body.innerText;
      const internetMatch = pageText.match(/Internet\s+#\s*(\d+)/i);
      if (internetMatch && internetMatch[1]) {
        productId = internetMatch[1];
      }
    }
    
    logExtraction('homedepot', 'Extracted Internet # (product ID)', productId);
    
    if (!productId) {
      logExtraction('homedepot', 'No product ID found in HomeDepot page');
      return null;
    }
    
    // Extract product title
    const titleElement = findElement(homedepotSelectors.title);
    const title = extractText(titleElement) || 'Unknown Product';
    logExtraction('homedepot', 'Extracted title', title);
    
    // Extract product price
    let price: number | null = null;
    
    // First attempt: Find the main price element
    const priceElement = findElement(homedepotSelectors.price);
    if (priceElement) {
      const priceText = extractText(priceElement);
      price = parsePrice(priceText);
      logExtraction('homedepot', 'Extracted price from price element', price);
    }
    
    // Second attempt: Try to find the price in the entire page
    if (price === null) {
      // Look for price pattern anywhere in the page
      const pageSource = document.body.innerHTML;
      const priceMatches = [...pageSource.matchAll(/\$\s*(\d+(?:\.\d{2})?)/g)];
      
      if (priceMatches.length > 0) {
        // Use the first match that looks like a price
        const priceMatch = priceMatches[0];
        if (priceMatch && priceMatch[1]) {
          price = parseFloat(priceMatch[1]);
          logExtraction('homedepot', 'Extracted price from page', price);
        }
      }
    }
    
    // Extract brand
    const brandElement = findElement(homedepotSelectors.brand);
    let brand = extractText(brandElement);
    
    // If brand not found with selectors, try to extract from title (common format: "Brand Product Name")
    if (!brand && title) {
      // Often the first word in the title is the brand
      const possibleBrand = title.split(' ')[0];
      if (possibleBrand && possibleBrand.length > 2 && !/^\d/.test(possibleBrand)) {
        brand = possibleBrand;
      }
    }
    
    logExtraction('homedepot', 'Extracted brand', brand);
    
    // Try to find UPC in product details
    let upc: string | null = null;
    
    // Method 1: Look for UPC element with dedicated selectors
    const upcElement = findElement(homedepotSelectors.upc);
    if (upcElement) {
      const upcText = extractText(upcElement);
      if (upcText) {
        // Extract only the number part
        const match = upcText.match(/\d+/);
        if (match) {
          upc = match[0];
          logExtraction('homedepot', 'Extracted UPC from element', upc);
        }
      }
    }
    
    // Method 2: Try to extract from page content if method 1 failed
    if (!upc) {
      // Try to find text that looks like "UPC Code #" followed by digits
      const pageText = document.body.innerText;
      const upcMatch = pageText.match(/UPC\s+Code\s+#\s*(\d+)/i);
      if (upcMatch && upcMatch[1]) {
        upc = upcMatch[1];
        logExtraction('homedepot', 'Extracted UPC from page text', upc);
      }
    }
    
    // Method 3: Look anywhere in page source
    if (!upc) {
      const pageSource = document.documentElement.innerHTML;
      // Find any sequence of 12-13 digits that might be a UPC
      const match = pageSource.match(/(\d{12,13})/);
      if (match && match[1]) {
        // Validate that it looks like a UPC (not just any number)
        // UPCs are typically 12-13 digits and often appear near text like "UPC" or "Code"
        const nearbyText = pageSource.substring(
          Math.max(0, pageSource.indexOf(match[1]) - 50),
          pageSource.indexOf(match[1]) + match[1].length + 50
        );
        
        if (nearbyText.toLowerCase().includes('upc') || nearbyText.toLowerCase().includes('code')) {
          upc = match[1];
          logExtraction('homedepot', 'Extracted UPC from page source', upc);
        }
      }
    }
    
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
