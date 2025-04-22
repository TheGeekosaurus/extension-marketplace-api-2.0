# E-commerce Arbitrage Assistant

A Chrome extension for e-commerce arbitrage that helps users compare product prices between marketplaces (Amazon, Walmart, Target) using TrajectData's API services.

## Features

- Extracts product information from current page (Amazon, Walmart, or Target)
- Uses TrajectData APIs (BlueCart, Rainforest, BigBox) to find matching products on other marketplaces
- Shows price comparisons and potential profit margins
- Caches previously matched products to minimize API usage
- Customizable settings for profit calculation and API usage

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

1. Sign up for TrajectData API services:
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

### 5. Start the Backend Server

```bash
# Start the server
npm run start:backend
```

### 6. Load the Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in the top-right corner)
3. Click "Load unpacked" and select the `dist` folder from your project
4. The extension should now be installed and visible in your browser toolbar

## API Usage and Optimization

### API Credit Conservation Strategies

1. **Caching Mechanism**: 
   - The extension implements a two-layer cache:
     - Backend server cache (1-hour TTL by default)
     - Chrome storage cache (24-hour TTL by default, configurable in settings)
   - This minimizes redundant API calls for frequently viewed products

2. **On-Demand API Calling**:
   - API calls are only made when a user explicitly requests a comparison
   - No automatic background queries or periodic refreshes

3. **Efficient Product Matching**:
   - Uses unique identifiers (UPC, ASIN) when available for precise matching
   - Falls back to title and brand-based fuzzy matching only when necessary

4. **Prioritized Search Parameters**:
   - First tries searching by specific product identifiers (most efficient)
   - Only uses text-based search as a fallback

### Obtaining and Configuring API Keys

#### BlueCart API (Walmart)

1. Sign up at [https://bluecartapi.com](https://bluecartapi.com)
2. Choose a subscription plan based on your expected usage
3. Generate an API key from your dashboard
4. Add the key to your `.env` file as `BLUECART_API_KEY`

#### Rainforest API (Amazon)

1. Sign up at [https://rainforestapi.com](https://rainforestapi.com)
2. Select a subscription plan based on your needs
3. Generate an API key from your account settings
4. Add the key to your `.env` file as `RAINFOREST_API_KEY`

#### BigBox API (Target)

1. Sign up at [https://bigboxapi.com](https://bigboxapi.com) (if available)
2. Choose a subscription plan
3. Generate an API key
4. Add the key to your `.env` file as `BIGBOX_API_KEY`

## Product Matching Algorithm

The product matching algorithm works as follows:

1. **Identifier-Based Matching (Primary Method)**:
   - For Amazon products: Use ASIN for direct lookups
   - For Walmart/Target products: Use UPC for direct lookups
   - This provides the most accurate matches when identifiers are available

2. **Text-Based Matching (Fallback Method)**:
   - When identifiers aren't available, combine brand and product title
   - Use this combined string as a search query
   - This method is less precise but provides good results for most products

3. **Result Filtering and Ranking**:
   - Results are ranked by relevance (when using text search)
   - Profitable items are highlighted based on user-defined minimum profit percentage
   - Items with ratings are prioritized in the display

## Deployment and Maintenance

### Backend Server Deployment

For production deployment, consider:

1. **Hosting Options**:
   - Heroku: Simple deployment with automatic scaling
   - AWS EC2: More control and potentially lower costs for high volume
   - Vercel/Netlify: Good for serverless deployment

2. **Environment Configuration**:
   - Set up proper environment variables on your hosting platform
   - Consider using a higher caching TTL in production to reduce API calls

3. **Monitoring**:
   - Implement request logging to monitor API usage
   - Set up alerts for API limit thresholds

### Extension Updates

To update the extension:

1. Make code changes
2. Increment version number in `manifest.json`
3. Rebuild using `npm run build`
4. For personal use: reload the extension in Chrome
5. For distribution: package the `dist` folder for the Chrome Web Store

### Maintenance Best Practices

1. **Regular API Monitoring**:
   - Check API credit usage regularly
   - Adjust caching parameters if needed

2. **Error Handling**:
   - The extension includes comprehensive error handling
   - Monitor for recurring errors which may indicate API changes

3. **Selectors Maintenance**:
   - E-commerce sites frequently update their HTML structure
   - Periodically verify that content script selectors still work
   - Update extraction logic when site layouts change

## License

MIT
