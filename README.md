# E-commerce Arbitrage Assistant

A Chrome extension that helps e-commerce arbitrage sellers identify profit opportunities by comparing product prices between Amazon, Walmart, and Target.

## Features

- **Automatic Product Detection**: Extracts product data from current page on supported marketplaces
- **Price Comparison**: Shows potential profit margins across marketplaces
- **Live API Integration**: Connects to marketplace data APIs to find matching products
- **Marketplace Selection**: Filter searches to focus on a specific marketplace
- **Profit Calculation**: Configurable fee settings and minimum profit filters
- **Caching System**: Minimizes API usage and improves performance

## Installation

### Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/ecommerce-arbitrage-extension.git
   cd ecommerce-arbitrage-extension
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run build
   ```

4. Load the extension in Chrome:
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `dist` folder from your project

### Production Build

For deployment to Chrome Web Store:

```bash
npm run build
# The extension package will be created in the dist folder
```

## Usage

1. Navigate to a product page on a supported marketplace (Amazon, Walmart, or Target)
2. Click the extension icon in your browser toolbar
3. The extension automatically extracts product data from the current page
4. Click "Find Arbitrage Opportunities" to see potential profit opportunities
5. Use the Settings tab to configure your preferences

### Supported Product Types

The extension has been tested with various product categories including:

- Pet supplies (dog nail grinders, pet clippers)
- Household goods (vacuum cleaners, kitchen appliances)
- Beauty products (body scrubs, skin care)
- Grocery items (laundry detergent, packaged foods)
- Electronics (cables, phone accessories)

## Configuration

### API Mode

The extension uses dedicated API services to search for products across marketplaces. To use it, you need to:

1. Sign up for the required API services
2. Configure your API keys
3. Deploy the backend server
4. Update the extension settings

See [API_SETUP_GUIDE.md](API_SETUP_GUIDE.md) for detailed instructions.

## Architecture

The extension consists of several main components:

- **Content Scripts**: Extract product data from marketplace pages
- **Background Script**: Manages data processing and API communication
- **Popup UI**: React-based interface for user interaction
- **Backend Server**: Express server for API integration

## Project Structure

```
ecommerce-arbitrage-extension/
├── dist/                      # Build output folder
├── public/                    # Static assets
├── src/
│   ├── background/            # Background script components
│   │   ├── api/               # API service integrations
│   │   ├── services/          # Business logic services
│   │   └── utils/             # Utility functions
│   ├── content/               # Content scripts
│   │   ├── extractors/        # Site-specific data extractors
│   │   ├── selectors/         # DOM selectors for extraction
│   │   └── utils/             # Extraction utilities
│   ├── popup/                 # Popup UI components
│   │   ├── components/        # Reusable UI components
│   │   ├── state/             # State management
│   │   ├── views/             # Main view components
│   │   └── index.tsx          # Popup entry point
│   ├── common/                # Shared code
│   └── types/                 # TypeScript type definitions
├── server.js                  # Backend server for API integration
└── docs/                      # Documentation files
```

## Development

### Available Scripts

- `npm run build`: Build the extension for production
- `npm run watch:extension`: Build with watch mode for development
- `npm run start:backend`: Start the backend server for API integration

### Adding Support for New Marketplaces

To add support for a new marketplace:

1. Create a new extractor in `src/content/extractors/`
2. Add selectors in `src/content/selectors/`
3. Update the marketplace types in `src/types/marketplace.ts`
4. Modify the content script to detect the new marketplace

## Deployment

### Extension

Build the extension package:

```bash
npm run build
```

Then upload the contents of the `dist` directory to the Chrome Web Store.

### Backend Server

The backend server can be deployed to any Node.js hosting service:

```bash
# Example using render.com
npm run build
# Follow your hosting service's deployment instructions
```

## License

MIT
