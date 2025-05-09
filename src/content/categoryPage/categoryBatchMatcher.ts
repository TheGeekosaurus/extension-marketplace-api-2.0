// src/content/categoryPage/categoryBatchMatcher.ts
// Implements browser-based batch matching for category products

import { ProductData, ProductComparison, MarketplaceType } from '../../types';
import { createLogger } from '../matchFinder/utils/logger';
import { MatchFinder } from '../matchFinder/core/matchFinder';
import { sleep } from '../matchFinder/utils/dom';
import { calculateProductSimilarity } from '../matchFinder/utils/similarity';

// Set up logger
const logger = createLogger('CategoryBatchMatcher');

/**
 * Browser-based batch matching for category products
 * Uses the MatchFinder to search for products directly in the browser
 */
export class CategoryBatchMatcher {
  private products: ProductData[] = [];
  private currentIndex = 0;
  private results: ProductComparison[] = [];
  private targetMarketplace: MarketplaceType;
  private isProcessing = false;
  private searchBaseUrl: string;
  private matchFinder: MatchFinder;
  private batchSize: number = 5;
  private progressCallback: ((progress: number) => void) | null = null;
  
  /**
   * Create a new CategoryBatchMatcher
   * 
   * @param targetMarketplace - Marketplace to search products on
   * @param batchSize - Number of products to process in each batch (default: 5)
   */
  constructor(targetMarketplace: MarketplaceType = 'walmart', batchSize: number = 5) {
    this.targetMarketplace = targetMarketplace;
    this.batchSize = batchSize;
    
    // Set up the search base URL based on target marketplace
    if (targetMarketplace === 'walmart') {
      this.searchBaseUrl = 'https://www.walmart.com/search?q=';
    } else if (targetMarketplace === 'amazon') {
      this.searchBaseUrl = 'https://www.amazon.com/s?k=';
    } else {
      throw new Error(`Unsupported target marketplace: ${targetMarketplace}`);
    }
    
    // Initialize the MatchFinder with appropriate configuration
    this.matchFinder = new MatchFinder({
      minSimilarityScore: 0.6,
      maxResults: 3,
      debug: false,
      logLevel: 'info',
      searchTimeout: 20000,
      extractionTimeout: 10000
    });
    
    logger.info(`CategoryBatchMatcher initialized for ${targetMarketplace}`);
  }
  
  /**
   * Set the products to process
   * 
   * @param products - Array of products to process
   */
  public setProducts(products: ProductData[]): void {
    this.products = [...products];
    this.currentIndex = 0;
    this.results = [];
    logger.info(`Set ${products.length} products to process`);
  }
  
  /**
   * Set a callback to monitor progress
   * 
   * @param callback - Function to call with progress (0-100)
   */
  public setProgressCallback(callback: (progress: number) => void): void {
    this.progressCallback = callback;
    logger.info('Progress callback set');
  }
  
