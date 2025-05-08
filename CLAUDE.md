# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

E-commerce Arbitrage Assistant is a Chrome extension that helps sellers identify profitable arbitrage opportunities by comparing product prices across Amazon, Walmart, Target, and Home Depot. The extension extracts product data from marketplace pages and uses API services to find matching products and calculate potential profits.

## Build and Run Commands

```bash
# Install dependencies
npm install

# Build for development with watch mode
npm run watch:extension

# Start the backend API server (development)
npm run start:backend

# Build extension for production
npm run build

# Start backend server in production mode
npm run start:backend:prod
```

## Project Architecture

The extension consists of four main components:

1. **Content Scripts** (`src/content/`): Run on marketplace websites to extract product data using DOM selectors
   - Site-specific extractors in `src/content/extractors/`
   - DOM selectors in `src/content/selectors/`
   - Match finding tools for search pages in `src/content/matchFinder/`

2. **Background Script** (`src/background/`): Manages data processing and API communication
   - API clients in `src/background/api/`
   - Business logic services in `src/background/services/`
   - Utilities in `src/background/utils/`

3. **Popup UI** (`src/popup/`): React-based user interface
   - Displays product data and comparison results
   - Provides settings configuration
   - Shows arbitrage opportunities
   - Uses Zustand for state management

4. **Backend Server** (`server/`): Express.js server for API integration
   - Routes for different marketplaces
   - Middleware for caching, error handling, and logging
   - Services for marketplace data retrieval
   - Utility functions for product matching and scoring

## Environment Setup

The extension requires a `.env` file with API keys for the marketplace data services:

```
BLUECART_API_KEY=your_key_here
RAINFOREST_API_KEY=your_key_here
PORT=3000
NODE_ENV=development
CACHE_TTL=3600
```

## Key Development Workflows

### Adding a New Marketplace

1. Create a new extractor in `src/content/extractors/`
2. Add selectors in `src/content/selectors/`
3. Update marketplace types in `src/types/marketplace.ts`
4. Add API client in `src/background/api/`
5. Add server routes and services as needed

### Updating Selectors

When a marketplace updates its DOM structure:
1. Use the built-in Selector Tester (via Settings tab)
2. Update selectors in `src/content/selectors/`
3. Test across multiple product pages

### Testing and Debugging

- Use Chrome DevTools for content script and background script debugging
- Server logs for API issues
- Built-in selector testing tools for DOM extraction validation

## Browser Extension Features

- Multiple marketplace support (Amazon, Walmart, Target, Home Depot)
- Automatic product detection on marketplace pages
- Price comparison and profit calculation
- Customizable fee settings and profit thresholds
- Caching system to minimize API usage