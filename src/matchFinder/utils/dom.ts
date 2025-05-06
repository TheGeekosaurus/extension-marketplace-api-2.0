// src/matchFinder/utils/dom.ts - DOM manipulation utilities

import { createLogger } from './logger';

const logger = createLogger('DomUtils');

/**
 * Find an element using an array of selector strings
 * 
 * @param selectors - Array of CSS selectors to try
 * @param context - Context element to search in (default: document)
 * @returns The first matching element or null if none found
 */
export function findElement(
  selectors: string[],
  context: Document | Element = document
): Element | null {
  for (const selector of selectors) {
    try {
      const element = context.querySelector(selector);
      if (element) {
        logger.debug(`Found element with selector: ${selector}`);
        return element;
      }
    } catch (error) {
      logger.error(`Error with selector ${selector}:`, error);
    }
  }
  
  logger.debug(`No elements found for selectors: ${selectors.join(', ')}`);
  return null;
}

/**
 * Find all elements matching an array of selector strings
 * 
 * @param selectors - Array of CSS selectors to try
 * @param context - Context element to search in (default: document)
 * @returns Array of matching elements
 */
export function findElements(
  selectors: string[],
  context: Document | Element = document
): Element[] {
  for (const selector of selectors) {
    try {
      const elements = context.querySelectorAll(selector);
      if (elements.length > 0) {
        logger.debug(`Found ${elements.length} elements with selector: ${selector}`);
        return Array.from(elements);
      }
    } catch (error) {
      logger.error(`Error with selector ${selector}:`, error);
    }
  }
  
  logger.debug(`No elements found for selectors: ${selectors.join(', ')}`);
  return [];
}

/**
 * Extract text content from an element if it exists
 * 
 * @param element - The element to extract text from
 * @returns The trimmed text content or null
 */
export function extractText(element: Element | null): string | null {
  if (!element || !element.textContent) return null;
  return element.textContent.trim() || null;
}

/**
 * Attempts to extract a value using regex patterns
 * 
 * @param patterns - Array of regex patterns to try
 * @param text - Text to search within
 * @returns The extracted value or null
 */
export function extractWithRegex(patterns: RegExp[], text: string): string | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      logger.debug(`Extracted value using pattern ${pattern}: ${match[1]}`);
      return match[1];
    }
  }
  
  logger.debug(`No match found for patterns in text: ${text.substring(0, 50)}...`);
  return null;
}

/**
 * Find elements that contain specific text
 * 
 * @param baseSelector - Base CSS selector to search within
 * @param searchText - Text to look for
 * @param context - Context element to search in (default: document)
 * @returns Element containing the text or null
 */
export function findElementWithText(
  baseSelector: string,
  searchText: string,
  context: Document | Element = document
): Element | null {
  try {
    const elements = context.querySelectorAll(baseSelector);
    for (const el of Array.from(elements)) {
      if (el.textContent && el.textContent.includes(searchText)) {
        logger.debug(`Found element containing text: ${searchText}`);
        return el;
      }
    }
    
    logger.debug(`No element found containing text: ${searchText}`);
    return null;
  } catch (error) {
    logger.error(`Error finding element with text ${searchText}:`, error);
    return null;
  }
}

/**
 * Get image URL safely from an img element
 * 
 * @param imgElement - Image element
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
    
    logger.debug('No image URL found in element');
    return null;
  } catch (error) {
    logger.error('Error getting image URL:', error);
    return null;
  }
}

/**
 * Highlight an element on the page for debugging
 * 
 * @param element - Element to highlight
 * @param color - Color to use (default: red)
 * @param label - Label to show (default: none)
 * @returns The created highlight element
 */
export function highlightElement(
  element: Element,
  color: string = '#ff0000',
  label?: string
): HTMLElement {
  const rect = element.getBoundingClientRect();
  const scrollX = window.scrollX || window.pageXOffset;
  const scrollY = window.scrollY || window.pageYOffset;
  
  // Create highlight element
  const highlight = document.createElement('div');
  highlight.style.position = 'absolute';
  highlight.style.left = `${rect.left + scrollX}px`;
  highlight.style.top = `${rect.top + scrollY}px`;
  highlight.style.width = `${rect.width}px`;
  highlight.style.height = `${rect.height}px`;
  highlight.style.border = `2px solid ${color}`;
  highlight.style.backgroundColor = `${color}22`; // Add some transparency
  highlight.style.zIndex = '9998';
  highlight.style.pointerEvents = 'none';
  highlight.style.boxSizing = 'border-box';
  highlight.className = 'match-finder-highlight';
  
  // Add label if provided
  if (label) {
    const labelEl = document.createElement('div');
    labelEl.style.position = 'absolute';
    labelEl.style.left = `${rect.left + scrollX}px`;
    labelEl.style.top = `${rect.top + scrollY - 20}px`;
    labelEl.style.backgroundColor = color;
    labelEl.style.color = 'white';
    labelEl.style.padding = '2px 5px';
    labelEl.style.fontSize = '10px';
    labelEl.style.borderRadius = '3px';
    labelEl.style.zIndex = '9999';
    labelEl.style.pointerEvents = 'none';
    labelEl.innerText = label;
    labelEl.className = 'match-finder-highlight';
    
    document.body.appendChild(labelEl);
  }
  
  document.body.appendChild(highlight);
  return highlight;
}

/**
 * Remove all highlight elements from the page
 */
export function removeHighlights(): void {
  const highlights = document.querySelectorAll('.match-finder-highlight');
  highlights.forEach(el => el.remove());
}