  /**
   * Start processing products
   * 
   * @returns Promise that resolves with the comparison results
   */
  public async startProcessing(): Promise<ProductComparison[]> {
    if (this.isProcessing) {
      throw new Error('Already processing products');
    }
    
    if (this.products.length === 0) {
      throw new Error('No products to process');
    }
    
    logger.info(`Starting to process ${this.products.length} products`);
    this.isProcessing = true;
    
    try {
      // Process products in batches
      while (this.currentIndex < this.products.length) {
        const endIndex = Math.min(this.currentIndex + this.batchSize, this.products.length);
        const currentBatch = this.products.slice(this.currentIndex, endIndex);
        
        logger.info(`Processing batch ${this.currentIndex + 1}-${endIndex} of ${this.products.length}`);
        
        // Process each product in the batch
        for (const product of currentBatch) {
          try {
            // Search for this product
            const searchUrl = this.constructSearchUrl(product);
            logger.info(`Searching for "${product.title}" at ${searchUrl}`);
            
            // Construct and store the result even if we get no matches
            const matchedProducts: Record<string, any[]> = {};
            matchedProducts[this.targetMarketplace] = [];
            
            const result: ProductComparison = {
              sourceProduct: product,
              matchedProducts: matchedProducts as any,
              timestamp: Date.now()
            };
            
            // Add to results first so we capture something even if search fails
            this.results.push(result);
            
            // Open the search URL in a hidden iframe and wait for it to load
            const iframe = await this.createAndLoadIframe(searchUrl);
            
            if (!iframe) {
              logger.warn(`Failed to create iframe for ${product.title}`);
              continue;
            }
            
            // Search for matches in the iframe
            try {
              const matches = await this.searchInIframe(iframe, product);
              
              // Update the result with any matches found
              if (matches && matches.length > 0) {
                logger.info(`Found ${matches.length} matches for ${product.title}`);
                
                // Get the current result which should be the last one we pushed
                const currentResult = this.results[this.results.length - 1];
                // Use type assertion to fix TypeScript error
                (currentResult.matchedProducts as any)[this.targetMarketplace] = matches;
              } else {
                logger.info(`No matches found for ${product.title}`);
              }
            } catch (searchError) {
              logger.error(`Error searching for ${product.title}:`, searchError);
            } finally {
              // Always remove the iframe when done
              document.body.removeChild(iframe);
            }
            
            // Update progress
            this.updateProgress();
            
            // Small delay between products to avoid overloading the browser
            await sleep(500);
          } catch (productError) {
            logger.error(`Error processing product ${product.title}:`, productError);
            // Continue with next product
          }
        }
        
        // Move to the next batch
        this.currentIndex = endIndex;
        
        // Larger delay between batches
        await sleep(1000);
      }
      
      logger.info(`Processed all ${this.products.length} products`);
      
      // Save the results to storage
      this.saveResultsToStorage();
      
      // Reset the processing state
      this.isProcessing = false;
      
      return this.results;
    } catch (error) {
      this.isProcessing = false;
      logger.error('Error in batch processing:', error);
      throw error;
    }
  }
  
  /**
   * Create a search URL for the product
   * 
   * @param product - Product to search for
   * @returns Full search URL
   */
  private constructSearchUrl(product: ProductData): string {
    // Construct the search query
    const title = product.title.trim();
    const brand = product.brand ? ` ${product.brand.trim()}` : '';
    const searchQuery = encodeURIComponent(`${title}${brand}`);
    
    return `${this.searchBaseUrl}${searchQuery}`;
  }
  
  /**
   * Create and load an iframe for the search page
   * 
   * @param url - URL to load in the iframe
   * @returns Promise that resolves with the loaded iframe
   */
  private async createAndLoadIframe(url: string): Promise<HTMLIFrameElement> {
    return new Promise((resolve, reject) => {
      // Create the iframe (completely hidden)
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.top = '-9999px';
      iframe.style.left = '-9999px';
      iframe.style.width = '1024px';
      iframe.style.height = '768px';
      iframe.style.border = 'none';
      iframe.style.opacity = '0';
      iframe.style.pointerEvents = 'none';
      iframe.style.visibility = 'hidden';
      // Add sandbox attribute with only necessary permissions to prevent popups
      iframe.sandbox.add('allow-same-origin', 'allow-scripts');
      
      // Set up load event handler
      iframe.onload = () => {
        resolve(iframe);
      };
      
      // Set up error handler
      iframe.onerror = (error) => {
        reject(error);
      };
      
      // Set timeout to avoid hanging
      const timeout = setTimeout(() => {
        reject(new Error('Iframe loading timed out'));
      }, 20000);
      
      // Set the source and add to document
      iframe.src = url;
      document.body.appendChild(iframe);
      
      // Clean up timeout on success
      iframe.onload = () => {
        clearTimeout(timeout);
        resolve(iframe);
      };
    });
  }
  
