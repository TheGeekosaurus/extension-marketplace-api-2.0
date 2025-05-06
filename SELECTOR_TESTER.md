# Selector Tester Guide

The Selector Tester is a development tool built into the E-commerce Arbitrage Extension that helps diagnose and fix selector issues on marketplace pages. This tool is especially useful when troubleshooting extraction problems or when a marketplace updates its DOM structure.

## Features

1. **Test Selectors**: Runs all selectors for the current marketplace and reports which ones work
2. **Highlight Elements**: Visually highlights matching elements on the page
3. **Detailed Results**: Shows exactly which selectors worked, what text they found, and any errors

## Using the Selector Tester

### Testing Selectors

1. Navigate to a product page on a supported marketplace (Amazon, Walmart, Target, or Home Depot)
2. Open the extension popup
3. Go to the "Settings" tab
4. Scroll down to the "Debug Tools" section
5. Click the "Test Selectors on Current Page" button
6. Review the results, which show:
   - Which selector groups are working (e.g., title, price, brand)
   - For each selector, whether it found a match and how many elements it found
   - Sample text from the matched elements
   - Any errors encountered

### Highlighting Elements

1. Navigate to a product page
2. Open the extension popup
3. Go to the "Settings" tab
4. Click the "Highlight Elements on Page" button
5. The page will show colored outlines around elements that match your selectors
6. Each selector group (title, price, brand, etc.) uses a different color
7. Click anywhere on the page to dismiss the highlighting

## Interpreting Results

### Success Indicators

- ✅ Green text: The selector found at least one matching element
- ❌ Red text: The selector didn't find any matching elements

### Common Issues

1. **All selectors failing in a group**: The marketplace likely changed their DOM structure significantly
2. **Some selectors working in a group**: The primary selectors may have changed, but fallbacks are still working
3. **Selectors finding too many elements**: The selector may be too broad, leading to incorrect data extraction
4. **JavaScript errors**: There might be syntax issues in the selector

## Updating Selectors

After identifying which selectors are failing, you can update them in the appropriate files:

- `src/content/selectors/amazon.ts`
- `src/content/selectors/walmart.ts`
- `src/content/selectors/target.ts`
- `src/content/selectors/homedepot.ts`

Each selector file follows the same pattern:

```typescript
export const amazonSelectors = {
  title: [
    '#productTitle', // Primary selector
    '.product-title-word-break', // Fallback 1
    'h1' // Fallback 2 (very broad)
  ],
  // Other selector groups...
};
```

### Tips for Creating Good Selectors

1. **Start specific, then get broader**: Order selectors from most specific to least specific
2. **Use multiple fallbacks**: Having 2-3 alternative selectors increases resilience against site changes
3. **Test new selectors**: After adding or updating selectors, use the Selector Tester to verify they work
4. **Add comments**: Explain why a selector was added or what specific pattern it's targeting

## Advanced Usage

### Adding Custom Selectors for Testing

You can temporarily add selectors to the tester without modifying the code by using the browser console:

1. Open the browser console (F12 or Ctrl+Shift+I, then click "Console")
2. For example, to test a new Amazon price selector:

```javascript
// Get the Amazon selectors
const selectors = { price: ['#newPriceSelector', '.some-other-selector'] };

// Test just these selectors
testSelectorGroup('price', selectors.price);
```

### Debugging Selector Extraction

When you need to debug a specific extraction issue:

1. Test the selectors using the Selector Tester
2. If selectors are working but extraction still fails, the issue might be in:
   - Text parsing logic in the extractors
   - Regular expressions for cleaning up text
   - Element finding strategies in `findElement` or other utility functions

## Common Marketplace Patterns

Each marketplace has certain patterns that might help when updating selectors:

### Amazon
- Uses `#productTitle` for the main product title
- Price is often in `.a-price .a-offscreen` elements
- Brand information is in `#bylineInfo`

### Walmart
- Product titles are often in `.prod-ProductTitle` or similar classes
- Prices can be split between dollars and cents in separate elements
- Uses data attributes like `[data-testid="..."]` extensively

### Target
- Uses `[data-test="product-title"]` pattern extensively
- Modern React components with data attributes
- Pricing has specialized wrapper classes

### Home Depot
- Uses multiple data sources (JSON-LD, inline JSON, DOM)
- Modern frontend with Tailwind-like utility classes (e.g., "sui-text-9xl")
- Product information often in sections with specific IDs
