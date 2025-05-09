// src/content/categoryPage/categoryBatchProcessor.ts
// Batch processor for category page products

import { ProductData, ProductComparison } from '../../types';
import { CategoryPageScraper, BatchProcessingOptions, CategoryPageResult } from './types';
import { AmazonCategoryScraper } from './amazonCategoryScraper';
import { WalmartCategoryScraper } from './walmartCategoryScraper';
import { createLogger } from '../matchFinder/utils/logger';
import { CategoryBatchMatcher } from './categoryBatchMatcher';

// Set up logger
const logger = createLogger('CategoryBatchProcessor');

// Default batch processing options
const DEFAULT_OPTIONS: BatchProcessingOptions = {
  batchSize: 5,
  maxProducts: 20,
  includeSponsored: false,
  priorityOrder: 'price_desc' // Start with highest priced items
};

/**
 * Class to handle batch processing of products from a category page
 */
export class CategoryBatchProcessor {
  private sourceMarketplace: string;
  private targetMarketplace: string;
  private scrapers: Map<string, CategoryPageScraper> = new Map();
  private activeScraper: CategoryPageScraper | null = null;
  private options: BatchProcessingOptions;
  private processingQueue: ProductData[] = [];
  private processedResults: ProductComparison[] = [];
  private categoryName: string | null = null;
  private isProcessing: boolean = false;
  
  /**
   * Create a new CategoryBatchProcessor
   * 
   * @param targetMarketplace - Which marketplace to find matches on
   * @param options - Batch processing options
   */
  constructor(targetMarketplace: string, options: Partial<BatchProcessingOptions> = {}) {
    this.targetMarketplace = targetMarketplace;
    this.sourceMarketplace = this.determineCurrentMarketplace();
    this.options = { ...DEFAULT_OPTIONS, ...options };
    
    // Register available scrapers
    this.registerScraper(AmazonCategoryScraper);
    this.registerScraper(WalmartCategoryScraper);
    
    // Try to determine the current category name
    this.categoryName = this.extractCategoryName();
    
    logger.info(`CategoryBatchProcessor initialized for source: ${this.sourceMarketplace}, target: ${this.targetMarketplace}`);
  }
  
  /**
   * Determine which marketplace the current page belongs to
   */
  private determineCurrentMarketplace(): string {
    const url = window.location.href;
    
    if (url.includes('amazon.com')) {
      return 'amazon';
    } else if (url.includes('walmart.com')) {
      return 'walmart';
    } else if (url.includes('target.com')) {
      return 'target';
    } else if (url.includes('homedepot.com')) {
      return 'homedepot';
    }
    
    logger.warn('Could not determine current marketplace');
    return 'unknown';
  }
  
  /**
   * Extract the category name from the current page
   */
  private extractCategoryName(): string | null {
    try {
      // For Amazon
      if (this.sourceMarketplace === 'amazon') {
        // Try breadcrumbs
        const breadcrumbs = document.querySelector('.a-breadcrumb, #wayfinding-breadcrumbs_feature_div');
        if (breadcrumbs) {
          const lastCrumb = breadcrumbs.querySelector('li:last-child');
          if (lastCrumb) {
            return lastCrumb.textContent?.trim() || null;
          }
        }
        
        // Try search query
        const searchBox = document.querySelector('#twotabsearchtextbox') as HTMLInputElement;
        if (searchBox && searchBox.value) {
          return searchBox.value;
        }
        
        // Try page title
        const pageTitle = document.title;
        if (pageTitle) {
          // Clean up the title
          return pageTitle.replace('Amazon.com:', '').replace('Amazon.com :', '').trim();
        }
      }
      
      // For Walmart
      if (this.sourceMarketplace === 'walmart') {
        // Try breadcrumbs
        const breadcrumbs = document.querySelector('[data-automation-id="breadcrumb"], .breadcrumb');
        if (breadcrumbs) {
          const lastCrumb = breadcrumbs.querySelector('span:last-child, li:last-child');
          if (lastCrumb) {
            return lastCrumb.textContent?.trim() || null;
          }
        }
        
        // Try search query
        const searchBox = document.querySelector('#global-search-input') as HTMLInputElement;
        if (searchBox && searchBox.value) {
          return searchBox.value;
        }
        
        // Try page title
        const pageTitle = document.title;
        if (pageTitle) {
          // Clean up the title
          return pageTitle.replace('Walmart.com:', '').replace('- Walmart.com', '').trim();
        }
      }
      
      return null;
    } catch (error) {
      logger.error('Error extracting category name:', error);
      return null;
    }
  }
  
