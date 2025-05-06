// src/matchFinder/extractors/amazon.ts - Amazon search results extractor

import { ProductData } from '../../types';
import { ExtractedMatch } from '../types';
import { createLogger } from '../utils/logger';
import { calculateTitleSimilarity } from '../scoring/similarity';

const logger = createLogger('AmazonExtractor');

/**
 * Extract product data from Amazon search results page
 * 
 * @param document - Document object from the search page
 * @param sourceProduct - Source product to match against
 * @returns Array of extracted products
 */
export function extractProductFromAmazon(
  document: Document,
  sourceProduct: ProductData
): ExtractedMatch[] {
  logger.info('Extracting products from Amazon search results');
  
  try {
    // Find all product elements
    const productElements = findProductElements(document);
    
    if (productElements.length === 0) {
      logger.warn('No product elements found on Amazon search page');
      return [];
    }
    
    logger.info(`Found ${productElements.length} Amazon product elements`);
    
    // Extract data from each element
    const extractedProducts: ExtractedMatch[] = [];
    
    for (const element of productElements) {
      try {
        const extractedProduct = extractProductData(element, sourceProduct);
        if (extractedProduct) {
          extractedProducts.push(extractedProduct);
        }
      } catch (error) {
        logger.error('Error extracting product data:', error);
      }
    }
    
    logger.info(`Successfully extracted ${extractedProducts.length} Amazon products`);
    
    return extractedProducts;
  } catch (error) {
    logger.error('Error extracting Amazon products:', error);
    return [];
  }
}

/**
 * Find product elements on Amazon search page
 * 
 * @param document - Document to search in
 * @returns Array of product elements
 */
function findProductElements(document: Document): Element[] {
  try {
    // Try different selectors for Amazon search results
    const selectors = [
      '.s-result-item[data-asin]:not(.AdHolder)',
      '.sg-row[data-asin]',
      '.s-result-list .a-section[data-asin]'
    ];
    
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        logger.info(`Found ${elements.length} elements with selector: ${selector}`);
        return Array.from(elements);
      }
    }
    
    logger.warn('No product elements found with any selector');
    return [];
  } catch (error) {
    logger.error('Error finding product elements:', error);
    return [];
  }
}

/**
 * Extract product data from Amazon product element
 * 
 * @param element - Product element
 * @param sourceProduct - Source product for similarity calculation
 * @returns Extracted product data or null if extraction fails
 */
function extractProductData(
  element: Element,
  sourceProduct: ProductData
): ExtractedMatch | null {
  try {
    // Extract title
    // First check if this is a sponsored product
    let isSponsoredProduct = false;
    try {
      const sponsoredLabel = element.querySelector('.puis-label-popover-default, .a-color-secondary:contains("Sponsored")');
      if (sponsoredLabel) {
        isSponsoredProduct = true;
        logger.debug('Found sponsored product');
      }
    } catch (e) {
      // Ignore error, assume not sponsored
    }
    
    // Extract the actual title
    const titleElement = element.querySelector('h2, h2 a, .a-text-normal');
    const title = titleElement?.textContent?.trim() || '';
    
    if (!title) {
      logger.debug('No title found in element');
      return null;
    }
    
    // Don't return "Sponsored" as the title
    if (title === "Sponsored") {
      logger.debug('Ignoring "Sponsored" label as title, trying to find actual title');
      
      // Try alternative title selectors
      const altTitleElement = element.querySelector('.a-size-base-plus, .a-size-medium');
      const altTitle = altTitleElement?.textContent?.trim();
      
      if (altTitle) {
        logger.debug(`Found alternative title: ${altTitle}`);
        return altTitle;
      }
      
      return null;
    }
    
    // Extract price
    const priceElement = element.querySelector('.a-price .a-offscreen');
    let price: number | null = null;
    
    if (priceElement) {
      const priceText = priceElement.textContent || '';
      // Extract just the numeric part with up to 2 decimal places
      const priceMatch = priceText.match(/\$?(\d+(?:\.\d{1,2})?)/);
      if (priceMatch && priceMatch[1]) {
        price = parseFloat(priceMatch[1]);
      }
    }
    
    // If primary price selector failed, try alternatives
    if (price === null) {
      const altPriceElement = element.querySelector('.a-color-price, .a-color-base');
      if (altPriceElement) {
        const priceText = altPriceElement.textContent || '';
        const priceMatch = priceText.match(/\$?(\d+(?:\.\d{1,2})?)/);
        if (priceMatch && priceMatch[1]) {
          price = parseFloat(priceMatch[1]);
        }
      }
    }
    
    if (price === null || isNaN(price)) {
      logger.debug('No valid price found in element');
      return null;
    }
    
    // Get URL
    const linkElement = element.querySelector('a.a-link-normal[href*="/dp/"]');
    const url = linkElement ? 
      new URL(linkElement.getAttribute('href') || '', window.location.origin).href : '';
    
    if (!url) {
      logger.debug('No URL found in element');
      return null;
    }
    
    // Get image
    const imgElement = element.querySelector('img.s-image');
    const imageUrl = imgElement ? imgElement.getAttribute('src') || '' : '';
    
    // Calculate similarity score
    const similarityScore = calculateTitleSimilarity(title, sourceProduct.title);
    
    logger.debug(`Extracted Amazon product: "${title.substring(0, 30)}..." with similarity ${similarityScore.toFixed(2)}`);
    
    return {
      title,
      price,
      url,
      imageUrl,
      similarityScore,
      marketplace: 'amazon',
      element
    };
  } catch (error) {
    logger.error('Error extracting product data:', error);
    return null;
  }
}
