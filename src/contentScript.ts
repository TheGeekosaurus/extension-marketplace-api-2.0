// contentScript.ts - Extracts product data from current page
// Add visual debugging banner
function createDebugBanner() {
  const banner = document.createElement('div');
  banner.id = 'e-commerce-arbitrage-debug-banner';
  banner.style.position = 'fixed';
  banner.style.top = '0';
  banner.style.left = '0';
  banner.style.width = '100%';
  banner.style.padding = '10px';
  banner.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
  banner.style.color = 'white';
  banner.style.fontFamily = 'Arial, sans-serif';
  banner.style.fontSize = '14px';
  banner.style.zIndex = '999999';
  banner.style.textAlign = 'center';
  banner.style.display = 'none'; // Initially hidden
  document.body.appendChild(banner);
  return banner;
}

// Log to both console and banner
function debugLog(message: string, isError = false) {
  console.log(`[E-commerce Arbitrage] ${message}`);
  
  const banner = document.getElementById('e-commerce-arbitrage-debug-banner') || createDebugBanner();
  banner.textContent = message;
  banner.style.display = 'block';
  banner.style.backgroundColor = isError ? 'rgba(255, 0, 0, 0.8)' : 'rgba(0, 128, 0, 0.8)';
  
  // Hide after 10 seconds
  setTimeout(() => {
    banner.style.display = 'none';
  }, 10000);
}

// Normal interface definitions
interface ProductData {
  title: string;
  price: number | null;
  marketplace: string;
  productId: string;
  brand: string | null;
  upc: string | null;
  asin: string | null;
  imageUrl: string | null;
  pageUrl: string;
}

// Main function to extract product data based on current page
function extractProductData(): ProductData | null {
  const url = window.location.href;
  debugLog(`Attempting to extract product data from: ${url}`);
  
  // Determine which marketplace we're on
  if (url.includes('amazon.com')) {
    debugLog('Detected Amazon marketplace');
    return extractAmazonProductData();
  } else if (url.includes('walmart.com')) {
    debugLog('Detected Walmart marketplace');
    return extractWalmartProductData();
  } else if (url.includes('target.com')) {
    debugLog('Detected Target marketplace');
    return extractTargetProductData();
  }
  
  debugLog('Unknown marketplace or not a product page', true);
  return null;
}

// Extract product data from Amazon product page
function extractAmazonProductData(): ProductData | null {
  try {
    debugLog('Starting Amazon product extraction');
    
    // Extract ASIN from URL
    const url = window.location.href;
    const asinMatch = url.match(/\/dp\/([A-Z0-9]{10})/) || url.match(/\/gp\/product\/([A-Z0-9]{10})/);
    const asin = asinMatch ? asinMatch[1] : null;
    
    debugLog(`ASIN extraction: ${asin || 'Not found'}`);
    
    if (!asin) {
      debugLog('No ASIN found in URL - is this a product page?', true);
      return null;
    }
    
    // Extract product title
    const titleElement = document.getElementById('productTitle');
    debugLog(`Title element found: ${titleElement ? 'Yes' : 'No'}`);
    
    const title = titleElement ? titleElement.textContent?.trim() || 'Unknown Product' : 'Unknown Product';
    debugLog(`Title: ${title.substring(0, 30)}...`);
    
    // Extract product price
    const priceElement = document.querySelector('.a-price .a-offscreen');
    debugLog(`Price element found: ${priceElement ? 'Yes' : 'No'}`);
    
    let price: number | null = null;
    
    if (priceElement && priceElement.textContent) {
      const priceText = priceElement.textContent.trim();
      // Remove currency symbol and convert to number
      price = parseFloat(priceText.replace(/[^0-9.]/g, ''));
      debugLog(`Price: ${price}`);
    } else {
      // Try alternative price selectors
      const altPriceElement = document.querySelector('#priceblock_ourprice, #priceblock_dealprice, .price-large');
      debugLog(`Alternative price element found: ${altPriceElement ? 'Yes' : 'No'}`);
      
      if (altPriceElement && altPriceElement.textContent) {
        const priceText = altPriceElement.textContent.trim();
        price = parseFloat(priceText.replace(/[^0-9.]/g, ''));
        debugLog(`Alternative price: ${price}`);
      } else {
        debugLog('No price found', true);
      }
    }
    
    // Extract brand
    const brandElement = document.querySelector('#bylineInfo, .a-link-normal.contributorNameID');
    debugLog(`Brand element found: ${brandElement ? 'Yes' : 'No'}`);
    
    const brand = brandElement ? brandElement.textContent?.trim().replace('Brand: ', '') || null : null;
    debugLog(`Brand: ${brand || 'Not found'}`);
    
    // Try to find UPC/EAN in product details
    let upc: string | null = null;
    const detailRows = document.querySelectorAll('.prodDetTable tr, .detail-bullet-list span');
    
    detailRows.forEach(row => {
      const text = row.textContent?.toLowerCase() || '';
      if (text.includes('upc') || text.includes('ean') || text.includes('gtin')) {
        const match = text.match(/\d{12,13}/);
        if (match) {
          upc = match[0];
          debugLog(`UPC/EAN found: ${upc}`);
        }
      }
    });
    
    // Get main product image
    const imageElement = document.getElementById('landingImage') || document.getElementById('imgBlkFront');
    debugLog(`Image element found: ${imageElement ? 'Yes' : 'No'}`);
    
    const imageUrl = imageElement ? (imageElement as HTMLImageElement).src : null;
    
    // Build the product data object
    const productData: ProductData = {
      title: title,
      price,
      marketplace: 'amazon',
      productId: asin,
      brand,
      upc,
      asin,
      imageUrl,
      pageUrl: window.location.href
    };
    
    debugLog(`Product data extracted successfully: ${title}`);
    return productData;
  } catch (error) {
    debugLog(`Error extracting Amazon product data: ${error}`, true);
    console.error('Error extracting Amazon product data:', error);
    return null;
  }
}

