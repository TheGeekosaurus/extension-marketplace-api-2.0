# Product Matching Algorithm

This document explains how the E-commerce Arbitrage Extension matches products across different marketplaces to identify arbitrage opportunities.

## Overview

The product matching algorithm is designed to find identical products across Amazon, Walmart, and Target to calculate potential profit margins. The extension implements two modes:

1. **Mock Data Mode** (Default): Simulates product matches without making API calls
2. **API Mode**: Uses specialized APIs to find real matches across marketplaces

## Mock Data Implementation

In mock data mode, the algorithm generates realistic simulated matches based on the source product:

- Creates price variations that reflect typical marketplace pricing patterns
- Excludes matches for the source marketplace (no self-matches)
- Adjusts prices based on detected product category
- Generates realistic ratings and review counts

### Price Variation Logic

The algorithm applies different price multipliers based on product category and marketplace:

| Category | Amazon | Walmart | Target |
|----------|--------|---------|--------|
| Pet Supplies | +25% | -15% | +5% |
| Household | +15% | -20% | -5% |
| Beauty | +20% | -10% | +15% |
| Grocery | +30% | -25% | -15% |
| Electronics | +5% | +0% | +10% |
| General | +20% | -10% | +10% |

This reflects real-world pricing patterns where Amazon often charges premium prices for convenience, while Walmart typically offers lower prices on household and grocery items.

## API-Based Matching

When using real APIs, the algorithm follows this matching hierarchy (from most to least accurate):

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

## Profit Calculation

Once matching products are found (either through mock data or real APIs), the extension calculates potential profit:

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

## Caching System

To minimize API usage and improve performance, the extension implements a two-level caching system:

1. **Chrome Storage Cache**:
   - Persistently stores product comparison results
   - Configurable expiration time (default: 24 hours)

2. **Memory Cache**:
   - Temporarily stores active product data for faster access
   - Cleared when the browser is closed

## Algorithm Accuracy

When using real APIs, the expected accuracy rates are:

- **~95% accuracy** with UPC/EAN matching
- **~90% accuracy** with ASIN direct matching
- **~75-85% accuracy** with Brand + Title matching
- **~60-70% accuracy** with Title-only matching

In mock data mode, matches are always generated but represent simulated data rather than actual marketplace listings.

## Future Improvements

Planned enhancements to the matching algorithm:

1. **Image-based similarity** as an additional matching factor
2. **Machine learning approach** for improved accuracy
3. **Category-specific matching rules** for better results in specialized niches
4. **User feedback loop** to improve matching quality over time
