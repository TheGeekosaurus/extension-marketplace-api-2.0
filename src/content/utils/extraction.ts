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
    const element = document.querySelector(selector);
    if (element) return element;
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
  
  // Remove currency symbols and commas
  const priceMatch = priceText.match(/[$£€]?([0-9,.]+)/);
  if (!priceMatch) return null;
  
  // Convert to number
  try {
    return parseFloat(priceMatch[1].replace(/,/g, ''));
  } catch (error) {
    console.error('Error parsing price:', error);
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
    if (text.includes(searchText)) {
      const match = text.match(regexPattern);
      if (match && match[0]) return match[0];
    }
  }
  return null;
}