  /**
   * Search for matches in the iframe
   * 
   * @param iframe - Loaded iframe element
   * @param product - Product to search for
   * @returns Array of matching products
   */
  private async searchInIframe(iframe: HTMLIFrameElement, product: ProductData): Promise<any[]> {
    // Get the iframe's content window
    const iframeWindow = iframe.contentWindow;
    if (!iframeWindow) {
      throw new Error('No iframe content window');
    }
    
    try {
      // Wait for the page content to fully load
      await sleep(3000);
      
      // Get the iframe document
      const iframeDoc = iframeWindow.document;
      
      // Check if we're on a search results page
      const isSearchPage = iframeWindow.location.href.includes('/search') || 
                           iframeWindow.location.href.includes('/s?');
      
      if (!isSearchPage) {
        logger.warn('Not on a search results page');
        return [];
      }
      
      // Find search result elements based on marketplace
      const selector = this.targetMarketplace === 'walmart' 
        ? 'div[data-item-id]'
        : 'div[data-asin]';
      
      const searchResultElements = Array.from(iframeDoc.querySelectorAll(selector));
      
      if (searchResultElements.length === 0) {
        logger.warn('No search result elements found');
        return [];
      }
      
      logger.info(`Found ${searchResultElements.length} search result elements`);
      
      // Extract data from search results
      const searchResults = [];
      
      for (const element of searchResultElements) {
        try {
          // Extract based on marketplace
          let result = null;
          
          if (this.targetMarketplace === 'walmart') {
            result = this.extractWalmartSearchResult(element);
          } else if (this.targetMarketplace === 'amazon') {
            result = this.extractAmazonSearchResult(element);
          }
          
          if (result) {
            searchResults.push(result);
          }
        } catch (extractError) {
          logger.error('Error extracting search result:', extractError);
        }
      }
      
      logger.info(`Extracted ${searchResults.length} search results`);
      
      // Calculate similarity and sort
      const matches = searchResults
        .map(result => {
          // Calculate product similarity using the same function as individual matching
          const similarityScore = calculateProductSimilarity(
            { 
              title: product.title,
              brand: product.brand || null,
              price: product.price || null
            },
            { 
              title: result.title,
              brand: result.brand || null,
              price: result.price || null
            }
          );
          return { ...result, similarityScore };
        })
        .filter(result => result.similarityScore >= 0.6) // Only keep good matches
        .sort((a, b) => b.similarityScore - a.similarityScore) // Sort by similarity
        .slice(0, 3); // Get top 3 matches
      
      return matches;
    } catch (error) {
      logger.error('Error searching in iframe:', error);
      return [];
    }
  }
  
  /**
   * Extract product data from a Walmart search result
   * 
   * @param element - Search result element
   * @returns Product data or null if extraction failed
   */
  private extractWalmartSearchResult(element: Element): any {
    try {
      // Extract product ID
      const productId = element.getAttribute('data-item-id');
      if (!productId) return null;
      
      // Extract title
      const titleElement = element.querySelector('[data-automation-id="product-title"]') ||
                          element.querySelector('.product-title-link');
      const title = titleElement ? titleElement.textContent?.trim() : null;
      if (!title) return null;
      
      // Extract price
      const priceElement = element.querySelector('[data-automation-id="product-price"]') ||
                          element.querySelector('.product-price-update');
      let price = null;
      
      if (priceElement) {
        const priceText = priceElement.textContent?.trim();
        if (priceText) {
          const priceMatch = priceText.match(/\$([0-9]+(?:\.[0-9]+)?)/);
          if (priceMatch && priceMatch[1]) {
            price = parseFloat(priceMatch[1]);
          }
        }
      }
      
      if (price === null) return null;
      
      // Extract URL
      const linkElement = element.querySelector('a[href*="/ip/"]');
      const url = linkElement ? linkElement.getAttribute('href') : null;
      const fullUrl = url ? (url.startsWith('http') ? url : `https://www.walmart.com${url}`) : null;
      if (!fullUrl) return null;
      
      // Extract image
      const imgElement = element.querySelector('img[data-image-src]') || element.querySelector('img');
      const image = imgElement ? (imgElement.getAttribute('data-image-src') || imgElement.getAttribute('src')) : null;
      
      // Extract brand (if available)
      let brand = null;
      const brandElement = element.querySelector('[data-automation-id="product-brand"]') ||
                          element.querySelector('.product-brand');
      if (brandElement) {
        brand = brandElement.textContent?.trim() || null;
      } else if (title) {
        // Try to extract brand from title (common format is "Brand - Product Name")
        const brandMatch = title.match(/^([^-\|:]+)[\s-]+/);
        if (brandMatch && brandMatch[1]) {
          brand = brandMatch[1].trim();
        }
      }
      
      return {
        title,
        price,
        image,
        url: fullUrl,
        marketplace: 'walmart',
        brand,
        id: productId
      };
    } catch (error) {
      logger.error('Error extracting Walmart search result:', error);
      return null;
    }
  }
  