// Extract product data from Walmart product page
function extractWalmartProductData(): ProductData | null {
  try {
    debugLog('Starting Walmart product extraction');
    
    // Extract product ID from URL
    const url = window.location.href;
    const idMatch = url.match(/\/ip\/(?:.*?)\/(\d+)/) || url.match(/\/ip\/(\d+)/);
    const productId = idMatch ? idMatch[1] : null;
    
    debugLog(`Product ID extraction: ${productId || 'Not found'}`);
    
    if (!productId) {
      debugLog('No Product ID found in URL - is this a product page?', true);
      return null;
    }
    
    // Extract product title
    const titleElement = document.querySelector('h1.prod-ProductTitle');
    debugLog(`Title element found: ${titleElement ? 'Yes' : 'No'}`);
    
    const title = titleElement ? titleElement.textContent?.trim() || 'Unknown Product' : 'Unknown Product';
    debugLog(`Title: ${title.substring(0, 30)}...`);
    
    // Extract product price
    const priceElement = document.querySelector('.prod-PriceSection .price-characteristic');
    debugLog(`Price element found: ${priceElement ? 'Yes' : 'No'}`);
    
    let price: number | null = null;
    
    if (priceElement) {
      const dollars = priceElement.getAttribute('content') || priceElement.textContent;
      const centsElement = document.querySelector('.prod-PriceSection .price-mantissa');
      const cents = centsElement ? centsElement.textContent : '00';
      
      if (dollars) {
        price = parseFloat(`${dollars}.${cents}`);
        debugLog(`Price: ${price}`);
      } else {
        debugLog('No price found', true);
      }
    }
    
    // Extract brand
    const brandElement = document.querySelector('.prod-ProductBrand a');
    debugLog(`Brand element found: ${brandElement ? 'Yes' : 'No'}`);
    
    const brand = brandElement ? brandElement.textContent?.trim() || null : null;
    debugLog(`Brand: ${brand || 'Not found'}`);
    
    // Try to find UPC in product details
    let upc: string | null = null;
    const detailsSection = document.querySelector('.prod-ProductDetails');
    
    if (detailsSection) {
      const detailItems = detailsSection.querySelectorAll('div');
      detailItems.forEach(item => {
        const text = item.textContent?.toLowerCase() || '';
        if (text.includes('upc')) {
          const match = text.match(/\d{12}/);
          if (match) {
            upc = match[0];
            debugLog(`UPC found: ${upc}`);
          }
        }
      });
    }
    
    // For Walmart, we can often find UPC in the page source
    if (!upc) {
      const pageSource = document.documentElement.innerHTML;
      const upcMatch = pageSource.match(/"upc":"(\d{12})"/);
      if (upcMatch) {
        upc = upcMatch[1];
        debugLog(`UPC found in page source: ${upc}`);
      }
    }
    
    // Get main product image
    const imageElement = document.querySelector('.prod-hero-image img');
    debugLog(`Image element found: ${imageElement ? 'Yes' : 'No'}`);
    
    const imageUrl = imageElement ? (imageElement as HTMLImageElement).src : null;
    
    // Build the product data object
    const productData: ProductData = {
      title: title,
      price,
      marketplace: 'walmart',
      productId,
      brand,
      upc,
      asin: null,
      imageUrl,
      pageUrl: window.location.href
    };
    
    debugLog(`Product data extracted successfully: ${title}`);
    return productData;
  } catch (error) {
    debugLog(`Error extracting Walmart product data: ${error}`, true);
    console.error('Error extracting Walmart product data:', error);
    return null;
  }
}

