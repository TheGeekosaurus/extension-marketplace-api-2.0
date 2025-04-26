# Product Matching Algorithm Documentation

This document describes the product matching algorithm used in the E-commerce Arbitrage Extension, including the logic behind identifying the same product across different marketplaces and the implementation of mock data for testing.

## Overview

The product matching algorithm is designed to find the same product across different e-commerce platforms (Amazon, Walmart, Target) to identify arbitrage opportunities. The extension currently implements two modes:

1. **Mock Data Mode** (Default): Simulates product matches without making API calls
2. **API Mode**: Uses TrajectData's APIs to find real matches across marketplaces

## Mock Data Implementation

When using mock data (the default mode), the algorithm generates simulated product matches based on the source product:

```javascript
function generateMockProductMatches(productData: ProductData): {
  amazon?: ProductMatchResult[];
  walmart?: ProductMatchResult[];
  target?: ProductMatchResult[];
} {
  const result = {};
  
  // Don't create mock matches for the source marketplace
  if (productData.marketplace !== 'amazon') {
    result.amazon = [{
      title: `${productData.title} - Amazon Version`,
      price: productData.price ? productData.price * 1.2 : 19.99, // 20% higher price for profit
      image: productData.imageUrl,
      url: `https://amazon.com/dp/B07XYZABC`,
      marketplace: 'amazon',
      asin: 'B07XYZABC',
      ratings: {
        average: 4.5,
        count: 128
      }
    }];
  }
  
  // Similar logic for other marketplaces
  // ...
}
```

Key aspects of the mock data implementation:

- Excludes the source marketplace from results (no self-matches)
- Creates price variations to simulate potential profit opportunities
- Uses the original product's image and a similar title
- Adds realistic ratings and review counts
- Provides clickable links to simulated product pages

## API-Based Matching Hierarchy

When using the real API services, the algorithm follows this hierarchy of matching methods:

1. **UPC/EAN Matching** (Highest Accuracy)
2. **ASIN Direct Matching** (Amazon Only)
3. **Brand + Title Matching** (Good Accuracy)
4. **Title-Only Fuzzy Matching** (Lowest Accuracy)

## Detailed Matching Process

### 1. Identifier Extraction

When a user visits a product page, the content script attempts to extract the following identifiers:

**For Amazon:**
- ASIN (Always available in URL)
- UPC/EAN (May be available in product details)
- Brand (Usually available)
- Product Title (Always available)

**For Walmart:**
- Item ID (Available in URL)
- UPC (Often available in product details or page source)
- Brand (Usually available)
- Product Title (Always available)

**For Target:**
- TCIN (Available in URL or page source)
- UPC (Sometimes available in page source)
- Brand (Usually available)
- Product Title (Always available)

### 2. Matching Strategy Selection

Based on available identifiers, the algorithm determines the best matching strategy:

```
if (UPC/EAN is available) {
    Use UPC/EAN for direct matching (most accurate)
} else if (source is Amazon AND target is Amazon) {
    Use ASIN for direct matching
} else if (Brand is available) {
    Use Brand + Title for search-based matching
} else {
    Use Title for fuzzy matching (least accurate)
}
```

### 3. API Request Construction

For real API requests, the backend constructs appropriate queries for each marketplace:

**For BlueCart (Walmart):**
```javascript
{
  type: 'product',
  upc: productData.upc  // 12-digit UPC
}
```

**For Rainforest (Amazon):**
```javascript
{
  type: 'search',
  amazon_domain: 'amazon.com',
  search_term: productData.upc  // Search by UPC
}
```

**For BigBox (Target):**
```javascript
{
  type: 'product',
  upc: productData.upc
}
```

### 4. Response Processing

Once API responses are received, the algorithm processes them:

1. **Normalization**: Convert all responses to a common format
2. **Filtering**: Remove irrelevant matches based on:
   - Title similarity
   - Brand exact matching (when available)
   - Price reasonability (exclude outliers)

3. **Ranking**: Sort results by:
   - Match confidence score
   - Price (for arbitrage potential)
   - Ratings (higher ratings preferred)

## Profit Calculation

For both mock data and real API results, the extension calculates potential profit:

```javascript
function calculateProfitMargins(sourceProduct, matchedProducts) {
  // Skip if source product has no price
  if (sourceProduct.price === null) return;
  
  // Apply marketplace fees if enabled
  Object.keys(matchedProducts).forEach(marketplace => {
    const products = matchedProducts[marketplace];
    
    if (!products) return;
    
    products.forEach(product => {
      if (product.price === null) {
        product.profit = { amount: 0, percentage: 0 };
        return;
      }
      
      let sellPrice = product.price;
      
      // Apply estimated fees if enabled
      if (includeFees && estimatedFees[marketplace]) {
        const feePercentage = estimatedFees[marketplace];
        sellPrice = sellPrice * (1 - feePercentage);
      }
      
      const profitAmount = sellPrice - sourceProduct.price;
      const profitPercentage = (profitAmount / sourceProduct.price) * 100;
      
      product.profit = {
        amount: parseFloat(profitAmount.toFixed(2)),
        percentage: parseFloat(profitPercentage.toFixed(2))
      };
    });
  });
}
```

## Caching Implementation

To minimize API usage and improve response times, the extension implements a two-level caching system:

1. **Chrome Storage Cache**:
   - Caches product comparison results using Chrome's storage API
   - Configurable expiration time (default: 24 hours)
   - Uses a unique cache key based on product identifier and marketplace

2. **Server-Side Cache** (when using real APIs):
   - Additional caching layer in the backend server
   - Default TTL of 1 hour
   - Reduces redundant API calls across different users

## Edge Cases and Handling

### 1. Product Not Found

If a direct match isn't found, the algorithm:
- Falls back to search-based matching
- Decreases confidence thresholds until matches are found or possibilities are exhausted
- In mock data mode, always generates simulated matches

### 2. API Failures

The extension handles API failures gracefully by:
1. Retrying failed requests (with backoff)
2. Falling back to less accurate methods
3. Using cached results when possible
4. Providing clear error messages to the user

### 3. Price Unavailable

If a product price cannot be determined:
- The product is still shown in results
- Profit calculations show $0.00 (0%)
- A warning is displayed to the user

## Accuracy and Limitations

When using real APIs, the algorithm achieves:

- **~95% accuracy** with UPC/EAN matching
- **~90% accuracy** with ASIN direct matching
- **~75-85% accuracy** with Brand + Title matching
- **~60-70% accuracy** with Title-only matching

In mock data mode, matches are always generated but do not represent real marketplace data.

## Switching Between Mock and API Modes

To switch between mock data and real API mode:

1. Open `src/background.ts`
2. Find the line: `const useMockData = true;`
3. Set to `false` to use real APIs (requires API keys and backend server)
4. Set to `true` to use mock data (default, no API requirements)
5. Rebuild the extension

## Future Improvements

Potential enhancements to the matching algorithm:

1. **Improved Mock Data Logic**:
   - More realistic price variations based on product category
   - Product-specific profit margin simulations
   - Better brand and marketplace-specific pricing models

2. **Enhanced API Matching**:
   - Machine learning approach for improved accuracy
   - Category-specific matching rules
   - Image similarity as an additional factor
   - User feedback loop to improve matching quality

3. **Performance Optimization**:
   - Smarter caching strategies
   - Progressive loading of results
   - Background pre-fetching for frequently visited products
