// src/content/matchFinder/debugger/testMode.ts
// Test mode for trying out the matchFinder on any page

import { MatchFinder } from '../core/matchFinder';
import { debugPanel } from './debugPanel';
import { MarketplaceMatcher } from '../core/types';
import { createLogger, LogLevel } from '../utils/logger';
import { highlightElements } from '../utils/dom';

// Initialize logger
const logger = createLogger('TestMode');
logger.setLevel(LogLevel.DEBUG);

/**
 * Initialize test mode for the matchFinder
 * 
 * @param options - Test mode options
 */
export function initializeTestMode(options: {
  sourceProduct?: any;
  debug?: boolean;
  highlightResults?: boolean;
} = {}): void {
  logger.info('Initializing match finder test mode');
  
  // Configure the debug panel
  debugPanel.initialize();
  debugPanel.addLog('Match finder test mode initialized', 'info');
  
  if (options.sourceProduct) {
    debugPanel.setSourceProduct(options.sourceProduct);
    debugPanel.addLog(`Source product set: ${options.sourceProduct.title}`, 'info');
  }
  
  // Initialize the match finder
  const matchFinder = new MatchFinder({
    debug: options.debug !== false,
    highlightResults: options.highlightResults !== false,
    logLevel: 'debug',
    minSimilarityScore: 0.5 // Lower threshold for testing
  });
  
  // If we have a source product, set it
  if (options.sourceProduct) {
    matchFinder.setSourceProduct(options.sourceProduct);
    
    // Find matches
    matchFinder.findMatches()
      .then(result => {
        debugPanel.addLog(`Matching completed: found ${result.allMatches?.length || 0} matches`, 'info');
        
        if (result.success && result.match) {
          debugPanel.addLog(`Best match: "${result.match.title}" with ${Math.round(result.match.similarityScore * 100)}% similarity`, 'info');
        } else if (result.error) {
          debugPanel.addLog(`Error: ${result.error}`, 'error');
        } else {
          debugPanel.addLog('No good matches found', 'warn');
        }
        
        // Display all matches
        if (result.allMatches && result.allMatches.length > 0) {
          debugPanel.setMatches(result.allMatches);
        }
        
        // Show timing info
        if (result.timing) {
          debugPanel.addLog(`Timing: ${Math.round(result.timing.total)}ms total`, 'debug');
          debugPanel.addLog(`- Finding elements: ${Math.round(result.timing.elementsFound)}ms`, 'debug');
          debugPanel.addLog(`- Extraction: ${Math.round(result.timing.extractionComplete - result.timing.elementsFound)}ms`, 'debug');
          debugPanel.addLog(`- Matching: ${Math.round(result.timing.matchingComplete - result.timing.extractionComplete)}ms`, 'debug');
        }
      })
      .catch(error => {
        debugPanel.addLog(`Error running match finder: ${error}`, 'error');
      });
  } else {
    // Just scan the page without a source product
    matchFinder.scanPage()
      .then(products => {
        debugPanel.addLog(`Scanned page: found ${products.length} products`, 'info');
        
        if (products.length > 0) {
          // Show the products
          debugPanel.setMatches(products);
        } else {
          debugPanel.addLog('No products found on page', 'warn');
        }
      })
      .catch(error => {
        debugPanel.addLog(`Error scanning page: ${error}`, 'error');
      });
  }
  
  // Listen for highlight events
  document.addEventListener('em-debug-highlight-match', (e: any) => {
    const matchIndex = e.detail.matchIndex;
    
    // Run a scan again to get elements
    matchFinder.scanPage()
      .then(products => {
        if (matchIndex >= 0 && matchIndex < products.length) {
          // Find the element for this product
          const matchFinder = new MatchFinder();
          const activeMatcher = determineCurrentMarketplace();
          
          if (activeMatcher) {
            const elements = activeMatcher.findSearchResultElements();
            
            if (elements.length > 0) {
              // Find the element that matches this product
              for (const element of elements) {
                const product = activeMatcher.extractSearchResult(element);
                if (product && 
                    product.title === products[matchIndex].title && 
                    product.price === products[matchIndex].price) {
                  // Highlight this element
                  highlightElements([element], {
                    color: 'rgba(52, 152, 219, 0.6)',
                    outlineWidth: '3px',
                    duration: 3000
                  });
                  break;
                }
              }
            }
          }
        }
      });
  });
}

/**
 * Determine which marketplace matcher to use based on the current URL
 */
function determineCurrentMarketplace(): MarketplaceMatcher | null {
  const url = window.location.href;
  
  // Import matchers dynamically to avoid circular dependencies
  const { AmazonMatcher } = require('../core/amazonMatcher');
  const { WalmartMatcher } = require('../core/walmartMatcher');
  
  if (url.includes('amazon.com')) {
    return AmazonMatcher;
  } else if (url.includes('walmart.com')) {
    return WalmartMatcher;
  }
  
  return null;
}