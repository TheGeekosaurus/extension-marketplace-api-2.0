// src/content/utils/searchSelectorTester.ts - Selector testing utility for search results pages

import { MarketplaceType } from '../../types';
import { findAmazonSearchResultElements } from '../matchFinder/amazonSearch';
import { findWalmartSearchResultElements } from '../matchFinder/walmartSearch';
import { SelectorTestResult, SelectorTestGroup } from './selectorTester';

/**
 * Search page specific selector groups
 */
export const amazonSearchSelectors = {
  resultContainer: [
    '.s-result-item[data-asin]:not(.AdHolder)',
    '.sg-row[data-asin]',
    '.s-result-list .a-section[data-asin]'
  ],
  title: [
    'h2', 
    'h2 a', 
    '.a-text-normal',
    '.a-size-medium.a-color-base.a-text-normal'
  ],
  price: [
    '.a-price .a-offscreen',
    '.a-color-price',
    '.a-color-base'
  ],
  image: [
    'img.s-image',
    '.s-image',
    'img[data-image-index]'
  ],
  link: [
    'a.a-link-normal[href*="/dp/"]',
    'a[href*="/dp/"]',
    '.a-link-normal'
  ],
  rating: [
    '.a-icon-star-small', 
    '.a-icon-star',
    '.a-icon-alt'
  ],
  reviewCount: [
    '.a-size-small.a-link-normal',
    'a[href*="customerReviews"]'
  ]
};

export const walmartSearchSelectors = {
  resultContainer: [
    '[data-item-id]',
    '[data-product-id]',
    '.search-result-gridview-item',
    '.product.product-search-result.search-result-gridview-item', 
    '.sans-serif.relative.pb3.pt2.ph3.w-100'
  ],
  title: [
    '[data-automation-id="product-title"]', 
    '.sans-serif.mid-gray', 
    '.w_iUH', 
    '.lh-title',
    '.w_DP'
  ],
  price: [
    '[data-automation-id="product-price"]', 
    '.b.black.f1.mr1', 
    '.w_iUH',
    '[data-testid="price-current"]',
    '.w_C6.w_D.w_C7.w_Da', // Dollars element
    '.w_C6.w_D.w_C7.w_Db'  // Cents element
  ],
  image: [
    'img[data-automation-id="product-image"]', 
    'img.absolute', 
    'img.w_iUF',
    'img.db.center.mw100.h-auto'
  ],
  link: [
    'a[link-identifier="linkTest"]', 
    'a.absolute.w-100.h-100', 
    '.sans-serif.w_iUH a'
  ],
  rating: [
    '.stars-container', 
    '[data-automation-id="product-stars"]'
  ],
  reviewCount: [
    '.stars-reviews-count', 
    '[data-automation-id="product-reviews"]'
  ]
};

/**
 * Get the appropriate search selectors for a marketplace
 * 
 * @param marketplace - Marketplace to get selectors for
 * @returns Search selectors for the marketplace or null if not supported
 */
function getSearchSelectors(marketplace: MarketplaceType): Record<string, string[]> | null {
  switch (marketplace) {
    case 'amazon':
      return amazonSearchSelectors;
    case 'walmart':
      return walmartSearchSelectors;
    default:
      return null;
  }
}

/**
 * Test search page selectors for a marketplace
 * 
 * @param marketplace - Marketplace to test selectors for
 * @returns Test results for search selectors
 */