  /**
   * Register a marketplace category scraper
   */
  public registerScraper(scraper: CategoryPageScraper): void {
    this.scrapers.set(scraper.marketplace, scraper);
    logger.info(`Registered category scraper for ${scraper.marketplace}`);
  }
  
  /**
   * Check if the current page can be processed by any of the registered scrapers
   */
  public canProcessCurrentPage(): boolean {
    for (const [marketplace, scraper] of this.scrapers.entries()) {
      if (scraper.canHandlePage()) {
        this.activeScraper = scraper;
        this.sourceMarketplace = marketplace;
        return true;
      }
    }
    
    logger.warn('No suitable scraper found for the current page');
    return false;
  }
  
  /**
   * Process the current category page
   */
  public async processPage(): Promise<CategoryPageResult> {
    if (this.isProcessing) {
      throw new Error('Category page processing already in progress');
    }
    
    if (!this.activeScraper) {
      // Try to find an appropriate scraper
      if (!this.canProcessCurrentPage()) {
        throw new Error('No suitable scraper found for the current page');
      }
    }
    
    this.isProcessing = true;
    
    try {
      logger.info('Starting category page processing');
      
      // Prepare the page if the scraper supports it
      if (this.activeScraper && this.activeScraper.preparePage) {
        await this.activeScraper.preparePage();
      }
      
      // Find all product elements on the page
      if (!this.activeScraper) {
        throw new Error('No active scraper found for current page');
      }
      
      const productElements = this.activeScraper.findCategoryProducts();
      
      logger.info(`Found ${productElements.length} product elements on the page`);
      
      if (productElements.length === 0) {
        throw new Error('No products found on the category page');
      }
      
      // Extract product data from each element
      const products: ProductData[] = [];
      
      for (const element of productElements) {
        const productData = this.activeScraper.extractProductData(element);
        
        if (productData && productData.title && productData.price !== null) {
          // Fill in any missing required fields
          const fullProductData: ProductData = {
            title: productData.title,
            price: productData.price ?? null,
            marketplace: (productData.marketplace || this.sourceMarketplace) as any,
            productId: productData.productId || `${Date.now()}-${products.length}`,
            brand: productData.brand || null,
            upc: productData.upc || null,
            asin: productData.asin || null,
            imageUrl: productData.imageUrl || null,
            pageUrl: productData.pageUrl || window.location.href
          };
          
          products.push(fullProductData);
        }
      }
      
      logger.info(`Successfully extracted data from ${products.length} products`);
      
      if (products.length === 0) {
        throw new Error('Could not extract data from any products on the page');
      }
      
      // Sort products according to priority order
      this.sortProducts(products);
      
      // Limit to maximum number of products to process
      const productsToProcess = products.slice(0, this.options.maxProducts);
      
      // Store in processing queue
      this.processingQueue = productsToProcess;
      
      // Reset processed results
      this.processedResults = [];
      
      // Prepare the result
      const result: CategoryPageResult = {
        products: productsToProcess,
        marketplace: this.sourceMarketplace,
        categoryName: this.categoryName,
        pageUrl: window.location.href,
        timestamp: Date.now(),
        totalProductsFound: products.length,
        processedProducts: productsToProcess.length
      };
      
      // Store the result in extension storage for access from background/popup
      this.saveResultToStorage(result);
      
      this.isProcessing = false;
      return result;
    } catch (error) {
      this.isProcessing = false;
      logger.error('Error processing category page:', error);
      throw error;
    }
  }
  
  /**
   * Sort products based on the priority order setting
   */
  private sortProducts(products: ProductData[]): void {
    switch (this.options.priorityOrder) {
      case 'price_desc':
        // Sort by price, highest first
        products.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      case 'price_asc':
        // Sort by price, lowest first
        products.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case 'position':
        // Already in DOM order, do nothing
        break;
    }
  }
  
