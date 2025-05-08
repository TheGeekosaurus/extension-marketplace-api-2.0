# Match Finder Debugging Guide

This document explains how to use the Match Finder debugging tools to troubleshoot issues with product matching on marketplace search pages.

## Overview

The Match Finder is a core component of the E-commerce Arbitrage Assistant that helps find matching products on marketplace search pages. It's used by the "Find Match In Background" feature to automatically match products across different marketplaces.

When troubleshooting issues with match finding, you can use the built-in debug tools to:

1. Visualize the search and matching process
2. Test selector functionality on marketplace search pages
3. View similarity scores and matching decisions
4. Identify why certain products are not being matched correctly

## Using the Match Finder Debug Tools

### Step 1: Extract a Product

First, navigate to a product page (Amazon, Walmart, Target, or Home Depot) and click the extension icon. Use the "Refresh Product Data" button to extract the current product's information.

### Step 2: Navigate to a Search Page

Open a new tab and navigate to a search page on one of the supported marketplaces:
- Amazon: `https://www.amazon.com/s?k=product+name`
- Walmart: `https://www.walmart.com/search?q=product+name`

Replace `product+name` with the name of the product you're trying to match.

### Step 3: Activate Test Mode

1. Click the extension icon to open the popup
2. Go to the "Settings" tab
3. Scroll down to the "Debug Tools" section
4. Click the "Test Match Finder" button

This will launch the Match Finder test mode with a debug panel on the search page.

## Using the Debug Panel

The debug panel provides real-time information about the matching process:

### Matches Tab

This tab shows:
- The source product you're trying to match
- All potential matches found on the page
- Similarity scores for each match
- Product details including price, title, and image

You can click "Highlight in Page" for any match to visually see where it appears on the page.

### Logs Tab

This tab shows detailed log messages from the matching process, including:
- Elements found on the page
- Extraction success or failures
- Similarity calculations
- Timing information

## Troubleshooting Specific Issues

### No Matches Found

If no matches are found, check the following:
- Are there products on the search page that should match?
- Are the selectors working correctly? (Check the logs)
- Is the similarity threshold too high? (Default is 0.7 or 70%)

### Low Similarity Scores

If products are found but similarity scores are low:
- Check if the product titles are significantly different
- Look for discrepancies in brand names
- Consider price differences that may affect scoring

### Selector Issues

If selector issues are suspected:
- Use the "Test Selectors on Current Page" button in Settings
- Check if selectors for the current marketplace need updating

## Advanced Testing

For more advanced testing, the debug panel allows you to:
- Compare different similarity calculation algorithms
- View all extracted product data
- See timing information for performance diagnostics

## Updating Selectors

If you need to update selectors for a marketplace:
1. Navigate to `src/content/matchFinder/core/[marketplaceName]Matcher.ts`
2. Update the selectors in the appropriate methods
3. Reload the extension and test again

## Error Reporting

When reporting issues, include the following information:
- Screenshots of the debug panel
- The source product you're trying to match
- The search page URL
- Any error messages from the Logs tab