// Extract product data from Target product page
function extractTargetProductData(): ProductData | null {
  try {
    debugLog('Starting Target product extraction');
    
    // Extract TCIN from URL or page content
    const url = window.location.href;
    const tcinMatch = url.match(/\/p\/.*?-(\d+)/) || document.body.innerHTML.match(/TCIN&#34;:&#34;(\d+)&#34;/);
    const productId = tcinMatch ? tcinMatch[1] : null;
    
    debugLog(`TCIN extraction: ${productId || 'Not found'}`);
    
    if (!productId) {
      debugLog('No TCIN found - is this a product page?', true);
      return null;
    }
    
    // Extract product title
    const titleElement = document.querySelector('h1[data-test="product-title"]');
    debugLog(`Title element found: ${titleElement ? 'Yes' : 'No'}`);
    
    const title = titleElement ? titleElement.textContent?.trim() || 'Unknown Product' : 'Unknown Product';
    debugLog(`Title: ${title.substring(0, 30)}...`);
    
    // Extract product price
    const priceElement = document.querySelector('[data-test="product-price"]');
    debugLog(`Price element found: ${priceElement ? 'Yes' : 'No'}`);
    
    let price: number | null = null;
    
    if (priceElement) {
      const priceText = priceElement.textContent || '';
      // Remove currency symbol and convert to number
      const priceMatch = priceText.match(/\$([0-9.]+)/);
      if (priceMatch) {
        price = parseFloat(priceMatch[1]);
        debugLog(`Price: ${price}`);
      } else {
        debugLog('No price found in element text', true);
      }
    } else {
      debugLog('No price found', true);
    }
    
    // Extract brand
    const brandElement = document.querySelector('[data-test="product-brand"]');
    debugLog(`Brand element found: ${brandElement ? 'Yes' : 'No'}`);
    
    const brand = brandElement ? brandElement.textContent?.trim() || null : null;
    debugLog(`Brand: ${brand || 'Not found'}`);
    
    // Try to find UPC in product details - Target often doesn't expose this directly
    let upc: string | null = null;
    // Look for it in page source
    const pageSource = document.documentElement.innerHTML;
    const upcMatch = pageSource.match(/"upc":"(\d{12})"/);
    if (upcMatch) {
      upc = upcMatch[1];
      debugLog(`UPC found in page source: ${upc}`);
    }
    
    // Get main product image
    const imageElement = document.querySelector('[data-test="product-image"] img');
    debugLog(`Image element found: ${imageElement ? 'Yes' : 'No'}`);
    
    const imageUrl = imageElement ? (imageElement as HTMLImageElement).src : null;
    
    // Build the product data object
    const productData: ProductData = {
      title: title,
      price,
      marketplace: 'target',
      productId,
      brand,
      upc,
      asin: null,
      imageUrl,
      pageUrl: window.location.href
    };
    
    debugLog(`Product data extracted successfully: ${title}`);
    return productData;
  } catch (error) {
    debugLog(`Error extracting Target product data: ${error}`, true);
    console.error('Error extracting Target product data:', error);
    return null;
  }
}

// Extract data and send to background script
function main() {
  debugLog('Content script started - Attempting to extract product data');
  const productData = extractProductData();
  
  if (productData) {
    // Send product data to background script
    chrome.runtime.sendMessage({
      action: 'PRODUCT_DATA_EXTRACTED',
      data: productData
    }, response => {
      if (chrome.runtime.lastError) {
        debugLog(`Error sending message to background script: ${chrome.runtime.lastError.message}`, true);
      } else {
        debugLog(`Message sent to background script, response: ${JSON.stringify(response)}`);
      }
    });
    
    debugLog(`Product data extracted and sent: ${productData.title}`);
  } else {
    debugLog('No product data could be extracted from this page.', true);
  }
}

// Wait for page to fully load before extracting data
debugLog('Content script loaded, waiting for page to fully load');

window.addEventListener('load', () => {
  debugLog('Page loaded, waiting 1 second for dynamic content');
  // Wait a bit longer for dynamic content to load
  setTimeout(main, 1000);
});

// Re-extract when user navigates using browser back/forward
window.addEventListener('popstate', () => {
  debugLog('Navigation detected, extracting new product data');
  setTimeout(main, 1000);
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  debugLog(`Received message: ${JSON.stringify(message)}`);
  
  if (message.action === 'GET_PRODUCT_DATA') {
    debugLog('Popup requested product data, extracting now');
    const productData = extractProductData();
    debugLog(`Sending product data to popup: ${productData ? 'Success' : 'Failed'}`);
    sendResponse({ productData });
  }
  
  return true; // Keep message channel open for async response
});

// Execute main function - this will ensure it runs even if the load event already fired
setTimeout(() => {
  if (document.readyState === 'complete') {
    debugLog('Document already complete, running main function');
    main();
  }
}, 500);