  /**
   * Begin processing the next batch of products using the API-based method
   * @deprecated Use processNextBatchBrowserBased instead
   */
  public async processNextBatch(): Promise<ProductComparison[]> {
    if (this.processingQueue.length === 0) {
      logger.info('No more products in the queue to process');
      return [];
    }
    
    const batchSize = Math.min(this.options.batchSize, this.processingQueue.length);
    const batch = this.processingQueue.splice(0, batchSize);
    
    logger.info(`Processing next batch of ${batch.length} products`);
    
    // Request processing from the background script (which has access to APIs)
    return new Promise((resolve) => {
      logger.info(`Sending batch of ${batch.length} products for processing to ${this.targetMarketplace}`);
      
      // Log the first product in the batch to help debug
      if (batch.length > 0) {
        logger.info('First product in batch:', batch[0]);
      }
      
      chrome.runtime.sendMessage({
        action: 'PROCESS_CATEGORY_BATCH',
        batch,
        targetMarketplace: this.targetMarketplace
      }, (response) => {
        if (chrome.runtime.lastError) {
          logger.error('Error sending batch message:', chrome.runtime.lastError);
          resolve([]);
          return;
        }
        
        if (response && response.success) {
          const comparisons = response.comparisons || [];
          logger.info(`Received ${comparisons.length} comparisons from background script`);
          
          // Log the first comparison if available
          if (comparisons.length > 0) {
            logger.info('First comparison result:', comparisons[0]);
          }
          
          // Add to processed results
          this.processedResults = [...this.processedResults, ...comparisons];
          
          // Store updated results
          this.saveComparisonsToStorage(this.processedResults);
          
          resolve(comparisons);
        } else {
          const errorMsg = response?.error || 'Unknown error';
          logger.error('Error processing batch:', errorMsg);
          
          // If insufficient credits, handle appropriately
          if (errorMsg.includes('Insufficient credits')) {
            logger.error('Insufficient credits to process batch');
            // Could show a notification to the user here
          }
          
          resolve([]);
        }
      });
    });
  }
  
  /**
   * Process the next batch of products using browser-based matching
   * This avoids API calls by doing the matching directly in the browser
   */
  public async processNextBatchBrowserBased(): Promise<ProductComparison[]> {
    if (this.processingQueue.length === 0) {
      logger.info('No more products in the queue to process');
      return [];
    }
    
    const batchSize = Math.min(this.options.batchSize, this.processingQueue.length);
    const batch = this.processingQueue.splice(0, batchSize);
    
    logger.info(`Processing next batch of ${batch.length} products using browser-based matching`);
    
    try {
      // Create a new batch matcher for the target marketplace
      const batchMatcher = new CategoryBatchMatcher(this.targetMarketplace as any, this.options.batchSize);
      
      // Set the progress callback if needed
      batchMatcher.setProgressCallback((progress) => {
        logger.info(`Batch processing progress: ${progress}%`);
        this.updateProgressIndicator(progress);
      });
      
      // Set the products to process
      batchMatcher.setProducts(batch);
      
      // Start processing
      const comparisons = await batchMatcher.startProcessing();
      
      logger.info(`Processed ${comparisons.length} products with browser-based matching`);
      
      // Add to processed results
      this.processedResults = [...this.processedResults, ...comparisons];
      
      // Store updated results
      this.saveComparisonsToStorage(this.processedResults);
      
      return comparisons;
    } catch (error) {
      logger.error('Error in browser-based batch processing:', error);
      return [];
    }
  }
  
  /**
   * Update the UI progress indicator
   */
  private updateProgressIndicator(progress: number): void {
    const button = document.getElementById('extension-start-batch-processing') as HTMLButtonElement;
    if (button) {
      button.textContent = `Processing... ${progress}%`;
    }
  }
  
  /**
   * Check if there are more batches to process
   */
  public hasMoreBatches(): boolean {
    return this.processingQueue.length > 0;
  }
  
  /**
   * Get the number of remaining batches
   */
  public getRemainingBatchesCount(): number {
    return Math.ceil(this.processingQueue.length / this.options.batchSize);
  }
  
  /**
   * Save the category page result to storage
   */
  private saveResultToStorage(result: CategoryPageResult): void {
    chrome.storage.local.set({ categoryPageResult: result }, () => {
      logger.info('Saved category page result to storage');
    });
  }
  
  /**
   * Save product comparisons to storage
   */
  private saveComparisonsToStorage(comparisons: ProductComparison[]): void {
    chrome.storage.local.set({ categoryComparisons: comparisons }, () => {
      logger.info(`Saved ${comparisons.length} category comparisons to storage`);
    });
  }
}

/**
 * Initialize category page processing
 */
