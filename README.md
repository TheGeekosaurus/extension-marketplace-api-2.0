# E-commerce Arbitrage Assistant

A Chrome extension for e-commerce arbitrage that helps users compare product prices between marketplaces (Amazon, Walmart, Target) to identify potential profit opportunities.

## Features

- Extracts product information from current page (Amazon, Walmart, or Target)
- Uses mock data to simulate API calls when backend services are unavailable
- Shows price comparisons and potential profit margins
- Caches previously matched products to minimize API usage
- Customizable settings for profit calculation and marketplace fees

## Project Structure

```
ecommerce-arbitrage-extension/
├── dist/                      # Build output folder
├── public/                    # Static assets
│   ├── icons/                 # Extension icons
│   └── manifest.json          # Chrome extension manifest
├── src/                       # Source code
│   ├── popup/                 # Popup UI components
│   │   ├── index.tsx          # Popup entry point
│   │   ├── Popup.tsx          # Main popup component
│   │   ├── Popup.css          # Popup styles
│   │   └── popup.html         # Popup HTML template
│   ├── background.ts          # Background script
│   └── contentScript.ts       # Content script for product data extraction
├── server.js                  # Backend server for API integration
├── .env                       # Environment variables configuration
├── package.json               # npm dependencies and scripts
├── tsconfig.json              # TypeScript configuration
└── webpack.config.js          # Webpack configuration
```

## Setup Instructions

### 1. Prerequisites

- Node.js (v16 or newer)
- npm (v8 or newer)
- Chrome browser

### 2. Clone and Install Dependencies

```bash
git clone <repository-url>
cd ecommerce-arbitrage-extension
npm install
```

### 3. Configure API Keys

1. Sign up for TrajectData API services (optional, extension will work with mock data):
   - BlueCart API for Walmart data: [https://bluecartapi.com](https://bluecartapi.com)
   - Rainforest API for Amazon data: [https://rainforestapi.com](https://rainforestapi.com)
   - BigBox API for Target data (if available): [https://bigboxapi.com](https://bigboxapi.com)

2. Copy the `.env.example` file to `.env` and add your API keys:

```bash
cp .env.example .env
# Edit the .env file with your API keys
```

### 4. Build the Extension

```bash
# Build the extension
npm run build

# Or for development with watch mode
npm run watch:extension
```

### 5. Load the Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in the top-right corner)
3. Click "Load unpacked" and select the `dist` folder from your project
4. The extension should now be installed and visible in your browser toolbar

## Using the Extension

1. Navigate to a product page on Amazon, Walmart, or Target
2. Click on the extension icon in your browser toolbar
3. The extension will automatically attempt to extract product data
4. If no data is detected, click the "Refresh Product Data" button
5. Once product data is loaded, click "Find Arbitrage Opportunities" to see potential profit opportunities
6. Use the Settings tab to configure profit margins, marketplace fees, and other preferences

## Troubleshooting

If the extension doesn't work as expected:

1. Make sure you're on a product detail page, not a search results or category page
2. Click the "Refresh Product Data" button to manually trigger data extraction
3. Check the browser console for logs (F12 > Console) - look for logs with the prefix `[E-commerce Arbitrage]`
4. If you encounter a "Communication error", try reloading the page
5. For product pages with unusual layouts, try different products or marketplaces

## Mock Data Implementation

The extension includes a mock data feature that simulates API responses when the backend services are unavailable. This allows for testing and demonstration without requiring actual API keys or backend server setup.

To disable mock data and use real API calls:

1. Go to `src/background.ts`
2. Find the line `const useMockData = true;`
3. Change it to `const useMockData = false;`
4. Rebuild the extension

## Supported Product Types

The extension has been tested with various product types including:

- Pet supplies (e.g., dog nail grinders, pet clippers)
- Household goods (e.g., vacuum cleaners)
- Beauty products (e.g., body scrubs)
- Grocery items (e.g., laundry detergent)

It may work with other product categories as well, but extraction success depends on the specific structure of the product page.

## License

MIT
