// src/content/matchFinder/utils/dom.ts
// DOM manipulation utilities for matchFinder

import { logger } from './logger';

/**
 * Try multiple selectors until one returns elements
 * 
 * @param selectors - Array of CSS selectors to try
 * @param context - Optional parent element to search within
 * @returns Array of matched elements or empty array if none found
 */
export function trySelectors(
  selectors: string[], 
  context: Element | Document = document
): Element[] {
  for (const selector of selectors) {
    try {
      const elements = Array.from(context.querySelectorAll(selector));
      if (elements.length > 0) {
        logger.debug(`Found ${elements.length} elements with selector: ${selector}`);
        return elements;
      }
    } catch (error) {
      logger.error(`Error with selector '${selector}':`, error);
    }
  }
  
  logger.warn(`No elements found with any selector: ${selectors.join(', ')}`);
  return [];
}

/**
 * Extract text content from an element matching a selector
 * 
 * @param element - Parent element to search within
 * @param selectors - Array of selectors to try
 * @returns Extracted text or empty string if not found
 */
export function extractText(element: Element, selectors: string[]): string {
  for (const selector of selectors) {
    try {
      const el = element.querySelector(selector);
      if (el && el.textContent) {
        return el.textContent.trim();
      }
    } catch (error) {
      logger.error(`Error extracting text with selector '${selector}':`, error);
    }
  }
  
  return '';
}

/**
 * Extract a price from an element using multiple selectors
 * 
 * @param element - Parent element to search within
 * @param selectors - Array of price selectors to try
 * @returns Extracted price as number or null if not found/invalid
 */
export function extractPrice(element: Element, selectors: string[]): number | null {
  for (const selector of selectors) {
    try {
      const el = element.querySelector(selector);
      if (el && el.textContent) {
        const text = el.textContent.trim();
        logger.debug(`Raw price text from ${selector}:`, text);
        
        // Try to find a price pattern with $ sign and decimal (standard format)
        const standardMatch = text.match(/\$\s*(\d+\.\d{2})/);
        if (standardMatch && standardMatch[1]) {
          return parseFloat(standardMatch[1]);
        }
        
        // Check for the Walmart-specific w_iUH7 format "current price $XX.XX"
        if (text.includes('current price $')) {
          const currentPriceMatch = text.match(/current price \$(\d+\.\d{2})/);
          if (currentPriceMatch && currentPriceMatch[1]) {
            return parseFloat(currentPriceMatch[1]);
          }
        }
        
        // Handle cases where price is broken into pieces ($, 23, 94) like Walmart often does
        // Check if there are separate span elements for dollars and cents
        if (el.querySelector('span') && el.querySelectorAll('span').length >= 2) {
          // Try to reconstruct the price by combining all numeric content
          let allDigits = '';
          el.querySelectorAll('span').forEach(span => {
            if (span.textContent) {
              const digits = span.textContent.replace(/[^0-9]/g, '');
              if (digits) allDigits += digits;
            }
          });
          
          // If we have enough digits (at least 3), format as dollars and cents
          if (allDigits.length >= 3) {
            // Format: if length is even (e.g. 4 digits -> 1234), assume dollars.cents
            // if length is odd (e.g. 3 digits -> 123), assume x.yz
            if (allDigits.length % 2 === 0) {
              const middle = allDigits.length / 2;
              return parseFloat(`${allDigits.substring(0, middle)}.${allDigits.substring(middle)}`);
            } else {
              return parseFloat(`${allDigits.substring(0, allDigits.length - 2)}.${allDigits.substring(allDigits.length - 2)}`);
            }
          }
        }
        
        // Try to handle prices without decimals (e.g., "$5" -> 5.00)
        if (/^\$\s*\d+$/.test(text)) {
          const digits = text.replace(/[^0-9]/g, '');
          return parseInt(digits, 10);
        }
        
        // Try to handle prices with separated dollars/cents
        if (/^\$\s*\d+\s*\d{2}$/.test(text.replace(/[^0-9$\s]/g, ''))) {
          const parts = text.replace(/[^0-9\s]/g, '').trim().split(/\s+/);
          if (parts.length === 2) {
            return parseFloat(`${parts[0]}.${parts[1]}`);
          }
        }
        
        // Last resort: extract all digits and try to guess format
        const allDigits = text.replace(/[^0-9]/g, '');
        if (allDigits.length === 3) {
          // Format like "999" -> assume $9.99
          return parseFloat(`${allDigits.charAt(0)}.${allDigits.substring(1)}`);
        } else if (allDigits.length === 4) {
          // Format like "2399" -> assume $23.99
          return parseFloat(`${allDigits.substring(0, 2)}.${allDigits.substring(2)}`);
        }
      }
    } catch (error) {
      logger.error(`Error extracting price with selector '${selector}':`, error);
    }
  }
  
  // Try looking at all spans with dollar signs as a final fallback
  try {
    const allSpans = element.querySelectorAll('span');
    let dollars = '';
    let cents = '';
    
    // First pass: look for dollar signs
    for (const span of Array.from(allSpans)) {
      const text = span.textContent || '';
      if (text.includes('$')) {
        // Try to get the price from this span
        const match = text.match(/\$\s*(\d+)/);
        if (match && match[1]) {
          dollars = match[1];
          break;
        }
      }
    }
    
    // Second pass: look for decimal parts
    if (dollars) {
      for (const span of Array.from(allSpans)) {
        const text = span.textContent || '';
        if (!text.includes('$') && /^\d{2}$/.test(text.trim())) {
          cents = text.trim();
          break;
        }
      }
      
      if (dollars && cents) {
        return parseFloat(`${dollars}.${cents}`);
      }
    }
  } catch (error) {
    logger.error('Error in price extraction fallback:', error);
  }
  
  return null;
}

