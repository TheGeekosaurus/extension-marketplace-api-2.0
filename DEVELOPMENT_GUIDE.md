# Development Guide

This guide provides detailed information for developers who want to understand, modify, or extend the E-commerce Arbitrage Extension.

## Technology Stack

The extension is built with:

- **TypeScript**: For type safety and better code organization
- **React**: For the popup UI
- **Zustand**: For state management
- **Webpack**: For bundling
- **Express**: For the backend server

## Setup Development Environment

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development build with watch mode:
   ```bash
   npm run watch:extension
   ```
4. Load the extension in Chrome:
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `dist` folder

## Project Structure

### Content Scripts

Located in `src/content/`, these scripts run on the marketplace websites to extract product data:

- `extractors/`: Site-specific extraction logic
- `selectors/`: DOM selectors for each marketplace
- `utils/`: Shared extraction utilities

The main content script (`src/content/index.ts`) determines which marketplace the user is on and runs the appropriate extractor.

### Background Script

Located in `src/background/`, the background script handles:

- Processing extracted product data
- API communication
- Caching
- State management

Key components:

- `api/`: API client implementations
- `services/`: Business logic
  - `cacheService.ts`: Manages caching of data
  - `profitService.ts`: Calculates profit margins
  - `settingsService.ts`: Manages user settings
- `utils/`: Utility functions

### Popup UI

Located in `src/popup/`, the React-based UI consists of:

- `components/`: Reusable UI components
- `state/`: State management using Zustand
- `views/`: Main view components
  - `ComparisonView.tsx`: Shows product comparisons
  - `SettingsView.tsx`: User settings interface

### Types

Located in `src/types/`, these provide type definitions for:

- `product.ts`: Product data structures
- `marketplace.ts`: Marketplace-related types
- `settings.ts`: User settings
- `api.ts`: API request/response types

### Backend Server

Located in `server.js`, the Express server provides:

- API endpoints for marketplace data
- Caching layer
- Rate limiting
- Error handling

## Key Workflows

### Product Data Extraction

1. Content script runs when a supported marketplace page loads
2. Determines the marketplace (Amazon, Walmart, Target)
3. Runs the appropriate extractor
4. Sends the extracted data to the background script
5. Background script stores the data in local storage

### Price Comparison

1. User clicks "Find Arbitrage Opportunities" in the popup
2. Popup sends request to background script
3. Background script checks cache for existing comparison data
4. If not in cache:
   - Makes API requests to find matches
5. Calculates profit margins for each match
6. Returns results to popup for display

### Settings Management

1. User changes settings in the popup
2. Settings are saved to chrome.storage
3. Background script uses settings for:
   - Fee calculations
   - API endpoints
   - Cache duration
   - Minimum profit threshold

## Adding a New Marketplace

To add support for a new marketplace:

1. Create a new extractor in `src/content/extractors/`
2. Add selectors in `src/content/selectors/`
3. Update `MarketplaceType` in `src/types/marketplace.ts`
4. Modify the content script to detect the new marketplace
5. Add API client for the marketplace
6. Update the fee settings for the new marketplace

Example for a new marketplace called "ShopMart":

```typescript
// 1. Add to MarketplaceType in src/types/marketplace.ts
export type MarketplaceType = 'amazon' | 'walmart' | 'target' | 'shopmart';

// 2. Create selectors in src/content/selectors/shopmart.ts
export const shopmartSelectors = {
  title: ['h1.product-title', '.pdp-title'],
  price: ['.price-current', '.product-price'],
  // ...
};

// 3. Create extractor in src/content/extractors/shopmart.ts
export function extractShopmartProductData(): ProductData | null {
  // Extraction logic here
}

// 4. Update content script to detect the new marketplace
if (url.includes('shopmart.com')) {
  return extractShopmartProductData();
}
```

## Debugging Tips

### Content Script

- Use `console.log` statements with the prefix `[E-commerce Arbitrage]`
- Check the browser console on the marketplace page
- Test extraction with different product pages

### Background Script

- Logs are visible in the extension's background page console
- Access via chrome://extensions > "background page" under the extension

### Popup

- Use React DevTools for component debugging
- State is managed by Zustand and can be inspected

### API Integration

- Use the `/api/test` endpoint to verify API connectivity
- Check network requests in the browser's Network tab
- Verify API keys and authentication

## Building for Production

1. Ensure all tests pass
2. Update version in `manifest.json` and `package.json`
3. Build the production version:
   ```bash
   npm run build
   ```
4. The extension package will be in the `dist` directory
5. Deploy the backend server if using API mode

## Best Practices

1. **DOM Selectors**: Use multiple selector alternatives for resilience against site changes
2. **Error Handling**: Implement proper error handling throughout the codebase
3. **Caching**: Optimize cache usage to reduce API calls
4. **Type Safety**: Maintain strict TypeScript type checking
5. **Code Organization**: Keep functionality modular and well-separated
6. **Performance**: Be mindful of performance in content scripts
7. **Testing**: Test on different product pages and marketplaces
