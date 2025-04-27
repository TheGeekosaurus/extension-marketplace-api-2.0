# Features Guide

This document provides a comprehensive overview of the E-commerce Arbitrage Extension's features and capabilities.

## Core Features

### Product Data Extraction

The extension automatically extracts product information from supported marketplaces:

- **Amazon**: ASIN, title, price, brand, image URL
- **Walmart**: Product ID, UPC, title, price, brand, image URL
- **Target**: TCIN, UPC, title, price, brand, image URL

Extraction happens automatically when visiting a product page and can be manually triggered with the "Refresh Product Data" button.

### Price Comparison

After extracting product data, the extension searches for identical products on other marketplaces:

- Shows potential profit amount and percentage
- Takes into account marketplace fees (customizable)
- Displays product ratings and review counts
- Provides direct links to matching products

### API Integration

The extension connects to specialized marketplace APIs for accurate product matching:

- Uses UPC/EAN for precise matching when available
- Falls back to brand and title matching
- Caches results to minimize API usage

### Settings Customization

The Settings tab allows you to configure:

- **API Base URL**: For connecting to your backend service
- **Cache Expiration**: Control how long product data is cached
- **Minimum Profit Percentage**: Filter opportunities by profit threshold
- **Marketplace Fees**: Customize fee percentages for each marketplace

## User Interface

### Comparison Tab

The main tab provides:

1. **Current Product Section**:
   - Shows details of the product on the current page
   - Product title and image
   - Price and marketplace information
   - ASIN/UPC and brand when available

2. **Action Buttons**:
   - "Refresh Product Data": Manually triggers data extraction
   - "Find Arbitrage Opportunities": Searches for matches

3. **Status Messages**:
   - Success and error notifications
   - Loading indicators
   - Cache status information

4. **Arbitrage Opportunities**:
   - Grouped by marketplace (Amazon, Walmart, Target)
   - Shows profit calculations highlighted in green (positive) or red (negative)
   - Direct links to view matched products
   - Total potential profit summary

### Settings Tab

The settings interface allows customization of:

1. **API Settings**:
   - Configure backend API URL

2. **Cache Settings**:
   - Control cache duration (in hours)
   - Option to clear cached data

3. **Arbitrage Settings**:
   - Minimum profit percentage filter
   - Option to include estimated marketplace fees

4. **Marketplace Fees**:
   - Customize fee percentages for Amazon, Walmart, and Target
   - Affects profit calculations

## Technical Features

### Intelligent Product Matching

The extension uses a sophisticated matching algorithm:

- UPC/EAN-based matching for highest accuracy
- Brand and title matching as fallback
- Price reasonability checks
- Category-specific price patterns

### Multi-Level Caching

To improve performance and reduce API usage:

1. **Chrome Storage Cache**:
   - Persists across browser sessions
   - Configurable expiration time
   - Stores complete comparison results

2. **Memory Cache**:
   - Fast access for current session
   - Cleared when the browser is closed

### DOM Resilience

The content scripts use multiple selector strategies:

- Primary, secondary, and fallback selectors for each element
- Regular expression patterns for URL and text extraction
- Robust error handling for site changes

### Category Detection

The extension can detect product categories from titles:

- Pet supplies
- Household goods
- Beauty products
- Grocery items
- Electronics

This enables more accurate matching with the API.

## Efficiency Features

### Smart API Usage

The extension optimizes API calls:

- Prioritizes identifier-based searches (UPC, ASIN)
- Uses caching to minimize redundant requests
- Implements backoff strategies for rate limiting
- Handles API failures gracefully

### Cache Management

The caching system includes:

- Automatic expiration based on configurable TTL
- Manual cache clearing option
- Status indicators for cache hits/misses
- Separate cache keys for different product identifiers

### Performance Optimization

The extension is designed for efficient operation:

- Minimal DOM manipulation in content scripts
- Asynchronous message passing between components
- Lazy loading of comparison data
- Efficient state management with Zustand

## Browser Integration

### Chrome Sync

Settings are stored in Chrome's local storage:

- Persist across browser restarts
- Can be manually cleared if needed

### Permission Model

The extension uses minimal permissions:

- `activeTab`: Access to the current tab only
- `storage`: For saving settings and cache
- `scripting`: For content script injection
- Host permissions only for supported marketplaces

## Future Features

Planned enhancements for upcoming versions:

1. **Additional Marketplaces**:
   - eBay integration
   - Best Buy support
   - International marketplace options

2. **Enhanced Matching**:
   - Image similarity analysis
   - Machine learning-based matching
   - User feedback integration

3. **Advanced Analytics**:
   - Historical price tracking
   - Profit trend analysis
   - Category performance insights

4. **Export Capabilities**:
   - CSV export of opportunities
   - Batch processing of product lists
   - Reporting features

5. **Mobile Companion**:
   - Barcode scanning in stores
   - Real-time opportunity checking
   - Sync with desktop extension