  /**
   * Extract product data from an Amazon search result
   * 
   * @param element - Search result element
   * @returns Product data or null if extraction failed
   */
  private extractAmazonSearchResult(element: Element): any {
    try {
      // Extract ASIN
      const asin = element.getAttribute('data-asin');
      if (!asin) return null;
      
      // Extract title
      const titleElement = element.querySelector('h2') || 
                          element.querySelector('.a-text-normal');
      const title = titleElement ? titleElement.textContent?.trim() : null;
      if (!title) return null;
      
      // Extract price
      const priceElement = element.querySelector('.a-price .a-offscreen') ||
                           element.querySelector('.a-color-price');
      let price = null;
      
      if (priceElement) {
        const priceText = priceElement.textContent?.trim();
        if (priceText) {
          const priceMatch = priceText.match(/\$([0-9]+(?:\.[0-9]+)?)/);
          if (priceMatch && priceMatch[1]) {
            price = parseFloat(priceMatch[1]);
          }
        }
      }
      
      if (price === null) return null;
      
      // Extract URL
      const linkElement = element.querySelector('a[href*="/dp/"]');
      const url = linkElement ? linkElement.getAttribute('href') : null;
      const fullUrl = url ? (url.startsWith('http') ? url : `https://www.amazon.com${url}`) : null;
      if (!fullUrl) return null;
      
      // Extract image
      const imgElement = element.querySelector('img.s-image') || element.querySelector('img');
      const image = imgElement ? imgElement.getAttribute('src') : null;
      
      // Extract brand (if available)
      let brand = null;
      const brandElement = element.querySelector('.a-row .a-size-base.a-color-secondary') ||
                          element.querySelector('.a-row .a-size-base:nth-child(2)');
      if (brandElement) {
        const text = brandElement.textContent?.trim();
        if (text && !text.includes('$') && !text.includes('stars')) {
          brand = text;
        }
      } else if (title) {
        // Try to extract brand from title (common format is "Brand Product Name")
        const brandMatch = title.match(/^([A-Za-z0-9]+(?:\s+[A-Za-z0-9]+)?)\s+/);
        if (brandMatch && brandMatch[1] && brandMatch[1].length < 20) {
          brand = brandMatch[1].trim();
        }
      }
      
      return {
        title,
        price,
        image,
        url: fullUrl,
        marketplace: 'amazon',
        brand,
        id: asin
      };
    } catch (error) {
      logger.error('Error extracting Amazon search result:', error);
      return null;
    }
  }
  
  // We're now using the shared calculateProductSimilarity function 
  // to maintain consistency with individual product matching
  
  /**
   * Update the processing progress
   */
  private updateProgress(): void {
    if (this.progressCallback && this.products.length > 0) {
      const progress = Math.min(100, Math.round((this.currentIndex / this.products.length) * 100));
      this.progressCallback(progress);
    }
  }
  
  /**
   * Save results to storage
   */
  private saveResultsToStorage(): void {
    chrome.storage.local.set({ categoryComparisons: this.results }, () => {
      logger.info(`Saved ${this.results.length} batch results to storage`);
    });
  }
}