// src/content/matchFinder/core/matchFinder.ts
// Main MatchFinder class to coordinate the product matching process

import { ProductData } from '../../../types';
import { 
  MarketplaceMatcher, 
  ProductMatchResult, 
  MatchFinderConfig,
  MatchFinderResult
} from './types';
import { AmazonMatcher } from './amazonMatcher';
import { WalmartMatcher } from './walmartMatcher';
import { calculateProductSimilarity } from '../utils/similarity';
import { highlightElements } from '../utils/dom';
import { createLogger, LogLevel } from '../utils/logger';

// Default configuration
const DEFAULT_CONFIG: MatchFinderConfig = {
  minSimilarityScore: 0.6,
  maxResults: 10,
  debug: false,
  highlightResults: false,
  logLevel: 'info',
  searchTimeout: 30000,
  extractionTimeout: 10000
};

/**
 * Main MatchFinder class for finding product matches on marketplace search pages
 */
export class MatchFinder {
  private sourceProduct: ProductData | null = null;
  private config: MatchFinderConfig;
  private matchers: Map<string, MarketplaceMatcher> = new Map();
  private activeMatcher: MarketplaceMatcher | null = null;
  private logger = createLogger('MatchFinder');
  private startTime: number = 0;
  private timing: Record<string, number> = {};
  
  /**
   * Create a new MatchFinder instance
   * 
   * @param config - Optional configuration for the matcher
   */
  constructor(config: Partial<MatchFinderConfig> = {}) {
    // Merge default config with provided config
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Configure logger
    const logLevelMap: Record<string, LogLevel> = {
      'debug': LogLevel.DEBUG,
      'info': LogLevel.INFO,
      'warn': LogLevel.WARN,
      'error': LogLevel.ERROR
    };
    
    this.logger.setLevel(logLevelMap[this.config.logLevel] || LogLevel.INFO);
    
    // Register standard matchers
    this.registerMatcher(AmazonMatcher);
    this.registerMatcher(WalmartMatcher);
    
    this.logger.info('MatchFinder initialized');
  }
  
  /**
   * Register a marketplace matcher
   * 
   * @param matcher - Marketplace matcher implementation
   */
  public registerMatcher(matcher: MarketplaceMatcher): void {
    this.matchers.set(matcher.marketplace, matcher);
    this.logger.info(`Registered matcher for ${matcher.marketplace}`);
  }
  
  /**
   * Set the source product to search for matches
   * 
   * @param product - Product data to search for
   */
  public setSourceProduct(product: ProductData): void {
    this.sourceProduct = product;
    this.logger.info('Source product set:', product.title);
  }
  
  /**
   * Determine which marketplace matcher to use based on the current URL
   * 
   * @returns The appropriate marketplace matcher or null if not found
   */
  private determineCurrentMarketplace(): MarketplaceMatcher | null {
    const url = window.location.href;
    
    if (url.includes('amazon.com')) {
      return this.matchers.get('amazon') || null;
    } else if (url.includes('walmart.com')) {
      return this.matchers.get('walmart') || null;
    }
    
    return null;
  }
  
