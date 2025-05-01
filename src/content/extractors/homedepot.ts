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
 * Uses multiple extraction methods with fallbacks:
 * 1. JSON-LD structured data (primary method)
 * 2. GraphQL API data extraction (supplemental)
 * 3. DOM selectors (fallback when other methods fail)
 * 
 * @returns Extracted product data or null if extraction fails
 */
export function extractHomeDepotProductData(): Promise<ProductData | null> {
  try {
    logExtraction('homedepot', 'Starting extraction');
    
    // Extract from JSON-LD first (most reliable method)
    const jsonLdData = extractJsonLdData();
    
    // If JSON-LD extraction worked, use it as the base
    if (jsonLdData) {
      logExtraction('homedepot', 'Successfully extracted JSON-LD data', jsonLdData);
      
      // Get additional data from DOM as needed
      return enhanceProductData(jsonLdData);
    }
    
    // Fallback to DOM extraction if JSON-LD failed
    logExtraction('homedepot', 'JSON-LD extraction failed, falling back to DOM extraction');
    return fallbackDomExtraction();
  } catch (error) {
    console.error('Error extracting HomeDepot product data:', error);
    return Promise.resolve(null);
  }
}

/**
 * Extract structured data from JSON-LD script tags
 * 
 * @returns Product data from JSON-LD or null if not available
 */
function extractJsonLdData(): ProductData | null {
  try {
    // Find all JSON-LD script tags in the document
    const jsonLdTags = document.querySelectorAll('script[type="application/ld+json"]');
    if (!jsonLdTags || jsonLdTags.length === 0) {
      logExtraction('homedepot', 'No JSON-LD tags found in page');
      return null;
    }
    
    logExtraction('homedepot', `Found ${jsonLdTags.length} JSON-LD tag(s)`);
    
    // Process each JSON-LD block
    for (const tag of Array.from(jsonLdTags)) {
      try {
        const jsonText = tag.textContent;
        if (!jsonText) continue;
        
        const jsonData = JSON.parse(jsonText);
        
        // Look for Product schema specifically
        if (jsonData['@type'] === 'Product') {
          logExtraction('homedepot', 'Found Product JSON-LD data', jsonData);
          
          // Extract basic product data from JSON-LD
          const productData: ProductData = {
            title: jsonData.name || '',
            price: jsonData.offers?.price ? parseFloat(jsonData.offers.price) : null,
            marketplace: 'homedepot',
            productId: jsonData.sku || '', // Internet # is often in the sku field
            brand: jsonData.brand?.name || null,
            upc: jsonData.gtin || jsonData.gtin12 || jsonData.gtin13 || null,
            asin: null, // HomeDepot doesn't use ASIN
            imageUrl: Array.isArray(jsonData.image) ? jsonData.image[0] : jsonData.image,
            pageUrl: window.location.href
          };
          
          return productData;
        }
      } catch (e) {
        logExtraction('homedepot', `Error parsing JSON-LD tag: ${e}`);
        continue; // Try the next JSON-LD tag if there are more
      }
    }
    
    logExtraction('homedepot', 'No valid Product JSON-LD data found');
    return null;
  } catch (error) {
    logExtraction('homedepot', `JSON-LD extraction error: ${error}`);
    return null;
  }
}

/**
 * Enhance product data with additional information from GraphQL API or DOM
 * 
 * @param baseData Base product data from JSON-LD
 * @returns Enhanced product data with additional information
 */
async function enhanceProductData(baseData: ProductData): Promise<ProductData | null> {
  try {
    // First, attempt to get additional data from GraphQL API
    const itemId = baseData.productId;
    if (itemId) {
      // Try to get GraphQL data
      const graphQLData = await extractGraphQLData(itemId);
      
      if (graphQLData) {
        logExtraction('homedepot', 'Successfully extracted GraphQL data', graphQLData);
        
        // Merge GraphQL data with base data
        // Use GraphQL data when available, otherwise keep the original data
        const enhancedData: ProductData = {
          ...baseData,
          // Update fields with GraphQL data if available
          title: graphQLData.title || baseData.title,
          price: graphQLData.price || baseData.price,
          brand: graphQLData.brand || baseData.brand,
          upc: graphQLData.upc || baseData.upc,
          imageUrl: graphQLData.imageUrl || baseData.imageUrl
        };
        
        return enhancedData;
      }
    }
    
    // If we couldn't get GraphQL data, try to fill in missing pieces from DOM
    const domData = await fillMissingDataFromDom(baseData);
    return domData;
  } catch (error) {
    logExtraction('homedepot', `Error enhancing product data: ${error}`);
    // If enhancement fails, return the original data
    return baseData;
  }
}

/**
 * Extract data from Home Depot's internal GraphQL API
 * 
 * @param itemId Product ID (Internet #)
 * @returns Product data from GraphQL or null if not available
 */
