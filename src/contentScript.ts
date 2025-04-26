// contentScript.ts - Extracts product data from current page

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

// Add debugging to help troubleshoot
function logDebug(message: string, data?: any) {
  console.log(`[E-commerce Arbitrage] ${message}`, data || '');
}

// Main function to extract product data based on current page
function extractProductData(): ProductData | null {
  const url = window.location.href;
  logDebug('Attempting to extract data from URL:', url);
  
  // Determine which marketplace we're on
  if (url.includes('amazon.com')) {
    logDebug('Detected Amazon page');
    return extractAmazonProductData();
  } else if (url.includes('walmart.com')) {
    logDebug('Detected Walmart page');
    return extractWalmartProductData();
  } else if (url.includes('target.com')) {
    logDebug('Detected Target page');
    return extractTargetProductData();
  }
  
  logDebug('No supported marketplace detected');
  return null;
}

// Extract product data from Amazon product page
function extractAmazonProductData(): ProductData | null {
  try {
    // Extract ASIN from URL
    const url = window.location.href;
    const asinMatch = url.match(/\/dp\/([A-Z0-9]{10})/) || url.match(/\/gp\/product\/([A-Z0-9]{10})/);
    const asin = asinMatch ? asinMatch[1] : null;
    
    logDebug('Extracted ASIN:', asin);
    
    if (!asin) {
      logDebug('No ASIN found in URL');
      return null;
    }
    
    // Extract product title
    const titleElement = document.getElementById('productTitle') || 
                         document.querySelector('.product-title-word-break');
    const title = titleElement ? titleElement.textContent?.trim() || 'Unknown Product' : 'Unknown Product';
    logDebug('Extracted title:', title);
    
    // Extract product price - try multiple selectors since Amazon's structure changes
    let priceElement = document.querySelector('.a-price .a-offscreen') || 
                       document.querySelector('#priceblock_ourprice') ||
                       document.querySelector('#priceblock_dealprice') ||
                       document.querySelector('.a-price .a-price-whole');
    
    let price: number | null = null;
    
    if (priceElement && priceElement.textContent) {
      const priceText = priceElement.textContent.trim();
      // Remove currency symbol and convert to number
      const priceMatch = priceText.match(/[$£€]?([0-9,.]+)/);
      price = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '')) : null;
      logDebug('Extracted price:', price);
    } else {
      logDebug('No price found, tried selectors:', ['.a-price .a-offscreen', '#priceblock_ourprice', '#priceblock_dealprice']);
    }
    
    // Extract brand
    const brandElement = document.querySelector('#bylineInfo, .a-link-normal.contributorNameID') ||
                         document.querySelector('.po-brand .a-span9');
    const brand = brandElement ? brandElement.textContent?.trim().replace('Brand: ', '') || null : null;
    logDebug('Extracted brand:', brand);
    
    // Try to find UPC/EAN in product details
    let upc: string | null = null;
    const detailRows = document.querySelectorAll('.prodDetTable tr, .detail-bullet-list span, #detailBullets_feature_div li');
    
    detailRows.forEach(row => {
      const text = row.textContent?.toLowerCase() || '';
      if (text.includes('upc') || text.includes('ean') || text.includes('gtin')) {
        const match = text.match(/\d{12,13}/);
        if (match) {
          upc = match[0];
          logDebug('Found UPC/EAN:', upc);
        }
      }
    });
    
    // Get main product image
    const imageElement = document.getElementById('landingImage') || 
                         document.getElementById('imgBlkFront') ||
                         document.querySelector('#main-image-container img');
    const imageUrl = imageElement ? (imageElement as HTMLImageElement).src : null;
    logDebug('Extracted image URL:', imageUrl);
    
    const productData = {
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
    
    logDebug('Extracted Amazon product data:', productData);
    return productData;
  } catch (error) {
    console.error('Error extracting Amazon product data:', error);
    return null;
  }
}

