// src/content/utils/selectorTester.ts - Selector testing utility

import { MarketplaceType } from '../../types';
import { amazonSelectors } from '../selectors/amazon';
import { walmartSelectors } from '../selectors/walmart';
import { targetSelectors } from '../selectors/target';
import { homedepotSelectors } from '../selectors/homedepot';
import { logExtraction } from './extraction';

/**
 * Interface for selector test result
 */
export interface SelectorTestResult {
  selector: string;
  found: boolean;
  count: number;
  foundText?: string;
  error?: string;
}

/**
 * Type for a group of test results
 */
export interface SelectorTestGroup {
  groupName: string;
  results: SelectorTestResult[];
  foundCount: number;
  totalCount: number;
}

/**
 * Tests all selectors for a given marketplace
 * 
 * @param marketplace - Marketplace to test selectors for
 * @returns Results of selector tests grouped by category
 */
export function testSelectorsForMarketplace(marketplace: MarketplaceType): Record<string, SelectorTestGroup> {
  console.log(`[Selector Tester] Testing selectors for ${marketplace}`);
  
  // Choose the appropriate selectors based on marketplace
  let selectorGroups: Record<string, string[]>;
  switch (marketplace) {
    case 'amazon':
      selectorGroups = amazonSelectors;
      break;
    case 'walmart':
      selectorGroups = walmartSelectors;
      break;
    case 'target':
      selectorGroups = targetSelectors;
      break;
    case 'homedepot':
      selectorGroups = homedepotSelectors;
      break;
    default:
      console.error(`[Selector Tester] Unknown marketplace: ${marketplace}`);
      return {};
  }
  
  // Test each group of selectors
  const results: Record<string, SelectorTestGroup> = {};
  
  for (const [groupName, selectors] of Object.entries(selectorGroups)) {
    results[groupName] = testSelectorGroup(groupName, selectors);
  }
  
  // Log a summary
  const totalGroups = Object.keys(results).length;
  const successfulGroups = Object.values(results).filter(group => group.foundCount > 0).length;
  
  console.log(`[Selector Tester] Results for ${marketplace}: ${successfulGroups}/${totalGroups} groups found at least one match`);
  
  return results;
}

/**
 * Tests a group of selectors (e.g., all price selectors)
 * 
 * @param groupName - Name of the selector group
 * @param selectors - Array of selectors to test
 * @returns Test results for the group
 */