async function extractGraphQLData(itemId: string): Promise<Partial<ProductData> | null> {
  try {
    logExtraction('homedepot', `Extracting GraphQL data for product ID: ${itemId}`);
    
    // Create message to request GraphQL data from background script
    const message = {
      action: 'HD_FETCH_PRODUCT_API',
      itemId: itemId,
      storeId: null, // Optional: Can be configured in settings if store-specific data is needed
      zipCode: null  // Optional: Can be configured in settings if location-specific data is needed
    };
    
    // Send message to background script
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (!response || !response.success) {
          logExtraction('homedepot', 'GraphQL data request failed or timed out');
          resolve(null);
          return;
        }
        
        const apiData = response.data;
        if (!apiData) {
          resolve(null);
          return;
        }
        
        // Extract relevant fields from API response
        const graphQLData: Partial<ProductData> = {
          title: apiData.name,
          price: apiData.price,
          brand: apiData.brandName,
          upc: apiData.upc,
          imageUrl: apiData.imageUrl
        };
        
        resolve(graphQLData);
      });
    });
  } catch (error) {
    logExtraction('homedepot', `GraphQL extraction error: ${error}`);
    return null;
  }
}

/**
 * Fill in missing product data from DOM elements
 * 
 * @param baseData Existing product data that may be incomplete
 * @returns Complete product data with missing fields filled in
 */