// Extract product data from Walmart product page
function extractWalmartProductData(): ProductData | null {
  try {
    // Extract product ID from URL
    const url = window.location.href;
    const idMatch = url.match(/\/ip\/(?:.*?)\/(\d+)/) || url.match(/\/ip\/(\d+)/);
    const productId = idMatch ? idMatch[1] : null;
    
    logDebug('Extracted Walmart product ID:', productId);
    
    if (!productId) {
      logDebug('No product ID found in Walmart URL');
      return null;
    }
    
    // Extract product title
    const titleElement = document.querySelector('h1.prod-ProductTitle') || 
                         document.querySelector('[data-testid="product-title"]') ||
                         document.querySelector('h1[itemprop="name"]');
    const title = titleElement ? titleElement.textContent?.trim() || 'Unknown Product' : 'Unknown Product';
    logDebug('Extracted title:', title);
    
    // Extract product price - try multiple selectors
    const priceElement = document.querySelector('.prod-PriceSection .price-characteristic') ||
                         document.querySelector('[data-testid="price-value"]') ||
                         document.querySelector('.price-group');
    let price: number | null = null;
    
    if (priceElement) {
      const dollars = priceElement.getAttribute('content') || priceElement.textContent;
      const centsElement = document.querySelector('.prod-PriceSection .price-mantissa');
      const cents = centsElement ? centsElement.textContent : '00';
      
      if (dollars) {
        // Clean up the price text and convert to number
        const priceText = dollars.toString().replace(/[^0-9.]/g, '');
        price = parseFloat(priceText);
        if (centsElement && !priceText.includes('.')) {
          price += parseFloat(cents) / 100;
        }
        logDebug('Extracted price:', price);
      }
    }
    
    // Extract brand
    const brandElement = document.querySelector('.prod-ProductBrand a') ||
                         document.querySelector('[data-testid="product-brand"]');
    const brand = brandElement ? brandElement.textContent?.trim() || null : null;
    logDebug('Extracted brand:', brand);
    
    // Try to find UPC in product details
    let upc: string | null = null;
    const detailsSection = document.querySelector('.prod-ProductDetails') ||
                           document.querySelector('[data-testid="product-details"]');
    
    if (detailsSection) {
      const detailItems = detailsSection.querySelectorAll('div');
      detailItems.forEach(item => {
        const text = item.textContent?.toLowerCase() || '';
        if (text.includes('upc')) {
          const match = text.match(/\d{12}/);
          if (match) {
            upc = match[0];
            logDebug('Found UPC in details:', upc);
          }
        }
      });
    }
    
    // For Walmart, we can often find this in the page source
    if (!upc) {
      const pageSource = document.documentElement.innerHTML;
      const upcMatch = pageSource.match(/"upc":"(\d{12})"/);
      if (upcMatch) {
        upc = upcMatch[1];
        logDebug('Found UPC in page source:', upc);
      }
    }
    
    // Get main product image
    const imageElement = document.querySelector('.prod-hero-image img') ||
                         document.querySelector('[data-testid="product-image"] img') ||
                         document.querySelector('img[itemprop="image"]');
    const imageUrl = imageElement ? (imageElement as HTMLImageElement).src : null;
    logDebug('Extracted image URL:', imageUrl);
    
    const productData = {
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
    
    logDebug('Extracted Walmart product data:', productData);
    return productData;
  } catch (error) {
    console.error('Error extracting Walmart product data:', error);
    return null;
  }
}

// Extract product data from Target product page
function extractTargetProductData(): ProductData | null {
  try {
    // Extract TCIN from URL or page content
    const url = window.location.href;
    const tcinMatch = url.match(/\/p\/.*?-(\d+)/) || document.body.innerHTML.match(/TCIN&#34;:&#34;(\d+)&#34;/);
    const productId = tcinMatch ? tcinMatch[1] : null;
    
    logDebug('Extracted Target product ID:', productId);
    
    if (!productId) {
      logDebug('No product ID found in Target URL or page');
      return null;
    }
    
    // Extract product title
    const titleElement = document.querySelector('h1[data-test="product-title"]') ||
                         document.querySelector('h1.Heading__StyledHeading');
    const title = titleElement ? titleElement.textContent?.trim() || 'Unknown Product' : 'Unknown Product';
    logDebug('Extracted title:', title);
    
    // Extract product price
    const priceElement = document.querySelector('[data-test="product-price"]') ||
                         document.querySelector('.styles__PriceFontSize');
    let price: number | null = null;
    
    if (priceElement) {
      const priceText = priceElement.textContent || '';
      // Remove currency symbol and convert to number
      const priceMatch = priceText.match(/\$([0-9.]+)/);
      if (priceMatch) {
        price = parseFloat(priceMatch[1]);
        logDebug('Extracted price:', price);
      }
    }
    
    // Extract brand
    const brandElement = document.querySelector('[data-test="product-brand"]') ||
                         document.querySelector('.styles__BrandLink');
    const brand = brandElement ? brandElement.textContent?.trim() || null : null;
    logDebug('Extracted brand:', brand);
    
    // Try to find UPC in product details - Target often doesn't expose this directly
    let upc: string | null = null;
    // Look for it in page source
    const pageSource = document.documentElement.innerHTML;
    const upcMatch = pageSource.match(/"upc":"?(\d{12})"?/);
    if (upcMatch) {
      upc = upcMatch[1];
      logDebug('Found UPC in page source:', upc);
    }
    
    // Get main product image
    const imageElement = document.querySelector('[data-test="product-image"] img') ||
                         document.querySelector('picture img');
    const imageUrl = imageElement ? (imageElement as HTMLImageElement).src : null;
    logDebug('Extracted image URL:', imageUrl);
    
    const productData = {
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
    
    logDebug('Extracted Target product data:', productData);
    return productData;
  } catch (error) {
    console.error('Error extracting Target product data:', error);
    return null;
  }
}

// Extract data and send to background script
function main() {
  logDebug('Content script executed - attempting to extract product data');
  const productData = extractProductData();
  
  if (productData) {
    // Send product data to background script
    chrome.runtime.sendMessage({
      action: 'PRODUCT_DATA_EXTRACTED',
      data: productData
    }, response => {
      if (chrome.runtime.lastError) {
        console.error('Error sending product data:', chrome.runtime.lastError);
      } else {
        logDebug('Product data sent to background script with response:', response);
      }
    });
    
    logDebug('Product data extracted and sent:', productData);
  } else {
    console.warn('No product data could be extracted from this page.');
  }
}

// Wait for page to fully load before extracting data
logDebug('Content script loaded, waiting for window load event');
window.addEventListener('load', () => {
  // Wait a bit longer for dynamic content to load
  logDebug('Window loaded, waiting additional time for dynamic content');
  setTimeout(main, 1500);
});

// Re-extract when user navigates using browser back/forward
window.addEventListener('popstate', () => {
  logDebug('Navigation detected, re-extracting product data');
  setTimeout(main, 1500);
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  logDebug('Received message in content script:', message);
  
  if (message.action === 'GET_PRODUCT_DATA') {
    logDebug('Retrieving fresh product data');
    const productData = extractProductData();
    logDebug('Sending product data response:', productData);
    sendResponse({ productData });
  }
  return true; // Keep the message channel open for async response
});

// Execute main function immediately in case the page is already loaded
// This helps with pages that don't trigger the load event
logDebug('Running initial extraction attempt');
setTimeout(main, 500);
