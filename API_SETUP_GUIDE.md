# API Setup Guide for E-commerce Arbitrage Extension

This guide explains how to set up the API services for the E-commerce Arbitrage Extension. Note that **the extension will work with mock data without any API setup**, so you can use it immediately for testing and demonstration purposes.

## Mock Data Mode

By default, the extension is configured to use mock data instead of making real API calls. This means:

- No API keys are required for basic functionality
- Price comparisons will be simulated based on the source product
- You can test the extension without setting up a backend server

If you want to use real data from the APIs, follow the steps below to configure the necessary services and API keys.

## TrajectData API Services Overview

The extension uses the following API services from TrajectData for real data mode:

1. **BlueCart API** - For Walmart product data
2. **Rainforest API** - For Amazon product data 
3. **BigBox API** - For Target product data (if available)

## Step 1: BlueCart API Setup (Walmart Data)

### Registration Process
1. Visit [BlueCart API](https://bluecartapi.com) and click on "Sign Up" or "Get Started"
2. Create an account using your email address
3. Select a pricing plan based on your expected usage:
   - Free tier: Limited requests (good for testing)
   - Basic tier: Suitable for moderate usage
   - Pro/Enterprise: For high-volume usage

### Obtaining Your API Key
1. After registration, log in to your BlueCart dashboard
2. Navigate to "API Keys" or "Account Settings"
3. Generate a new API key if one isn't already created
4. Copy the API key to your clipboard

### Pricing Considerations
- BlueCart typically charges per request
- Consider starting with the smallest plan and upgrading as needed
- Most plans offer around 1,000 requests for $20-30/month
- If you're planning high-volume usage, contact their sales team for custom pricing

## Step 2: Rainforest API Setup (Amazon Data)

### Registration Process
1. Visit [Rainforest API](https://rainforestapi.com) and click on "Sign Up"
2. Create an account with your email address
3. Choose a subscription plan:
   - Free tier: Usually offers ~100 requests for testing
   - Standard/Business tiers: For regular usage

### Obtaining Your API Key
1. After signing up, go to your Rainforest API dashboard
2. Look for "API Keys" or "Dashboard" section
3. Create a new API key if needed
4. Copy the generated API key

### Pricing Considerations
- Rainforest typically has a credit-based pricing model
- Different request types cost different amounts of credits
- Product search requests usually cost 1 credit
- Detailed product lookups may cost 2-3 credits
- Monitor your usage to avoid unexpected charges

## Step 3: BigBox API Setup (Target Data)

### Registration Process
1. Visit [BigBox API](https://bigboxapi.com) (if available) or the TrajectData website
2. Follow the sign-up process
3. Select an appropriate subscription plan

### Obtaining Your API Key
1. Log in to your BigBox API account
2. Navigate to the API key section
3. Generate a new key
4. Copy the key to your clipboard

### Pricing Considerations
- Target data may be more expensive than other marketplaces
- If budget is a concern, you can start by implementing only Amazon and Walmart
- Add Target integration later as your arbitrage business grows

## Step 4: Configure Your Extension for Real API Usage

1. In your project directory, open the `.env` file
2. Add your API keys to the corresponding variables:
   ```
   BLUECART_API_KEY=your_bluecart_api_key_here
   RAINFOREST_API_KEY=your_rainforest_api_key_here
   BIGBOX_API_KEY=your_bigbox_api_key_here
   ```
3. Save the file

4. Open `src/background.ts` and update the following setting:
   ```javascript
   // Change this
   const useMockData = true;
   
   // To this
   const useMockData = false;
   ```

5. Rebuild the extension:
   ```
   npm run build
   ```

6. Start the backend server:
   ```
   npm run start:backend
   ```

## API Credit Optimization Tips

### General Best Practices
1. **Use Caching Effectively**
   - The default cache expiration is 24 hours, which works well for most products
   - For products with volatile pricing, you may want to reduce this to 12 hours
   - For stable products, consider increasing to 48-72 hours

2. **Prioritize Identifier-Based Searches**
   - Searches by UPC or ASIN are more efficient than text-based searches
   - Make sure your content scripts properly extract these identifiers

3. **Batch Your Research**
   - Research similar products in one session to maximize cache hits
   - Research categories of products methodically to improve efficiency

### By Marketplace
1. **Amazon (Rainforest API)**
   - Product detail requests cost more than search requests
   - When possible, extract information from search results instead of detailed lookups

2. **Walmart (BlueCart API)**
   - Search by UPC whenever available for most accurate results
   - Avoid broad category searches which consume more credits

3. **Target (BigBox API)**
   - If implementing Target integration, prioritize high-margin products only
   - Target's product details can be expensive to query

## Monitoring and Managing API Usage

1. Each API service provides a dashboard to monitor your usage
2. Set up budget alerts if available
3. The extension automatically tracks cache hit rates, which you can view in browser console logs
4. Consider implementing a usage logging system in the backend for better tracking

## Troubleshooting API Issues

If you encounter issues with the API connections:

1. **Check API Key Validity**
   - Ensure your API keys are correctly entered in the `.env` file
   - Verify that your subscription is active and has available credits

2. **Network Connectivity**
   - Make sure your server can connect to the API endpoints
   - Check for any firewall or proxy settings that might block the connections

3. **Rate Limiting**
   - Most APIs have rate limits - check if you're hitting these limits
   - Implement request throttling or backoff strategies if necessary

4. **Fallback to Mock Data**
   - If API issues persist, you can temporarily switch back to mock data mode

By following these guidelines, you'll be able to effectively set up and use the API services for the E-commerce Arbitrage Extension.
