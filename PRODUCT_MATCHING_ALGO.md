# Product Matching Algorithm

This document explains how the E-commerce Arbitrage Extension matches products across different marketplaces to identify arbitrage opportunities.

## Overview

The product matching algorithm is designed to find identical products across Amazon, Walmart, and Target to calculate potential profit margins. The extension implements a real-time API approach using specialized marketplace API services.

## API-Based Matching

The algorithm follows this matching hierarchy (from most to least accurate):

1. **UPC/EAN Matching**: Direct product identification using universal product codes
2. **ASIN Direct Matching**: Amazon-specific product identification
3. **Brand + Title Matching**: Fuzzy matching using brand and product name
4. **Title-Only Matching**: Last resort using just the product name

### Matching Process

1. **Identifier Extraction**:
   - The content script extracts available identifiers (UPC, ASIN, product ID)
   - It also captures brand, title, and other metadata

2. **Strategy Selection**:
   ```
   if (UPC/EAN available) {
       Use UPC/EAN for direct matching (most accurate)
   } else if (source is Amazon AND target is Amazon) {
       Use ASIN for direct matching
   } else if (Brand available) {
       Use Brand + Title for search-based matching
   } else {
       Use Title for fuzzy matching (least accurate)
   }
   ```

3. **API Request Construction**:
   - Constructs appropriate queries for each marketplace API
   - Uses the most specific identifier available

4. **Result Processing**:
   - Normalizes responses to a common format
   - Filters results by relevance and similarity
   - Ranks by confidence score, price, and ratings

## API Services

The extension uses the following API services:

1. **BlueCart API** - For Walmart product data
2. **Rainforest API** - For Amazon product data
3. **BigBox API** - For Target product data

These services handle the complex task of searching within each marketplace and returning normalized product data.

## Profit Calculation

Once matching products are found, the extension calculates potential profit:

1. Takes the source product's price as the purchase cost
2. Takes the matched product's price as the selling price
3. Applies marketplace fees if enabled in settings
4. Calculates profit amount and percentage
5. Filters results based on minimum profit threshold

```javascript
// Simplified calculation logic
profitAmount = sellingPrice * (1 - marketplaceFee) - purchasePrice;
profitPercentage = (profitAmount / purchasePrice) * 100;
```

## Marketplace Selection

The algorithm supports filtering searches to a specific marketplace:

1. If a marketplace is selected in settings, only that marketplace is searched
2. If the selected marketplace is the same as the source product, no search is performed
3. If no marketplace is selected, all marketplaces except the source are searched

This approach minimizes API usage and focuses results on the most relevant opportunities.

## Caching System

To minimize API usage and improve performance, the extension implements a two-level caching system:

1. **Chrome Storage Cache**:
   - Persistently stores product comparison results
   - Configurable expiration time (default: 24 hours)
   - Cache keys include marketplace selection for proper differentiation

2. **Memory Cache**:
   - Temporarily stores active product data for faster access
   - Cleared when the browser is closed

## Algorithm Accuracy

The expected accuracy rates are:

- **~95% accuracy** with UPC/EAN matching
- **~90% accuracy** with ASIN direct matching
- **~75-85% accuracy** with Brand + Title matching
- **~60-70% accuracy** with Title-only matching

The accuracy depends on the quality of data available on the product page and the capabilities of the underlying API services.

## Error Handling

The algorithm includes robust error handling:

1. **API Connection Errors**: Gracefully handles API timeouts and connection issues
2. **Rate Limiting**: Properly handles rate limit responses from APIs
3. **Malformed Data**: Validates and sanitizes API responses
4. **Fallback Strategies**: Falls back to less precise matching methods when needed

## Performance Considerations

To optimize performance and API usage:

1. **Caching**: Caches results to minimize redundant API calls
2. **Selective Searching**: Only searches the selected marketplace when specified
3. **Query Optimization**: Constructs efficient API queries based on available data
4. **Parallel Processing**: Processes multiple marketplace searches in parallel