  /**
   * Execute the matching process
   * 
   * @returns Promise resolving to the match result
   */
  public async findMatches(): Promise<MatchFinderResult> {
    this.startTime = performance.now();
    this.timing = { searchStart: this.startTime };
    
    try {
      // Check if we have a source product
      if (!this.sourceProduct) {
        throw new Error('No source product set. Call setSourceProduct() first.');
      }
      
      // Determine which marketplace we're on
      this.activeMatcher = this.determineCurrentMarketplace();
      
      if (!this.activeMatcher) {
        throw new Error('No matcher available for the current marketplace.');
      }
      
      this.logger.info(`Using ${this.activeMatcher.marketplace} matcher`);
      
      // Find search result elements
      this.logger.info('Finding search result elements...');
      const resultElements = this.activeMatcher.findSearchResultElements();
      
      if (resultElements.length === 0) {
        throw new Error('No search results found on page.');
      }
      
      this.logger.info(`Found ${resultElements.length} search results`);
      this.timing.elementsFound = performance.now();
      
      // Extract product data from each result
      this.logger.info('Extracting product data from search results...');
      const searchResults: Partial<ProductMatchResult>[] = [];
      
      for (const element of resultElements) {
        const result = this.activeMatcher.extractSearchResult(element);
        if (result) {
          searchResults.push(result);
        }
      }
      
      this.logger.info(`Successfully extracted data from ${searchResults.length} search results`);
      this.timing.extractionComplete = performance.now();
      
      if (searchResults.length === 0) {
        throw new Error('Could not extract any valid product data from search results.');
      }
      
      // Calculate similarity scores
      this.logger.info('Calculating similarity scores...');
      const sourceTitle = this.sourceProduct.title;
      const matches: ProductMatchResult[] = [];
      
      for (const result of searchResults) {
        if (!result.title || !result.price) continue;
        
        // Calculate single-attribute similarity
        const titleSimilarity = this.activeMatcher.calculateSimilarity(
          sourceTitle, 
          result.title
        );
        
        // Calculate multi-attribute similarity if available
        const productSimilarity = calculateProductSimilarity(
          { 
            title: sourceTitle,
            brand: this.sourceProduct.brand,
            price: this.sourceProduct.price
          },
          {
            title: result.title,
            brand: result.brand,
            price: result.price
          }
        );
        
        // Use the higher of the two similarity scores
        const similarityScore = Math.max(titleSimilarity, productSimilarity);
        
        // Include the source product ID for reference
        const match: ProductMatchResult = {
          ...result as any,
          similarityScore,
          sourceProductId: this.sourceProduct.productId,
          searchUrl: window.location.href
        };
        
        matches.push(match);
      }
      
      this.timing.matchingComplete = performance.now();
      
      // Sort matches by similarity score (highest first)
      matches.sort((a, b) => b.similarityScore - a.similarityScore);
      
      // Limit to the maximum results
      const topMatches = matches.slice(0, this.config.maxResults);
      
      // Highlight the top matches if configured
      if (this.config.highlightResults && topMatches.length > 0) {
        // Find the elements to highlight
        const elementsToHighlight: Element[] = [];
        
        for (const match of topMatches) {
          // Find the element with this product data
          const matchElements = resultElements.filter(element => {
            const extractedData = this.activeMatcher!.extractSearchResult(element);
            return extractedData && 
                   extractedData.title === match.title && 
                   extractedData.price === match.price;
          });
          
          if (matchElements.length > 0) {
            elementsToHighlight.push(matchElements[0]);
          }
        }
        
        // Highlight the elements
        highlightElements(elementsToHighlight);
      }
      
      this.logger.info(`Matching complete. Found ${topMatches.length} potential matches`);
      
      // Check if we have a good enough match
      const bestMatch = topMatches.length > 0 ? topMatches[0] : undefined;
      const hasGoodMatch = bestMatch && bestMatch.similarityScore >= this.config.minSimilarityScore;
      
      // Calculate timing
      const endTime = performance.now();
      this.timing.total = endTime - this.startTime;
      
      // Return the result
      return {
        success: hasGoodMatch || false, // Ensure boolean value
        match: hasGoodMatch ? bestMatch : undefined,
        allMatches: topMatches,
        searchUrl: window.location.href,
        sourceProduct: this.sourceProduct || undefined, // Ensure null isn't returned
        timing: {
          searchStart: this.startTime,
          elementsFound: this.timing.elementsFound - this.startTime,
          extractionComplete: this.timing.extractionComplete - this.startTime,
          matchingComplete: this.timing.matchingComplete - this.startTime,
          total: this.timing.total
        }
      };
    } catch (error) {
      this.logger.error('Error finding matches:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        searchUrl: window.location.href,
        sourceProduct: this.sourceProduct || undefined // Ensure null isn't returned
      };
    }
  }
  
  /**
   * Scan the page and return all potential product matches
   * Useful for debugging
   */
  public async scanPage(): Promise<ProductMatchResult[]> {
    try {
      // Determine which marketplace we're on
      this.activeMatcher = this.determineCurrentMarketplace();
      
      if (!this.activeMatcher) {
        throw new Error('No matcher available for the current marketplace.');
      }
      
      // Find all search result elements
      const resultElements = this.activeMatcher.findSearchResultElements();
      
      if (resultElements.length === 0) {
        return [];
      }
      
      // Extract product data from each result
      const products: ProductMatchResult[] = [];
      
      for (const element of resultElements) {
        const result = this.activeMatcher.extractSearchResult(element);
        if (result && result.title && result.price !== undefined) {
          products.push({
            ...result as any,
            similarityScore: 0,
            marketplace: this.activeMatcher.marketplace
          });
        }
      }
      
      return products;
    } catch (error) {
      this.logger.error('Error scanning page:', error);
      return [];
    }
  }
}