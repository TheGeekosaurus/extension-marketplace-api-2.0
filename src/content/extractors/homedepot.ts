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
  getImageUrl,
  findElementWithText,
  findNumericValueNearText
} from '../utils/extraction';

/**
 * Extracts product data from a HomeDepot product page
 * 
 * @returns Extracted product data or null if extraction fails
 */
export function extractHomeDepotProductData(): ProductData | null {
  try {
    logExtraction('homedepot', 'Starting extraction');
    
    // Method 1: Look for Internet # directly in the page (blue box at top)
    let productId = null;
    
    // First, try to match Internet # from text nodes that contain the exact format
    const internetElements = document.evaluate(
      "//*[contains(text(), 'Internet #')]",
      document,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null
    );
    
    for (let i = 0; i < internetElements.snapshotLength && !productId; i++) {
      const element = internetElements.snapshotItem(i);
      if (element) {
        const text = element.textContent || '';
        const match = text.match(/Internet\s+#\s*(\d+)/i);
        if (match && match[1]) {
          productId = match[1];
          logExtraction('homedepot', 'Found Internet # using XPath', productId);
        }
      }
    }
    
    // If not found yet, try element with specified class
    if (!productId) {
      const internetSpans = document.querySelectorAll('.sui-font-normal');
      for (const span of Array.from(internetSpans)) {
        const parentText = span.parentElement?.textContent || '';
        if (parentText.includes('Internet #')) {
          productId = span.textContent?.trim();
          logExtraction('homedepot', 'Found Internet # in span with class', productId);
          break;
        }
      }
    }
    
    // Method 2: Try extracting from URL if method 1 failed
    if (!productId) {
      const url = window.location.href;
      productId = extractWithRegex(homedepotRegexPatterns.productId, url);
      if (productId) {
        logExtraction('homedepot', 'Found Internet # from URL', productId);
      }
    }
    
    // Method 3: Look in page source as last resort
    if (!productId) {
      const pageSource = document.documentElement.innerHTML;
      const match = pageSource.match(/Internet\s+#\s*(\d+)/i);
      if (match && match[1]) {
        productId = match[1];
        logExtraction('homedepot', 'Found Internet # in page source', productId);
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
    
    // Method 1: Look for the current sale price with specific formatting
    // Find the price display in the format $279.99
    const priceElements = document.querySelectorAll('.sui-font-display');
    for (const el of Array.from(priceElements)) {
      const text = el.textContent || '';
      // Skip elements with just the dollar sign
      if (text === '$') continue;
      
      if (text.includes('$') && /\d/.test(text)) {
        const cleaned = text.replace(/[^0-9.]/g, '');
        if (cleaned && !isNaN(parseFloat(cleaned))) {
          price = parseFloat(cleaned);
          logExtraction('homedepot', 'Found price in display element', price);
          break;
        }
      }
    }
    
    // Method 2: Get the price components separately and combine them
    if (price === null) {
      // HomeDepot sometimes splits price into dollars and cents spans
      const dollarElement = document.querySelector('.sui-text-9xl');
      const centsElement = document.querySelector('.sui-text-3xl:not(.sui-text-9xl)');
      
      if (dollarElement && centsElement) {
        const dollars = dollarElement.textContent?.replace(/[^0-9]/g, '');
        const cents = centsElement.textContent?.replace(/[^0-9]/g, '');
        
        if (dollars && cents) {
          price = parseFloat(`${dollars}.${cents}`);
          logExtraction('homedepot', 'Constructed price from dollars and cents', price);
        }
      }
    }
    
    // Method 3: Look for price in the entire page
    if (price === null) {
      // Look for price pattern like $279.99 anywhere in the page
      const pageText = document.body.innerText;
      const priceMatches = pageText.match(/\$\s*(\d+)\.(\d{2})/);
      
      if (priceMatches && priceMatches[1] && priceMatches[2]) {
        price = parseFloat(`${priceMatches[1]}.${priceMatches[2]}`);
        logExtraction('homedepot', 'Extracted price from page text', price);
      }
    }
    
    // Method 4: Check for any numbers that might be the price
    if (price === null) {
      const specialBuyElements = document.querySelectorAll('.special-buy');
      for (const el of Array.from(specialBuyElements)) {
        const nearbyText = el.textContent || '';
        const priceMatch = nearbyText.match(/\$\s*(\d+)\.(\d{2})/);
        if (priceMatch && priceMatch[1] && priceMatch[2]) {
          price = parseFloat(`${priceMatch[1]}.${priceMatch[2]}`);
          logExtraction('homedepot', 'Found price near special buy', price);
          break;
        }
      }
    }
    
    logExtraction('homedepot', 'Final extracted price', price);
    
    // Extract brand
    const brandElement = findElement(homedepotSelectors.brand);
    let brand = extractText(brandElement);
    
    // If brand not found with selectors, try to extract from the first part of the page
    if (!brand) {
      // Look for the first bold or prominent text that might be a brand
      const possibleBrandElements = document.querySelectorAll('h1 + div, .product-title + div');
      for (const el of Array.from(possibleBrandElements)) {
        const text = el.textContent?.trim();
        if (text && text.length > 1 && text.length < 20) {  // Brand names are usually short
          brand = text;
          break;
        }
      }
    }
    
    // Last resort: try to get brand from the first word of the title
    if (!brand && title) {
      const possibleBrand = title.split(' ')[0];
      if (possibleBrand && possibleBrand.length > 2 && !/^\d/.test(possibleBrand)) {
        brand = possibleBrand;
      }
    }
    
    logExtraction('homedepot', 'Extracted brand', brand);
    
    // Try to find UPC in product details
    let upc: string | null = null;
    
    // Method 1: Look in product info area that contains UPC text
    const upcTextElements = document.evaluate(
      "//*[contains(text(), 'UPC Code')]",
      document,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null
    );
    
    for (let i = 0; i < upcTextElements.snapshotLength && !upc; i++) {
      const element = upcTextElements.snapshotItem(i);
      if (element) {
        const text = element.textContent || '';
        const match = text.match(/UPC\s+Code\s+#\s*(\d+)/i);
        if (match && match[1]) {
          upc = match[1];
          logExtraction('homedepot', 'Found UPC using XPath', upc);
        }
      }
    }
    
    // Method 2: Look for UPC in spans
    if (!upc) {
      const upcSpans = document.querySelectorAll('.sui-font-normal');
      for (const span of Array.from(upcSpans)) {
        const parentText = span.parentElement?.textContent || '';
        if (parentText.includes('UPC Code')) {
          upc = span.textContent?.trim();
          logExtraction('homedepot', 'Found UPC in span', upc);
          break;
        }
      }
    }
    
    // Method 3: Find UPC using regex on page source
    if (!upc) {
      const pageSource = document.documentElement.innerHTML;
      for (const pattern of homedepotRegexPatterns.upc) {
        const match = pageSource.match(pattern);
        if (match && match[1]) {
          upc = match[1];
          logExtraction('homedepot', 'Found UPC using regex', upc);
          break;
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
