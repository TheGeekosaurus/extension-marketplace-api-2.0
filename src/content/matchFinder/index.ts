// src/content/matchFinder/index.ts
// Main export file for the matchFinder module

// Core exports
export { MatchFinder } from './core/matchFinder';
export { AmazonMatcher } from './core/amazonMatcher';
export { WalmartMatcher } from './core/walmartMatcher';
export type { 
  ProductMatchResult, 
  MatchFinderConfig, 
  MarketplaceMatcher,
  MatchFinderResult
} from './core/types';

// Utility exports
export { 
  calculateTitleSimilarity, 
  calculateProductSimilarity,
  calculateAmazonTitleSimilarity,
  calculateWalmartTitleSimilarity
} from './utils/similarity';

export {
  createLogger,
  LogLevel
} from './utils/logger';

export {
  trySelectors,
  extractText,
  extractPrice,
  extractAttribute,
  highlightElements
} from './utils/dom';

// Debugger exports
export { debugPanel } from './debugger/debugPanel';
export { initializeTestMode } from './debugger/testMode';