/**
 * Extract attribute value from an element using multiple selectors
 * 
 * @param element - Parent element to search within
 * @param selectors - Array of selectors to try
 * @param attribute - Attribute name to extract
 * @returns Extracted attribute value or null if not found
 */
export function extractAttribute(
  element: Element, 
  selectors: string[], 
  attribute: string
): string | null {
  for (const selector of selectors) {
    try {
      const el = element.querySelector(selector);
      if (el && el.hasAttribute(attribute)) {
        return el.getAttribute(attribute);
      }
    } catch (error) {
      logger.error(`Error extracting attribute '${attribute}' with selector '${selector}':`, error);
    }
  }
  
  return null;
}

/**
 * Highlight elements with specific styling to assist in debugging
 * 
 * @param elements - Elements to highlight
 * @param options - Optional styling options
 */
export function highlightElements(
  elements: Element[], 
  options: {
    color?: string;
    outlineWidth?: string;
    label?: boolean;
    duration?: number;
  } = {}
): void {
  const color = options.color || 'rgba(255, 0, 0, 0.3)';
  const outlineWidth = options.outlineWidth || '2px';
  const showLabel = options.label !== false;
  const duration = options.duration || 5000; // 5 seconds by default
  
  elements.forEach((element, index) => {
    // Cast to HTMLElement to get access to style property
    const htmlElement = element as HTMLElement;
    const originalStyles = {
      outline: htmlElement.style.outline,
      outlineOffset: htmlElement.style.outlineOffset,
      position: htmlElement.style.position,
      backgroundColor: htmlElement.style.backgroundColor,
      transition: htmlElement.style.transition
    };
    
    // Apply highlight styles
    htmlElement.style.outline = `${outlineWidth} solid ${color}`;
    htmlElement.style.outlineOffset = '2px';
    htmlElement.style.backgroundColor = 'rgba(255, 255, 0, 0.1)';
    htmlElement.style.transition = 'all 0.3s ease-in-out';
    
    // Add label if enabled
    let labelElement: HTMLElement | null = null;
    if (showLabel) {
      labelElement = document.createElement('div');
      labelElement.style.position = 'absolute';
      labelElement.style.top = '0';
      labelElement.style.left = '0';
      labelElement.style.backgroundColor = color;
      labelElement.style.color = 'white';
      labelElement.style.padding = '2px 5px';
      labelElement.style.fontSize = '12px';
      labelElement.style.zIndex = '10000';
      labelElement.style.borderRadius = '3px';
      labelElement.textContent = `Element #${index + 1}`;
      
      // Make sure the element has position relative or absolute
      if (window.getComputedStyle(element).position === 'static') {
        htmlElement.style.position = 'relative';
      }
      
      htmlElement.appendChild(labelElement);
    }
    
    // Remove highlighting after duration
    setTimeout(() => {
      // Restore original styles
      htmlElement.style.outline = originalStyles.outline;
      htmlElement.style.outlineOffset = originalStyles.outlineOffset;
      htmlElement.style.position = originalStyles.position;
      htmlElement.style.backgroundColor = originalStyles.backgroundColor;
      htmlElement.style.transition = originalStyles.transition;
      
      // Remove label if it was added
      if (labelElement && htmlElement.contains(labelElement)) {
        htmlElement.removeChild(labelElement);
      }
    }, duration);
  });
}