async function fillMissingDataFromDom(baseData: ProductData): Promise<ProductData> {
  try {
    // Make a copy to avoid modifying the original
    const enrichedData = { ...baseData };
    
    // Fill in missing title
    if (!enrichedData.title) {
      const titleElement = findElement(homedepotSelectors.title);
      enrichedData.title = extractText(titleElement) || 'Unknown Product';
      logExtraction('homedepot', 'Extracted title from DOM', enrichedData.title);
    }
    
    // Fill in missing price
    if (enrichedData.price === null) {
      const priceElement = findElement(homedepotSelectors.price);
      let price = null;
      
      if (priceElement) {
        const priceText = extractText(priceElement);
        price = parsePrice(priceText);
      }
      
      // Try alternative price formats if primary extraction failed
      if (price === null) {
        // Try to find dollars and cents separately
        const dollarElement = document.querySelector('.sui-text-9xl');
        const centsElement = document.querySelector('.sui-text-3xl:not(.sui-text-9xl)');
        
        if (dollarElement && centsElement) {
          const dollars = dollarElement.textContent?.replace(/[^0-9]/g, '') || '';
          const cents = centsElement.textContent?.replace(/[^0-9]/g, '') || '';
          
          if (dollars && cents) {
            price = parseFloat(`${dollars}.${cents}`);
          }
        }
      }
      
      if (price !== null) {
        enrichedData.price = price;
        logExtraction('homedepot', 'Extracted price from DOM', price);
      }
    }
    
    // Fill in missing product ID (Internet #)
    if (!enrichedData.productId) {
      // Method 1: Look for Internet # in the text content
      const internetElements = document.evaluate(
        "//*[contains(text(), 'Internet #')]",
        document,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null
      );
      
      for (let i = 0; i < internetElements.snapshotLength; i++) {
        const element = internetElements.snapshotItem(i);
        if (element) {
          const text = element.textContent || '';
          const match = text.match(/Internet\s+#\s*(\d+)/i);
          if (match && match[1]) {
            enrichedData.productId = match[1];
            logExtraction('homedepot', 'Found Internet # using XPath', enrichedData.productId);
            break;
          }
        }
      }
      
      // Method 2: Try extracting from URL if method 1 failed
      if (!enrichedData.productId) {
        const url = window.location.href;
        const idFromUrl = extractWithRegex(homedepotRegexPatterns.productId, url);
        if (idFromUrl) {
          enrichedData.productId = idFromUrl;
          logExtraction('homedepot', 'Found Internet # from URL', enrichedData.productId);
        }
      }
    }
    
    // Fill in missing brand
    if (!enrichedData.brand) {
      const brandElement = findElement(homedepotSelectors.brand);
      const brand = extractText(brandElement);
      if (brand) {
        enrichedData.brand = brand;
        logExtraction('homedepot', 'Extracted brand from DOM', brand);
      }
    }
    
    // Fill in missing UPC
    if (!enrichedData.upc) {
      // Method 1: Look in product info area that contains UPC text
      const upcTextElements = document.evaluate(
        "//*[contains(text(), 'UPC')]",
        document,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null
      );
      
      for (let i = 0; i < upcTextElements.snapshotLength; i++) {
        const element = upcTextElements.snapshotItem(i);
        if (element) {
          const text = element.textContent || '';
          const match = text.match(/UPC\s*:?\s*(\d{12,13})/i);
          if (match && match[1]) {
            enrichedData.upc = match[1];
            logExtraction('homedepot', 'Found UPC using XPath', enrichedData.upc);
            break;
          }
        }
      }
      
      // Method 2: Find UPC using regex on page source
      if (!enrichedData.upc) {
        const pageSource = document.documentElement.innerHTML;
        for (const pattern of homedepotRegexPatterns.upc) {
          const match = pageSource.match(pattern);
          if (match && match[1]) {
            enrichedData.upc = match[1];
            logExtraction('homedepot', 'Found UPC using regex', enrichedData.upc);
            break;
          }
        }
      }
    }
    
    // Fill in missing image URL
    if (!enrichedData.imageUrl) {
      const imageElement = findElement(homedepotSelectors.image);
      const imageUrl = getImageUrl(imageElement);
      if (imageUrl) {
        enrichedData.imageUrl = imageUrl;
        logExtraction('homedepot', 'Extracted image URL from DOM', imageUrl);
      }
    }
    
    return enrichedData;
  } catch (error) {
    logExtraction('homedepot', `Error filling missing data from DOM: ${error}`);
    // If there's an error, return the original data
    return baseData;
  }
}

/**
 * Fallback to DOM extraction if JSON-LD extraction fails
 * 
 * @returns Product data extracted from DOM or null if extraction fails
 */
async function fallbackDomExtraction(): Promise<ProductData | null> {
  try {
    logExtraction('homedepot', 'Using DOM fallback extraction');
    
    // Extract product ID (Internet #)
    let productId: string | null = null;
    
    // First method: Look for Internet # directly in the page
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
          const spanText = span.textContent?.trim() || null;
          if (spanText) {
            productId = spanText;
            logExtraction('homedepot', 'Found Internet # in span with class', productId);
            break;
          }
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
    
    // Extract title
    const titleElement = findElement(homedepotSelectors.title);
    const title = extractText(titleElement) || 'Unknown Product';
    logExtraction('homedepot', 'Extracted title', title);
    
    // Extract price
    let price: number | null = null;
    
    // Method 1: Look for the current sale price with specific formatting
    const priceElements = document.querySelectorAll('.sui-font-display');
    for (const el of Array.from(priceElements)) {
      const text = el.textContent || '';
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
      const dollarElement = document.querySelector('.sui-text-9xl');
      const centsElement = document.querySelector('.sui-text-3xl:not(.sui-text-9xl)');
      
      if (dollarElement && centsElement) {
        const dollars = dollarElement.textContent?.replace(/[^0-9]/g, '') || '';
        const cents = centsElement.textContent?.replace(/[^0-9]/g, '') || '';
        
        if (dollars && cents) {
          price = parseFloat(`${dollars}.${cents}`);
          logExtraction('homedepot', 'Constructed price from dollars and cents', price);
        }
      }
    }
    
    // Method 3: Look for price in the entire page
    if (price === null) {
      const pageText = document.body.innerText;
      const priceMatches = pageText.match(/\$\s*(\d+)\.(\d{2})/);
      
      if (priceMatches && priceMatches[1] && priceMatches[2]) {
        price = parseFloat(`${priceMatches[1]}.${priceMatches[2]}`);
        logExtraction('homedepot', 'Extracted price from page text', price);
      }
    }
    
    logExtraction('homedepot', 'Final extracted price', price);
    
    // Extract brand
    const brandElement = findElement(homedepotSelectors.brand);
    let brand = extractText(brandElement);
    
    // If brand not found with selectors, try to extract from the first part of the page
    if (!brand) {
      const possibleBrandElements = document.querySelectorAll('h1 + div, .product-title + div');
      for (const el of Array.from(possibleBrandElements)) {
        const text = el.textContent?.trim() || null;
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
      "//*[contains(text(), 'UPC')]",
      document,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null
    );
    
    for (let i = 0; i < upcTextElements.snapshotLength && !upc; i++) {
      const element = upcTextElements.snapshotItem(i);
      if (element) {
        const text = element.textContent || '';
        const match = text.match(/UPC\s*:?\s*(\d{12,13})/i);
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
        if (parentText.includes('UPC')) {
          const spanText = span.textContent?.trim() || null;
          if (spanText) {
            upc = spanText;
            logExtraction('homedepot', 'Found UPC in span', upc);
            break;
          }
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
      productId: productId,
      brand,
      upc,
      asin: null, // HomeDepot doesn't use ASIN
      imageUrl,
      pageUrl: window.location.href
    };
    
    // If we have the product ID, try to get additional data from GraphQL API
    if (productId) {
      const graphQLData = await extractGraphQLData(productId);
      if (graphQLData) {
        // Merge GraphQL data with DOM data, prioritizing GraphQL when available
        return {
          ...productData,
          price: graphQLData.price || productData.price,
          brand: graphQLData.brand || productData.brand,
          upc: graphQLData.upc || productData.upc,
          imageUrl: graphQLData.imageUrl || productData.imageUrl
        };
      }
    }
    
    logExtraction('homedepot', 'Extracted HomeDepot product data', productData);
    return productData;
  } catch (error) {
    console.error('Error extracting HomeDepot product data using DOM fallback:', error);
    return null;
  }
}
