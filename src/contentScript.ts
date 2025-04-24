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
// Replace the extractAmazonProductData function in your contentScript.ts with this enhanced version

function extractAmazonProductData(): ProductData | null {
  try {
    debugLog('Starting enhanced Amazon product extraction');
    
    // Extract ASIN from URL using multiple patterns
    const url = window.location.href;
    let asin: string | null = null;
    
    // Try multiple ASIN extraction patterns
    const patterns = [
      /\/dp\/([A-Z0-9]{10})/,
      /\/gp\/product\/([A-Z0-9]{10})/,
      /\/([A-Z0-9]{10})\//, 
      /ASIN=([A-Z0-9]{10})/,
      /ASIN\/([A-Z0-9]{10})/,
      /asin=([A-Z0-9]{10})/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        asin = match[1];
        debugLog(`ASIN extracted using pattern: ${pattern}`);
        break;
      }
    }
    
    // If still no ASIN, try to find it in meta tags or elements with data-asin
    if (!asin) {
      // Look for meta tags
      const asinMeta = document.querySelector('meta[name="twitter:app:url:iphone"][content*="asin"]');
      if (asinMeta) {
        const metaContent = asinMeta.getAttribute('content') || '';
        const metaMatch = metaContent.match(/asin=([A-Z0-9]{10})/i);
        if (metaMatch) {
          asin = metaMatch[1];
          debugLog('ASIN found in meta tag');
        }
      }
      
      // Try data-asin elements
      if (!asin) {
        const asinElem = document.querySelector('[data-asin]');
        if (asinElem) {
          asin = asinElem.getAttribute('data-asin');
          debugLog('ASIN found in data-asin attribute');
        }
      }
    }
    
    debugLog(`Final ASIN extraction: ${asin || 'Not found'}`);
    
    if (!asin) {
      debugLog('No ASIN found - is this a product page?', true);
      // Check for product page indicators even if ASIN isn't found
      const isProductPage = !!document.getElementById('productTitle') || 
                           !!document.getElementById('title') ||
                           !!document.querySelector('.product-title') ||
                           !!document.querySelector('[data-feature-name="title"]');
      
      if (!isProductPage) {
        debugLog('This does not appear to be a product page', true);
        return null;
      }
    }
    
    // Extract product title with multiple selectors
    const titleSelectors = [
      '#productTitle', 
      '#title',
      '.product-title', 
      '[data-feature-name="title"]',
      'h1.a-size-large',
      '.a-size-extra-large'
    ];
    
    let title = 'Unknown Product';
    for (const selector of titleSelectors) {
      const titleElement = document.querySelector(selector);
      if (titleElement && titleElement.textContent) {
        title = titleElement.textContent.trim();
        debugLog(`Title found using selector: ${selector}`);
        break;
      }
    }
    
    debugLog(`Title: ${title.substring(0, 30)}...`);
    
    // Extract product price with multiple selectors
    const priceSelectors = [
      '.a-price .a-offscreen',
      '#priceblock_ourprice',
      '#priceblock_dealprice',
      '.a-price',
      '.a-color-price',
      '[data-feature-name="priceInsideBuyBox"] .a-price',
      '.price-large',
      '#price span',
      '#corePrice_feature_div .a-offscreen'
    ];
    
    let price: number | null = null;
    let priceText = '';
    
    for (const selector of priceSelectors) {
      const priceElement = document.querySelector(selector);
      if (priceElement && priceElement.textContent) {
        priceText = priceElement.textContent.trim();
        // Remove currency symbol and convert to number
        const priceMatch = priceText.match(/[\d,.]+/);
        if (priceMatch) {
          price = parseFloat(priceMatch[0].replace(/[^\d.]/g, ''));
          debugLog(`Price found using selector: ${selector}`);
          break;
        }
      }
    }
    
    // If still no price, try checking for price range
    if (price === null) {
      const priceRangeElement = document.querySelector('#priceblock_ourprice_lbl');
      if (priceRangeElement && priceRangeElement.nextElementSibling) {
        const rangeText = priceRangeElement.nextElementSibling.textContent || '';
        const rangeMatch = rangeText.match(/\$([\d,.]+)/);
        if (rangeMatch) {
          price = parseFloat(rangeMatch[1].replace(/[^\d.]/g, ''));
          debugLog('Price found in range element');
        }
      }
    }
    
    debugLog(`Price: ${price !== null ? price : 'Not found'}`);
    
    // Extract brand with multiple selectors
    const brandSelectors = [
      '#bylineInfo',
      '.a-link-normal.contributorNameID',
      '#brand',
      '#bylineInfo a',
      '.product-by-line a',
      '[data-feature-name="brandLogoAndName"] a',
      '#productOverview_feature_div .a-section:nth-child(1) .a-span9 span',
      '#brand-weight-wrapper'
    ];
    
    let brand: string | null = null;
    
    for (const selector of brandSelectors) {
      const brandElement = document.querySelector(selector);
      if (brandElement && brandElement.textContent) {
        brand = brandElement.textContent.trim()
          .replace('Brand:', '')
          .replace('Visit the', '')
          .replace('Store', '')
          .trim();
        
        debugLog(`Brand found using selector: ${selector}`);
        break;
      }
    }
    
    // If still no brand, check product detail section
    if (!brand) {
      const detailRows = document.querySelectorAll('#productDetails_techSpec_section_1 tr, #detailBullets_feature_div li, #detailBulletsWrapper_feature_div li');
      detailRows.forEach(row => {
        const text = row.textContent?.toLowerCase() || '';
        if (text.includes('brand') || text.includes('manufacturer')) {
          const brandMatch = text.match(/brand[^:]*:\s*([^,\n]+)/i) || text.match(/manufacturer[^:]*:\s*([^,\n]+)/i);
          if (brandMatch && brandMatch[1]) {
            brand = brandMatch[1].trim();
            debugLog('Brand found in product details');
          }
        }
      });
    }
    
    debugLog(`Brand: ${brand || 'Not found'}`);
    
    // Try to find UPC/EAN in product details
    let upc: string | null = null;
    const detailSelectors = [
      '#productDetails_techSpec_section_1 tr',
      '#detailBullets_feature_div li',
      '#detailBulletsWrapper_feature_div li',
      '.detail-bullet-list span',
      '.prodDetTable tr'
    ];
    
    for (const selector of detailSelectors) {
      const detailRows = document.querySelectorAll(selector);
      detailRows.forEach(row => {
        const text = row.textContent?.toLowerCase() || '';
        if (text.includes('upc') || text.includes('ean') || text.includes('gtin') || text.includes('isbn')) {
          const match = text.match(/\d{12,13}/);
          if (match) {
            upc = match[0];
            debugLog(`UPC/EAN found using selector: ${selector}`);
          }
        }
      });
      
      if (upc) break;
    }
    
    // Get main product image with multiple selectors
    const imageSelectors = [
      '#landingImage',
      '#imgBlkFront',
      '#main-image',
      '.a-dynamic-image',
      '#imageBlock_feature_div img',
      '#imgTagWrapperId img',
      '#img-canvas img'
    ];
    
    let imageUrl: string | null = null;
    
    for (const selector of imageSelectors) {
      const imageElement = document.querySelector(selector) as HTMLImageElement;
      if (imageElement && imageElement.src) {
        imageUrl = imageElement.src;
        debugLog(`Image found using selector: ${selector}`);
        break;
      }
    }
    
    // If no image found, try data-old-hires attribute which often has full image
    if (!imageUrl) {
      const hiresImage = document.querySelector('img[data-old-hires]') as HTMLImageElement;
      if (hiresImage) {
        imageUrl = hiresImage.getAttribute('data-old-hires') || hiresImage.src;
        debugLog('Image found using data-old-hires attribute');
      }
    }
    
    debugLog(`Image URL: ${imageUrl ? 'Found' : 'Not found'}`);
    
    // Build the product data object
    const productData: ProductData = {
      title: title,
      price,
      marketplace: 'amazon',
      productId: asin || 'unknown',
      brand,
      upc,
      asin: asin || null,
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
