// src/tests/matchFinder.test.ts - Test script for the match finder module

/**
 * This is a manual test script to validate the match finder module.
 * You can run this in the Chrome DevTools console on a product page to test the functionality.
 * 
 * Note: This is not an automated test. It's meant to be run manually for debugging purposes.
 */

import { findMatch } from '../matchFinder';
import { extractAmazonProductData } from '../content/extractors/amazon';
import { extractWalmartProductData } from '../content/extractors/walmart';

/**
 * Manually test the match finder on the current product page
 */
async function testMatchFinder() {
  console.group('Match Finder Test');
  console.log('Starting match finder test...');
  
  try {
    // Step 1: Extract product data from the current page
    console.log('Step 1: Extracting product data from current page');
    
    let sourceProduct;
    
    // Determine the current marketplace and extract product data
    const url = window.location.href;
    if (url.includes('amazon.com')) {
      console.log('Detected Amazon page');
      sourceProduct = await extractAmazonProductData();
    } else if (url.includes('walmart.com')) {
      console.log('Detected Walmart page');
      sourceProduct = await extractWalmartProductData();
    } else {
      throw new Error('Not on a supported marketplace page');
    }
    
    if (!sourceProduct) {
      throw new Error('Failed to extract product data from current page');
    }
    
    console.log('Extracted source product:', sourceProduct);
    
    // Step 2: Determine target marketplace
    const targetMarketplace = sourceProduct.marketplace === 'amazon' ? 'walmart' : 'amazon';
    console.log(`Step 2: Target marketplace is ${targetMarketplace}`);
    
    // Step 3: Find match
    console.log(`Step 3: Finding match on ${targetMarketplace}`);
    const result = await findMatch(sourceProduct, targetMarketplace, {
      timeout: 60000, // 60 seconds for testing
      minSimilarity: 0.2, // Lower threshold for testing
      includeBrand: true,
      maxTitleWords: 15 // More words for better matching
    });
    
    console.log('Match finder result:', result);
    
    if (result.success && result.match) {
      console.log('✅ Success! Found match:', result.match);
      console.log(`Title: ${result.match.title}`);
      console.log(`Price: $${result.match.price}`);
      console.log(`Similarity: ${(result.match.similarityScore * 100).toFixed(1)}%`);
      console.log(`URL: ${result.match.url}`);
    } else {
      console.log('❌ No match found:', result.error);
    }
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
  
  console.log('Match finder test completed');
  console.groupEnd();
}

// Expose the test function to the global scope for manual testing
(window as any).testMatchFinder = testMatchFinder;

// Instructions for running the test
console.log(`
To run the match finder test:
1. Navigate to a product page on Amazon or Walmart
2. Open Chrome DevTools console (F12 or Ctrl+Shift+J)
3. Type "testMatchFinder()" and press Enter
4. The test will run and display results in the console
`);

export default testMatchFinder;
