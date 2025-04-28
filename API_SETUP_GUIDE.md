# API Setup Guide

This guide explains how to set up the API services for the E-commerce Arbitrage Extension to use real marketplace data.

## Overview

The extension connects to specialized API services to gather product data from different marketplaces. To use this functionality, you'll need to:

1. Sign up for the required API services
2. Configure your API keys
3. Deploy the backend server
4. Update the extension settings

## Required API Services

The extension uses the following API services:

1. **BlueCart API** - For Walmart product data
2. **Rainforest API** - For Amazon product data
3. **BigBox API** - For Target product data (optional)

## Step 1: Sign Up for API Services

### BlueCart API (Walmart Data)

1. Visit [BlueCart API](https://bluecartapi.com) and create an account
2. Choose a subscription plan:
   - Free tier: Limited requests (good for testing)
   - Paid tiers: For regular usage
3. Generate an API key from your dashboard

### Rainforest API (Amazon Data)

1. Visit [Rainforest API](https://rainforestapi.com) and create an account
2. Select a subscription plan:
   - Free tier: ~100 requests for testing
   - Paid tiers: For regular usage
3. Copy your API key from the dashboard

### BigBox API (Target Data)

The Target integration is optional. If you want to include Target data:

1. Visit [BigBox API](https://bigboxapi.com) and create an account (if available)
2. Select an appropriate subscription plan
3. Generate an API key

## Step 2: Configure API Keys

1. Create a `.env` file in the root directory (or copy from `.env.example`):

```
# API Keys for marketplace data services
BLUECART_API_KEY=your_bluecart_key_here
RAINFOREST_API_KEY=your_rainforest_key_here
BIGBOX_API_KEY=your_bigbox_key_here  # Optional

# Server Configuration
PORT=3000
NODE_ENV=development

# Cache Settings
CACHE_TTL=3600  # Time-to-live in seconds (1 hour)
```

2. Replace the placeholder values with your actual API keys

## Step 3: Deploy the Backend Server

The backend server handles API requests and provides caching to minimize API usage.

### Local Development

For local testing:

```bash
# Install dependencies if you haven't already
npm install

# Start the backend server
npm run start:backend
```

The server will run on http://localhost:3000 by default.

### Production Deployment

For production use, you can deploy the server to any Node.js hosting service:

1. **Render.com** (recommended):
   - Connect your GitHub repository
   - Create a new Web Service with the following settings:
     - Build Command: `npm install`
     - Start Command: `node server.js`
   - Add your API keys as environment variables

2. **Heroku**:
   ```bash
   heroku create
   heroku config:set BLUECART_API_KEY=your_key RAINFOREST_API_KEY=your_key
   git push heroku main
   ```

3. **Other providers** (AWS, Digital Ocean, etc.):
   - Follow their documentation for Node.js deployments
   - Make sure to set up the required environment variables

## Step 4: Configure Extension Settings

1. Open the extension
2. Go to the Settings tab
3. Set the "API Base URL" to your deployed server URL (e.g., `https://your-server.onrender.com`)
   - Note: Do not include `/api` in the URL as the extension now handles this automatically
4. Click "Save Settings"

## API Credit Optimization

To minimize API costs:

1. **Use the Caching System**:
   - Adjust the cache duration in Settings based on your needs
   - The default cache expiration is 24 hours

2. **Prioritize UPC/ASIN Searches**:
   - The extension attempts to extract UPC or ASIN from product pages
   - These identifier-based searches are more efficient than text searches

3. **Use Marketplace Selection**:
   - Select a specific marketplace to search instead of all marketplaces
   - This reduces the number of API calls needed

4. **Monitor API Usage**:
   - Check your usage in each API service's dashboard

## Troubleshooting

If you encounter issues with API connections:

1. **Check API Key Validity**:
   - Verify that your API keys are correctly entered in the `.env` file
   - Ensure your subscription is active

2. **Test the API Server**:
   - Visit `https://your-server.com/api/health` to check server status
   - Try `https://your-server.com/api/test` to verify API functionality

3. **Server Connectivity**:
   - Check for CORS issues (the server includes CORS middleware)
   - Verify that your extension has permission to access the API domain

4. **Verify Extension Settings**:
   - Make sure the API Base URL in the extension settings is correct
   - Clear the cache to ensure you're making fresh requests