export function initCategoryPageProcessing(): void {
  // Always initialize when manually triggered, without checking storage
  try {
    // Use a fixed target marketplace for now (will be configurable in settings)
    const targetMarketplace = 'walmart';
    
    // Create the processor
    const processor = new CategoryBatchProcessor(targetMarketplace);
    
    // Check if we can process this page
    if (processor.canProcessCurrentPage()) {
      logger.info('Category mode is being initialized');
      
      // Add a visual indicator
      addCategoryModeIndicator();
      
      // Process the page to extract products
      processor.processPage().then(() => {
        logger.info('Page processed successfully');
        
        // Add a button to start batch processing
        addStartBatchProcessingButton(processor);
      }).catch(error => {
        logger.error('Error processing page:', error);
      });
    } else {
      logger.error('Cannot process this page type');
    }
  } catch (error) {
    logger.error('Error initializing category page processing:', error);
  }
}

/**
 * Add a visual indicator that category mode is active
 */
function addCategoryModeIndicator(): void {
  const indicator = document.createElement('div');
  indicator.id = 'extension-category-mode-indicator';
  indicator.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background-color: rgba(74, 107, 216, 0.9);
    color: white;
    padding: 8px 16px;
    border-radius: 4px;
    font-family: Arial, sans-serif;
    font-size: 14px;
    z-index: 9999;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  `;
  
  indicator.textContent = 'Category Mode Active';
  document.body.appendChild(indicator);
}

/**
 * Add a button to start batch processing
 */
function addStartBatchProcessingButton(processor: CategoryBatchProcessor): void {
  const buttonContainer = document.createElement('div');
  buttonContainer.id = 'extension-category-controls';
  buttonContainer.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background-color: white;
    border: 2px solid #4a6bd8;
    border-radius: 8px;
    padding: 16px;
    width: 300px;
    font-family: Arial, sans-serif;
    z-index: 9999;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  `;
  
  buttonContainer.innerHTML = `
    <h3 style="margin: 0 0 12px; font-size: 16px; color: #4a6bd8;">Category Product Finder</h3>
    <p style="margin: 0 0 16px; font-size: 14px;">
      Products have been identified on this page. Click the button below to start finding matches.
    </p>
    <button id="extension-start-batch-processing" style="
      background-color: #4a6bd8;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 8px 16px;
      font-size: 14px;
      cursor: pointer;
      width: 100%;
    ">Start Finding Matches</button>
    <button id="extension-open-results" style="
      background-color: transparent;
      color: #4a6bd8;
      border: 1px solid #4a6bd8;
      border-radius: 4px;
      padding: 8px 16px;
      font-size: 14px;
      cursor: pointer;
      width: 100%;
      margin-top: 8px;
      display: none;
    ">View Results</button>
  `;
  
  document.body.appendChild(buttonContainer);
  
  // Add event listener
  document.getElementById('extension-start-batch-processing')?.addEventListener('click', async () => {
    // Change button text
    const button = document.getElementById('extension-start-batch-processing') as HTMLButtonElement;
    const resultsButton = document.getElementById('extension-open-results') as HTMLButtonElement;
    button.textContent = 'Processing...';
    button.disabled = true;
    
    try {
      // Check if we should use API or browser-based matching
      let useApiMatching = false;
      
      // Check storage to see if API matching was requested
      await new Promise<void>((resolve) => {
        chrome.storage.local.get(['useApiMatching'], (result) => {
          if (result.useApiMatching === true) {
            useApiMatching = true;
            logger.info('Using API-based matching as requested');
          } else {
            logger.info('Using browser-based matching as requested');
          }
          resolve();
        });
      });
      
      // Process all batches
      let batchCount = 0;
      while (processor.hasMoreBatches() && batchCount < 10) { // Limit to 10 batches to avoid hanging
        if (useApiMatching) {
          // Use API-based matching
          await processor.processNextBatch();
        } else {
          // Use browser-based matching
          await processor.processNextBatchBrowserBased();
        }
        
        batchCount++;
        
        // Update button text
        if (processor.hasMoreBatches()) {
          button.textContent = `Processing... ${batchCount} batches complete, ${processor.getRemainingBatchesCount()} remaining`;
        }
      }
      
      // All done
      button.textContent = 'Processing Complete!';
      resultsButton.style.display = 'block';
      
      // Notify that we're done
      chrome.runtime.sendMessage({
        action: 'CATEGORY_PROCESSING_COMPLETE'
      });
    } catch (error) {
      button.textContent = 'Error During Processing';
      button.disabled = false;
      logger.error('Error during batch processing:', error);
    }
  });
  
  // Add results button listener - open in the extension popup instead of new window
  document.getElementById('extension-open-results')?.addEventListener('click', () => {
    // Notify the extension popup to show results (will be handled in the popup)
    chrome.runtime.sendMessage({
      action: 'CATEGORY_PROCESSING_COMPLETE'
    });
  });
}