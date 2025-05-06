// src/matchFinder/extractors/walmart.ts - Walmart search results extractor

import { ProductData } from '../../types';
import { ExtractedMatch } from '../types';
import { createLogger } from '../utils/logger';
import { calculateTitleSimilarity } from '../scoring/similarity';

const logger = createLogger('WalmartExtractor');

/**
 * Extract product data from Walmart search results page
 * 
 * @param document - Document object from the search page
 * @param sourceProduct - Source product to match against
 * @returns Array of extracted products
 */
export function extractProductFromWalmart(
  document: Document,
  sourceProduct: ProductData
): ExtractedMatch[] {
  logger.info('Extracting products from Walmart search results');
  
  try {
    // Find all product elements
    const productElements = findProductElements(document);
    
    if (productElements.length === 0) {
      logger.warn('No product elements found on Walmart search page');
      return [];
    }
    
    logger.info(`Found ${productElements.length} Walmart product elements`);
    
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
    
    logger.info(`Successfully extracted ${extractedProducts.length} Walmart products`);
    
    return extractedProducts;
  } catch (error) {
    logger.error('Error extracting Walmart products:', error);
    return [];
  }
}

/**
 * Find product elements on Walmart search page
 * 
 * @param document - Document to search in
 * @returns Array of product elements
 */
function findProductElements(document: Document): Element[] {
  try {
    // Try different selectors for Walmart search results
    const selectors = [
      '[data-item-id]',
      '[data-product-id]',
      '.search-result-gridview-item',
      '.product.product-search-result.search-result-gridview-item',
      '.sans-serif.relative.pb3.pt2.ph3.w-100'
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
 * Extract product data from Walmart product element
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
    const titleElement = element.querySelector('[data-automation-id="product-title"], .sans-serif.mid-gray, .w_iUH, .lh-title');
    const title = titleElement?.textContent?.trim() || '';
    
    if (!title) {
      logger.debug('No title found in element');
      return null;
    }
    
    // Extract price - Walmart often has more complex price structures
    let price: number | null = null;
    
    // Method 1: Try the main price selectors
    const priceSelectors = [
      '[data-automation-id="product-price"]',
      '.b.black.f1.mr1',
      '.w_iUH',
      '[data-testid="price-current"]',
      'span.w_1UH7'
    ];
    
    for (const selector of priceSelectors) {
      const priceElement = element.querySelector(selector);
      if (priceElement) {
        const priceText = priceElement.textContent || '';
        const priceMatch = priceText.match(/\$\s*(\d+(?:\.\d{2})?)/);
        if (priceMatch && priceMatch[1]) {
          price = parseFloat(priceMatch[1]);
          break;
        }
      }
    }
    
    // Method 2: If we couldn't find a price, try the dollars/cents separately
    if (price === null) {
      const wholeDollarElement = element.querySelector('.w_C6.w_D.w_C7.w_Da');
      const centsElement = element.querySelector('.w_C6.w_D.w_C7.w_Db');
      
      if (wholeDollarElement && centsElement) {
        const dollars = wholeDollarElement.textContent?.replace(/[^\d]/g, '') || '0';
        const cents = centsElement.textContent?.replace(/[^\d]/g, '') || '00';
        price = parseFloat(`${dollars}.${cents}`);
      }
    }
    
    if (price === null || isNaN(price)) {
      logger.debug('No valid price found in element');
      return null;
    }
    
    // Get URL
    const linkElement = element.querySelector('a[link-identifier="linkTest"], a.absolute.w-100.h-100, .sans-serif.w_iUH a');
    const relativeUrl = linkElement ? linkElement.getAttribute('href') || '' : '';
    const url = relativeUrl ? new URL(relativeUrl, window.location.origin).href : '';
    
    if (!url) {
      logger.debug('No URL found in element');
      return null;
    }
    
    // Get image
    const imgElement = element.querySelector('img[data-automation-id="product-image"], img.absolute, img.w_iUF');
    const imageUrl = imgElement ? imgElement.getAttribute('src') || '' : '';
    
    // Calculate similarity score
    const similarityScore = calculateTitleSimilarity(title, sourceProduct.title);
    
    logger.debug(`Extracted Walmart product: "${title.substring(0, 30)}..." with similarity ${similarityScore.toFixed(2)}`);
    
    return {
      title,
      price,
      url,
      imageUrl,
      similarityScore,
      marketplace: 'walmart',
      element
    };
  } catch (error) {
    logger.error('Error extracting product data:', error);
    return null;
  }
}
