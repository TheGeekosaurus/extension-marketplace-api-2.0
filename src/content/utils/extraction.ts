// src/content/utils/extraction.ts - Common extraction utilities

import { MarketplaceType } from '../../types';

/**
 * Attempts to find an element using an array of selector strings
 * 
 * @param selectors Array of CSS selectors to try
 * @returns The first matching element or null if none found
 */
export function findElement(selectors: string[]): Element | null {
  for (const selector of selectors) {
    try {
      const element = document.querySelector(selector);
      if (element) return element;
      
      // Handle special case for selectors with :contains()
      if (selector.includes(':contains(')) {
        // Extract the text to search for
        const containsMatch = selector.match(/:contains\(["'](.+?)["']\)/);
        if (containsMatch && containsMatch[1]) {
          const searchText = containsMatch[1];
          
          // Get the base selector without the :contains() part
          const baseSelector = selector.replace(/:contains\(["'].+?["']\)/, '');
          
          // Try to find elements matching the base selector
          const elements = document.querySelectorAll(baseSelector);
          for (const el of Array.from(elements)) {
            if (el.textContent && el.textContent.includes(searchText)) {
              return el;
            }
          }
        }
      }
    } catch (e) {
      console.error(`[E-commerce Arbitrage] Error with selector ${selector}:`, e);
    }
  }
  return null;
}

/**
 * Find elements that contain specific text
 * 
 * @param baseSelector Base CSS selector to search within
 * @param searchText Text to look for
 * @returns Element containing the text or null
 */
export function findElementWithText(baseSelector: string, searchText: string): Element | null {
  try {
    const elements = document.querySelectorAll(baseSelector);
    for (const el of Array.from(elements)) {
      if (el.textContent && el.textContent.includes(searchText)) {
        return el;
      }
    }
  } catch (e) {
    console.error(`[E-commerce Arbitrage] Error finding element with text ${searchText}:`, e);
  }
  return null;
}

/**
 * Extracts text content from an element if it exists
 * 
 * @param element The element to extract text from
 * @returns The trimmed text content or null
 */
export function extractText(element: Element | null): string | null {
  if (!element || !element.textContent) return null;
  return element.textContent.trim() || null;
}

/**
 * Attempts to extract a product ID using regex patterns
 * 
 * @param patterns Array of regex patterns to try
 * @param text Text to search within (usually URL or page HTML)
 * @returns The extracted ID or null
 */
export function extractWithRegex(patterns: RegExp[], text: string): string | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) return match[1];
  }
  return null;
}

/**
 * Parse a price string into a number
 * 
 * @param priceText Price text that may contain currency symbols
 * @returns Parsed price as number or null if invalid
 */
export function parsePrice(priceText: string | null): number | null {
  if (!priceText) return null;
  
  // Handle cases where price might be split between multiple elements
  if (priceText === '$') return null;
  
  // Remove currency symbols, commas, and whitespace
  const cleanedText = priceText.replace(/[^\d.,]/g, '');
  
  // Handle different number formats
  try {
    // Convert to number
    const price = parseFloat(cleanedText.replace(/,/g, '.'));
    return isNaN(price) ? null : price;
  } catch (error) {
    console.error('[E-commerce Arbitrage] Error parsing price:', error);
    return null;
  }
}

/**
 * Logs extraction operation with marketplace prefix
 * 
 * @param marketplace The marketplace being processed
 * @param message Log message
 * @param data Optional data to log
 */
export function logExtraction(
  marketplace: MarketplaceType, 
  message: string, 
  data?: any
): void {
  const prefix = `[E-commerce Arbitrage][${marketplace}]`;
  if (data !== undefined) {
    console.log(`${prefix} ${message}:`, data);
  } else {
    console.log(`${prefix} ${message}`);
  }
}

/**
 * Search for a specific pattern in text within a collection of elements
 * 
 * @param elements Collection of elements to search
 * @param searchText Text to search for (case insensitive)
 * @param regexPattern Regex pattern to extract data when text is found
 * @returns Extracted data or null
 */
export function findInElements(
  elements: NodeListOf<Element>,
  searchText: string,
  regexPattern: RegExp
): string | null {
  for (const element of Array.from(elements)) {
    const text = element.textContent?.toLowerCase() || '';
    if (text.includes(searchText.toLowerCase())) {
      const match = text.match(regexPattern);
      if (match && match[0]) return match[0];
    }
  }
  return null;
}

/**
 * Finds UPC or similar identifiers in page content
 * 
 * @param regexPattern Pattern to match identifier
 * @returns Extracted identifier or null
 */
export function findIdentifierInPage(regexPattern: RegExp): string | null {
  const pageSource = document.documentElement.innerHTML;
  const match = pageSource.match(regexPattern);
  return match && match[1] ? match[1] : null;
}

/**
 * Get image URL safely from an img element
 * 
 * @param imgElement Image element
 * @returns Image URL or null
 */
export function getImageUrl(imgElement: Element | null): string | null {
  if (!imgElement) return null;
  
  try {
    // Try src attribute
    const src = (imgElement as HTMLImageElement).src;
    if (src) return src;
    
    // Try data-src attribute (lazy loading)
    const dataSrc = imgElement.getAttribute('data-src');
    if (dataSrc) return dataSrc;
    
    // Try data-image-path attribute (used by some sites)
    const dataImagePath = imgElement.getAttribute('data-image-path');
    if (dataImagePath) return dataImagePath;
    
    // Try data-original attribute
    const dataOriginal = imgElement.getAttribute('data-original');
    if (dataOriginal) return dataOriginal;
    
    // Try srcset attribute
    const srcset = imgElement.getAttribute('srcset');
    if (srcset) {
      // Get first URL from srcset
      const srcsetParts = srcset.split(',');
      if (srcsetParts.length > 0) {
        const firstSrc = srcsetParts[0].trim().split(' ')[0];
        if (firstSrc) return firstSrc;
      }
    }
  } catch (e) {
    console.error('[E-commerce Arbitrage] Error getting image URL:', e);
  }
  
  return null;
}

/**
 * Find a numeric value near specific text in the page
 * 
 * @param searchText Text to search for
 * @param preText Text that appears before the number (optional)
 * @returns Numeric value or null
 */
export function findNumericValueNearText(searchText: string, preText: string = ''): string | null {
  try {
    // Convert the entire document to text
    const pageText = document.body.innerText;
    
    // Find the position of the search text
    const searchPosition = pageText.indexOf(searchText);
    if (searchPosition === -1) return null;
    
    // Get a chunk of text after the search text
    const textChunk = pageText.substring(searchPosition, searchPosition + 100);
    
    // Look for numeric pattern after the pre-text
    const match = textChunk.match(new RegExp(`${preText}\\s*(\\d+[\\d.,]*)`));
    return match ? match[1] : null;
  } catch (e) {
    console.error('[E-commerce Arbitrage] Error finding numeric value:', e);
    return null;
  }
}