export function testSearchSelectors(marketplace: MarketplaceType): Record<string, SelectorTestGroup> {
  console.log(`[Search Selector Tester] Testing search selectors for ${marketplace}`);
  
  // Get the selectors for this marketplace
  const selectors = getSearchSelectors(marketplace);
  
  if (!selectors) {
    console.error(`[Search Selector Tester] No search selectors defined for ${marketplace}`);
    return {};
  }
  
  // Test each group of selectors
  const results: Record<string, SelectorTestGroup> = {};
  
  for (const [groupName, selectorList] of Object.entries(selectors)) {
    const groupResults: SelectorTestResult[] = [];
    let foundCount = 0;
    
    for (const selector of selectorList) {
      try {
        // Test the selector
        const elements = document.querySelectorAll(selector);
        const found = elements.length > 0;
        
        let foundText: string | undefined;
        if (found && elements[0].textContent) {
          foundText = elements[0].textContent.trim().substring(0, 100);
          if (foundText.length === 100) {
            foundText += '...';
          }
        }
        
        // Add result
        groupResults.push({
          selector,
          found,
          count: elements.length,
          foundText
        });
        
        if (found) {
          foundCount++;
        }
      } catch (error) {
        groupResults.push({
          selector,
          found: false,
          count: 0,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    results[groupName] = {
      groupName,
      results: groupResults,
      foundCount,
      totalCount: selectorList.length
    };
  }
  
  // Log a summary
  const totalGroups = Object.keys(results).length;
  const successfulGroups = Object.values(results).filter(group => group.foundCount > 0).length;
  
  console.log(`[Search Selector Tester] Results for ${marketplace}: ${successfulGroups}/${totalGroups} groups found at least one match`);
  
  return results;
}

/**
 * Test actual search result extraction by using the find*SearchResultElements functions
 * 
 * @param marketplace - Marketplace to test
 * @returns Test results for search result extraction
 */
export function testSearchResultExtraction(marketplace: MarketplaceType): {
  success: boolean;
  elements: number;
  error?: string;
} {
  try {
    let elements: Element[] = [];
    
    // Use the appropriate element finder function
    switch (marketplace) {
      case 'amazon':
        elements = findAmazonSearchResultElements();
        break;
      case 'walmart':
        elements = findWalmartSearchResultElements();
        break;
      default:
        return {
          success: false,
          elements: 0,
          error: `Unsupported marketplace: ${marketplace}`
        };
    }
    
    return {
      success: elements.length > 0,
      elements: elements.length
    };
  } catch (error) {
    return {
      success: false,
      elements: 0,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Run a comprehensive search page selector test
 * Tests both individual selectors and the full extraction process
 * 
 * @param marketplace - Marketplace to test
 * @returns Combined test results
 */
export function runSearchSelectorDebugger(marketplace: MarketplaceType): {
  selectorResults: Record<string, SelectorTestGroup>;
  extractionResult: {
    success: boolean;
    elements: number;
    error?: string;
  };
} {
  console.log(`[Search Selector Debugger] Running debugger for ${marketplace}`);
  
  // Test individual selectors
  const selectorResults = testSearchSelectors(marketplace);
  
  // Test overall extraction
  const extractionResult = testSearchResultExtraction(marketplace);
  
  // Log comprehensive results
  console.group(`[Search Selector Debugger] Results for ${marketplace}`);
  
  // Log selector results
  console.group('Selector Tests:');
  for (const [groupName, group] of Object.entries(selectorResults)) {
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
  
  // Log extraction results
  console.group('Overall Extraction Test:');
  if (extractionResult.success) {
    console.log(`✅ Successfully found ${extractionResult.elements} search result elements`);
  } else {
    console.error(`❌ Failed to extract search results: ${extractionResult.error || 'No elements found'}`);
  }
  console.groupEnd();
  
  console.groupEnd();
  
  return {
    selectorResults,
    extractionResult
  };
}

/**
 * Highlight search result elements on the page
 * 
 * @param marketplace - Marketplace to highlight elements for
 */
export function highlightSearchResultElements(marketplace: MarketplaceType): void {
  console.log(`[Search Selector Highlighter] Highlighting search result elements for ${marketplace}`);
  
  try {
    let elements: Element[] = [];
    
    // Use the appropriate element finder function
    switch (marketplace) {
      case 'amazon':
        elements = findAmazonSearchResultElements();
        break;
      case 'walmart':
        elements = findWalmartSearchResultElements();
        break;
      default:
        console.error(`[Search Selector Highlighter] Unsupported marketplace: ${marketplace}`);
        return;
    }
    
    // Remove any existing highlights
    const existingHighlights = document.querySelectorAll('.selector-highlight');
    existingHighlights.forEach(el => el.remove());
    
    // Highlight result containers
    const highlightedElements = new Set<Element>();
    
    elements.forEach((element, index) => {
      // Generate color based on index (cycling through colors)
      const hue = (index * 30) % 360; // Spread colors around the color wheel
      const color = `hsl(${hue}, 80%, 60%)`;
      
      // Highlight the container
      highlightSearchElement(element, color, 'Search Result', `Result #${index + 1}`);
      highlightedElements.add(element);
      
      // Optionally highlight child elements
      const selectors = getSearchSelectors(marketplace);
      if (selectors) {
        // Get selectors without the container selectors
        const { resultContainer, ...childSelectors } = selectors;
        
        // Highlight important child elements
        Object.entries(childSelectors).forEach(([type, selectorList]) => {
          for (const selector of selectorList) {
            try {
              const childElements = element.querySelectorAll(selector);
              for (const childEl of Array.from(childElements)) {
                if (!highlightedElements.has(childEl)) {
                  const childHue = (['title', 'price'].includes(type)) ? (hue + 180) % 360 : (hue + 120) % 360;
                  const childColor = `hsl(${childHue}, 80%, 50%)`;
                  highlightSearchElement(childEl, childColor, type, selector);
                  highlightedElements.add(childEl);
                  // Only highlight the first match of each type per container
                  break;
                }
              }
            } catch (error) {
              console.error(`[Search Selector Highlighter] Error with selector ${selector}:`, error);
            }
          }
        });
      }
    });
    
    console.log(`[Search Selector Highlighter] Highlighted ${highlightedElements.size} elements`);
    
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
      <div style="font-weight: bold; margin-bottom: 5px;">Search Result Highlighter</div>
      <div>Found and highlighted ${elements.length} search results with ${highlightedElements.size - elements.length} child elements.</div>
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
  } catch (error) {
    console.error('[Search Selector Highlighter] Error:', error);
  }
}

/**
 * Helper function to highlight a search result element
 * 
 * @param element - Element to highlight
 * @param color - Color to use
 * @param type - Type of element
 * @param selector - Selector used to find element
 */
function highlightSearchElement(element: Element, color: string, type: string, selector: string): void {
  // Calculate position and size
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
  label.innerText = type;
  
  // Add a tooltip with the selector
  highlight.title = selector;
  
  // Add to document
  document.body.appendChild(highlight);
  document.body.appendChild(label);
}
