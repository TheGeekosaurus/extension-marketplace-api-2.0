# Search Selector Tester Guide

The Search Selector Tester extends the Selector Testing functionality to work with marketplace search results pages. This is particularly useful for debugging the match finder feature that extracts product data from search results.

## Overview

Search pages often have different DOM structures than product pages, and they typically contain multiple product entries that need to be extracted and processed. The Search Selector Tester helps you:

1. Identify search result containers on the page
2. Verify that product data (title, price, image, etc.) can be extracted from each result
3. Test the actual search result extraction functions
4. Visualize search results on the page with color-coded highlighting

## Using the Search Selector Tester

The search tester is integrated with the regular selector tester in the settings panel. When you're on a search page:

1. Navigate to a search results page on a supported marketplace (Amazon, Walmart)
2. Open the extension popup
3. Go to the "Settings" tab
4. Scroll down to the "Debug Tools" section
5. Click the "Test Selectors on Current Page" button
6. The extension will automatically detect that you're on a search page and run the search-specific tests

## Understanding Test Results

The search selector test results have two main sections:

### 1. Search Result Extraction

This section shows whether the main search result finder function was successful:

- ✅ Success: Found X search result elements
- ❌ Failure: Error message or "No elements found"

This tests the actual extraction functions used by the match finder feature:
- `findAmazonSearchResultElements()`
- `findWalmartSearchResultElements()`

### 2. Selector Groups

The selector groups section shows detailed results for each set of selectors:

- **resultContainer**: Elements that contain individual search results
- **title**: Product title selectors
- **price**: Product price selectors
- **image**: Product image selectors
- **link**: Product link selectors
- **rating**: Product rating selectors
- **reviewCount**: Review count selectors

For each selector, you'll see:
- Whether it matched any elements
- How many elements it matched
- Sample text from matched elements
- Any errors encountered

## Visual Highlighting

You can also use the "Highlight Elements on Page" button while on a search page. This will:

1. Highlight each search result container in a unique color
2. Highlight key elements within each container (title, price, image, etc.)
3. Apply labels showing which type of element is highlighted

This visual approach helps you see what's being extracted and identify any issues with the structure.

## Common Search Page Issues

### 1. Container Selectors Not Found

If the result container selectors don't work, the extension won't be able to identify individual product listings. This often happens when:

- The marketplace has updated their search results layout
- The search has returned a different format (e.g., grid vs. list view)
- The page is still loading dynamically and elements aren't available yet

### 2. Element Selectors Not Finding Content

If the container selectors work but element selectors (like title, price) don't, check:

- Whether the selectors are looking in the correct parent context
- If the marketplace has changed its inner element structure
- If there are multiple formats for different types of products

### 3. Multiple Containers Found But Wrong Elements

If the test finds containers but they're not the actual product listings:

- The selectors might be matching pagination elements or filters
- Sponsored content might have different markup
- Marketplace might have changed which containers actually contain products

## Updating Search Selectors

If you need to update search selectors, modify the appropriate files:

- `src/content/matchFinder/amazonSearch.ts`
- `src/content/matchFinder/walmartSearch.ts`
- `src/content/utils/searchSelectorTester.ts` (for the testing selectors)

The search selectors are organized into groups and follow a similar pattern to product page selectors:

```typescript
export const amazonSearchSelectors = {
  resultContainer: [
    '.s-result-item[data-asin]:not(.AdHolder)',
    '.sg-row[data-asin]',
    '.s-result-list .a-section[data-asin]'
  ],
  // Other selector groups...
};
```

## Tips for Search Page Selectors

1. **Container First**: Start by getting the container selectors right, as everything else depends on these
2. **Inspect Variations**: Check different types of search results (regular products, sponsored, ads)
3. **Handle Multiple Layouts**: Some marketplaces use different layouts for different search types
4. **Data Attributes**: Look for data attributes like `data-asin` or `data-item-id` that uniquely identify products
5. **Test Different Searches**: Try different search terms to make sure selectors work across product categories

## Advanced Troubleshooting

For complex issues with search results extraction:

1. **Browser Console**: Use the browser console to test selector queries directly
2. **Element Inspection**: Use the browser's element inspector to analyze the DOM structure
3. **Multiple Pages**: Test on different types of search results pages
4. **Time Delays**: Some pages load elements dynamically after the initial page load

By using the Search Selector Tester regularly when making changes, you can ensure your extension maintains compatibility as marketplace websites evolve their search results pages.