export function testSelectorGroup(groupName: string, selectors: string[]): SelectorTestGroup {
  const results: SelectorTestResult[] = [];
  let foundCount = 0;
  
  console.log(`[Selector Tester] Testing group: ${groupName} (${selectors.length} selectors)`);
  
  for (const selector of selectors) {
    try {
      const result = testSelector(selector);
      results.push(result);
      
      if (result.found) {
        foundCount++;
      }
    } catch (error) {
      results.push({
        selector,
        found: false,
        count: 0,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  return {
    groupName,
    results,
    foundCount,
    totalCount: selectors.length
  };
}

/**
 * Tests a single CSS selector
 * 
 * @param selector - CSS selector to test
 * @returns Test result with found status, count, and sample text
 */
export function testSelector(selector: string): SelectorTestResult {
  try {
    // Handle special case for selectors with :contains()
    if (selector.includes(':contains(')) {
      return testContainsSelector(selector);
    }
    
    // Regular selector
    const elements = document.querySelectorAll(selector);
    const found = elements.length > 0;
    
    // Extract text from the first element if found
    let foundText: string | undefined;
    if (found && elements[0].textContent) {
      foundText = elements[0].textContent.trim().substring(0, 100);
      if (foundText.length === 100) {
        foundText += '...';
      }
    }
    
    return {
      selector,
      found,
      count: elements.length,
      foundText
    };
  } catch (error) {
    return {
      selector,
      found: false,
      count: 0,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Special handling for :contains() pseudo-selector which is not standard CSS
 * but used in our selector system
 * 
 * @param selector - Selector with :contains() pseudo-selector
 * @returns Test result
 */
function testContainsSelector(selector: string): SelectorTestResult {
  try {
    // Extract the text to search for
    const containsMatch = selector.match(/:contains\(["'](.+?)["']\)/);
    if (!containsMatch || !containsMatch[1]) {
      return {
        selector,
        found: false,
        count: 0,
        error: 'Invalid :contains() format'
      };
    }
    
    const searchText = containsMatch[1];
    
    // Get the base selector without the :contains() part
    const baseSelector = selector.replace(/:contains\(["'].+?["']\)/, '');
    
    // Try to find elements matching the base selector
    const elements = document.querySelectorAll(baseSelector);
    let matchingElements = 0;
    let foundText: string | undefined;
    
    for (const el of Array.from(elements)) {
      if (el.textContent && el.textContent.includes(searchText)) {
        matchingElements++;
        
        // Get text from the first matching element
        if (matchingElements === 1) {
          foundText = el.textContent.trim().substring(0, 100);
          if (foundText.length === 100) {
            foundText += '...';
          }
        }
      }
    }
    
    return {
      selector,
      found: matchingElements > 0,
      count: matchingElements,
      foundText
    };
  } catch (error) {
    return {
      selector,
      found: false,
      count: 0,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Run a debug test for all selectors on the current page
 * This is triggered by a message from the popup or settings
 * 
 * @param marketplace - Marketplace to test selectors for
 * @returns Full test results
 */
export function runSelectorDebugger(marketplace: MarketplaceType): Record<string, SelectorTestGroup> {
  console.log(`[Selector Debugger] Running debugger for ${marketplace}`);
  
  // Test all selectors for the marketplace
  const results = testSelectorsForMarketplace(marketplace);
  
  // Log the results in a more readable format
  console.group(`[Selector Debugger] Results for ${marketplace}`);
  
  for (const [groupName, group] of Object.entries(results)) {
    console.group(`${groupName}: ${group.foundCount}/${group.totalCount} selectors found matches`);
    
    for (const result of group.results) {
      if (result.found) {
        console.log(`✅ ${result.selector} - Found ${result.count} elements`);
        if (result.foundText) {
          console.log(`   Text: "${result.foundText}"`);
        }
      } else {
        console.error(`❌ ${result.selector} - Not found${result.error ? ` (Error: ${result.error})` : ''}`);
      }
    }
    
    console.groupEnd();
  }
  
  console.groupEnd();
  
  return results;
}

/**
 * Display visual debugging highlights for elements that match selectors
 * This adds colored outlines to elements on the page
 * 
 * @param marketplace - Marketplace to highlight selectors for
 */
export function highlightSelectors(marketplace: MarketplaceType): void {
  console.log(`[Selector Highlighter] Highlighting elements for ${marketplace}`);
  
  // Choose the appropriate selectors based on marketplace
  let selectorGroups: Record<string, string[]>;
  switch (marketplace) {
    case 'amazon':
      selectorGroups = amazonSelectors;
      break;
    case 'walmart':
      selectorGroups = walmartSelectors;
      break;
    case 'target':
      selectorGroups = targetSelectors;
      break;
    case 'homedepot':
      selectorGroups = homedepotSelectors;
      break;
    default:
      console.error(`[Selector Highlighter] Unknown marketplace: ${marketplace}`);
      return;
  }
  
  // Define colors for different groups
  const colors = [
    '#ff5252', // Red
    '#4caf50', // Green
    '#2196f3', // Blue
    '#ff9800', // Orange
    '#9c27b0', // Purple
    '#00bcd4', // Cyan
    '#795548', // Brown
    '#607d8b'  // Gray
  ];
  
  // Remove any existing highlights
  const existingHighlights = document.querySelectorAll('.selector-highlight');
  existingHighlights.forEach(el => el.remove());
  
  // Highlight each group with a different color
  let colorIndex = 0;
  const highlightedElements = new Set<Element>();
  
  for (const [groupName, selectors] of Object.entries(selectorGroups)) {
    const color = colors[colorIndex % colors.length];
    colorIndex++;
    
    for (const selector of selectors) {
      try {
        // Handle special case for selectors with :contains()
        if (selector.includes(':contains(')) {
          // Extract the text to search for
          const containsMatch = selector.match(/:contains\(["'](.+?)["']\)/);
          if (!containsMatch || !containsMatch[1]) continue;
          
          const searchText = containsMatch[1];
          const baseSelector = selector.replace(/:contains\(["'].+?["']\)/, '');
          
          const elements = document.querySelectorAll(baseSelector);
          for (const el of Array.from(elements)) {
            if (el.textContent && el.textContent.includes(searchText) && !highlightedElements.has(el)) {
              highlightElement(el, color, groupName, selector);
              highlightedElements.add(el);
            }
          }
        } else {
          // Regular selector
          const elements = document.querySelectorAll(selector);
          for (const el of Array.from(elements)) {
            if (!highlightedElements.has(el)) {
              highlightElement(el, color, groupName, selector);
              highlightedElements.add(el);
            }
          }
        }
      } catch (error) {
        console.error(`[Selector Highlighter] Error with selector ${selector}:`, error);
      }
    }
  }
  
  console.log(`[Selector Highlighter] Highlighted ${highlightedElements.size} elements`);
  
  // Show a tooltip with instructions
  const tooltip = document.createElement('div');
  tooltip.style.position = 'fixed';
  tooltip.style.top = '10px';
  tooltip.style.right = '10px';
  tooltip.style.padding = '10px';
  tooltip.style.background = 'rgba(0, 0, 0, 0.8)';
  tooltip.style.color = 'white';
  tooltip.style.borderRadius = '5px';
  tooltip.style.zIndex = '9999';
  tooltip.style.maxWidth = '300px';
  tooltip.style.fontSize = '14px';
  tooltip.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
  tooltip.classList.add('selector-highlight');
  tooltip.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 5px;">Selector Highlighter</div>
    <div>Elements are highlighted with their selector group colors.</div>
    <div style="margin-top: 5px;">Click anywhere to dismiss highlights.</div>
  `;
  document.body.appendChild(tooltip);
  
  // Add click handler to remove highlights when clicking on the page
  const clickHandler = () => {
    const highlights = document.querySelectorAll('.selector-highlight');
    highlights.forEach(el => el.remove());
    document.removeEventListener('click', clickHandler);
  };
  
  document.addEventListener('click', clickHandler);
}

/**
 * Helper function to highlight an individual element
 * 
 * @param element - Element to highlight
 * @param color - Color to use for the highlight
 * @param groupName - Name of the selector group
 * @param selector - Selector that matched this element
 */
function highlightElement(element: Element, color: string, groupName: string, selector: string): void {
  // Calculate position and size of the element
  const rect = element.getBoundingClientRect();
  const scrollX = window.scrollX || window.pageXOffset;
  const scrollY = window.scrollY || window.pageYOffset;
  
  // Create highlight element
  const highlight = document.createElement('div');
  highlight.classList.add('selector-highlight');
  highlight.style.position = 'absolute';
  highlight.style.left = `${rect.left + scrollX}px`;
  highlight.style.top = `${rect.top + scrollY}px`;
  highlight.style.width = `${rect.width}px`;
  highlight.style.height = `${rect.height}px`;
  highlight.style.border = `2px solid ${color}`;
  highlight.style.backgroundColor = `${color}22`; // Add some transparency
  highlight.style.zIndex = '9998';
  highlight.style.pointerEvents = 'none'; // Don't interfere with page interaction
  highlight.style.boxSizing = 'border-box';
  
  // Add a label
  const label = document.createElement('div');
  label.classList.add('selector-highlight');
  label.style.position = 'absolute';
  label.style.left = `${rect.left + scrollX}px`;
  label.style.top = `${rect.top + scrollY - 20}px`;
  label.style.backgroundColor = color;
  label.style.color = 'white';
  label.style.padding = '2px 5px';
  label.style.fontSize = '10px';
  label.style.borderRadius = '3px';
  label.style.zIndex = '9999';
  label.style.pointerEvents = 'none';
  label.innerText = groupName;
  
  // Add a tooltip with the selector
  highlight.title = selector;
  
  // Add to document
  document.body.appendChild(highlight);
  document.body.appendChild(label);
}
