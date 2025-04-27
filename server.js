// Multi-marketplace search for a given product
apiRouter.post('/search/multi', async (req, res) => {
  try {
    console.log('Multi-marketplace search called with:', req.body);
    const { 
      source_marketplace, // Where the product was found (amazon, walmart, target)
      product_id, // UPC, ASIN, or other product identifier
      product_title, // Product title for fuzzy matching if IDs fail
      product_brand, // Brand name for improved matching
      selected_marketplace // The marketplace selected in the settings (if any)
    } = req.body;
    
    // Generate unique cache key for this request
    const marketplaceSuffix = selected_marketplace ? `-${selected_marketplace}` : '';
    const cacheKey = `multi-${source_marketplace}-${product_id}-${product_title?.substring(0, 20)}${marketplaceSuffix}`;
    
    // Check cache first
    const cachedResult = productCache.get(cacheKey);
    if (cachedResult) {
      console.log('Serving cached multi-marketplace result for:', cacheKey);
      return res.json({ source: 'cache', data: cachedResult });
    }
    
    // Determine which marketplaces to search (all except source)
    let marketplaces = ['amazon', 'walmart', 'target'].filter(
      marketplace => marketplace !== source_marketplace
    );
    
    // If a specific marketplace is selected, only search that one
    if (selected_marketplace) {
      // Make sure the selected marketplace is not the source marketplace
      if (selected_marketplace !== source_marketplace) {
        marketplaces = [selected_marketplace];
      } else {
        marketplaces = []; // No marketplaces to search when selected is the same as source
      }
    }
    
    console.log('Searching these marketplaces:', marketplaces);
    
    const results = {};
    
    // Execute searches in parallel
    await Promise.all(marketplaces.map(async (marketplace) => {
      try {
        console.log(`Searching ${marketplace} for product match`);
        // Construct the search request based on marketplace and available identifiers
        const searchParams = { 
          query: `${product_brand || ''} ${product_title}`.trim()
        };
        
        // Add specific identifiers if available
        if (product_id) {
          if (marketplace === 'amazon' && source_marketplace === 'amazon') {
            searchParams.asin = product_id;
            console.log('Using ASIN for Amazon search:', product_id);
          } else if ((['walmart', 'target'].includes(marketplace)) && 
                    product_id.length === 12 && /^\d+$/.test(product_id)) {
            searchParams.upc = product_id;
            console.log('Using UPC for search:', product_id);
          } else {
            console.log('Product ID not usable as UPC/ASIN, using text search');
          }
        }
        
        // Call the appropriate endpoint for this marketplace
        const endpointPath = `/search/${marketplace}`;
        
        console.log(`Making internal API request to: ${endpointPath}`, searchParams);
        
        // Use the current Express app to handle the request directly
        const response = await axios.post(
          `http://localhost:${PORT}/api${endpointPath}`,
          searchParams
        );
        
        console.log(`Got ${marketplace} search response:`, response.status);
        results[marketplace] = response.data.data || [];
      } catch (error) {
        console.error(`Multi-search ${marketplace} error:`, error.message);
        results[marketplace] = { error: error.message };
      }
    }));
    
    console.log('Got search results:', Object.keys(results));
    
    // Cache the result
    productCache.set(cacheKey, results);
    
    res.json({
      source: 'api',
      data: results
    });
  } catch (error) {
    console.error('Multi-marketplace search error:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch multi-marketplace data', 
      message: error.message 
    });
  }
});
