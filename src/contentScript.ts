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

// Main function to extract product data based on current page
function extractProductData(): ProductData | null {
  const url = window.location.href;
  
  // Determine which marketplace we're on
  if (url.includes('amazon.com')) {
    return extractAmazonProductData();
  } else if (url.includes('walmart.com')) {
    return extractWalmartProductData();
  } else if (url.includes('target.com')) {
    return extractTargetProductData();
  }
  
  return null;
}

// Extract product data from Amazon product page
function extractAmazonProductData(): ProductData | null {
  try {
    // Extract ASIN from URL
    const url = window.location.href;
    const asinMatch = url.match(/\/dp\/([A-Z0-9]{10})/) || url.match(/\/gp\/product\/([A-Z0-9]{10})/);
    const asin = asinMatch ? asinMatch[1] : null;
    
    if (!asin) return null;
    
    // Extract product title
    const titleElement = document.getElementById('productTitle');
    const title = titleElement ? titleElement.textContent?.trim() || 'Unknown Product' : 'Unknown Product';
    
    // Extract product price
    const priceElement = document.querySelector('.a-price .a-offscreen');
    let price: number | null = null;
    
    if (priceElement && priceElement.textContent) {
      const priceText = priceElement.textContent.trim();
      // Remove currency symbol and convert to number
      price = parseFloat(priceText.replace(/[^0-9.]/g, ''));
    }
    
    // Extract brand
    const brandElement = document.querySelector('#bylineInfo, .a-link-normal.contributorNameID');
    const brand = brandElement ? brandElement.textContent?.trim().replace('Brand: ', '') || null : null;
    
    // Try to find UPC/EAN in product details
    let upc: string | null = null;
    const detailRows = document.querySelectorAll('.prodDetTable tr, .detail-bullet-list span');
    
    detailRows.forEach(row => {
      const text = row.textContent?.toLowerCase() || '';
      if (text.includes('upc') || text.includes('ean') || text.includes('gtin')) {
        const match = text.match(/\d{12,13}/);
        if (match) {
          upc = match[0];
        }
      }
    });
    
    // Get main product image
    const imageElement = document.getElementById('landingImage') || document.getElementById('imgBlkFront');
    const imageUrl = imageElement ? (imageElement as HTMLImageElement).src : null;
    
    return {
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
    
    if (!productId) return null;
    
    // Extract product title
    const titleElement = document.querySelector('h1.prod-ProductTitle');
    const title = titleElement ? titleElement.textContent?.trim() || 'Unknown Product' : 'Unknown Product';
    
    // Extract product price
    const priceElement = document.querySelector('.prod-PriceSection .price-characteristic');
    let price: number | null = null;
    
    if (priceElement) {
      const dollars = priceElement.getAttribute('content') || priceElement.textContent;
      const centsElement = document.querySelector('.prod-PriceSection .price-mantissa');
      const cents = centsElement ? centsElement.textContent : '00';
      
      if (dollars) {
        price = parseFloat(`${dollars}.${cents}`);
      }
    }
    
    // Extract brand
    const brandElement = document.querySelector('.prod-ProductBrand a');
    const brand = brandElement ? brandElement.textContent?.trim() || null : null;
    
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
      }
    }
    
    // Get main product image
    const imageElement = document.querySelector('.prod-hero-image img');
    const imageUrl = imageElement ? (imageElement as HTMLImageElement).src : null;
    
    return {
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
    
    if (!productId) return null;
    
    // Extract product title
    const titleElement = document.querySelector('h1[data-test="product-title"]');
    const title = titleElement ? titleElement.textContent?.trim() || 'Unknown Product' : 'Unknown Product';
    
    // Extract product price
    const priceElement = document.querySelector('[data-test="product-price"]');
    let price: number | null = null;
    
    if (priceElement) {
      const priceText = priceElement.textContent || '';
      // Remove currency symbol and convert to number
      const priceMatch = priceText.match(/\$([0-9.]+)/);
      if (priceMatch) {
        price = parseFloat(priceMatch[1]);
      }
    }
    
    // Extract brand
    const brandElement = document.querySelector('[data-test="product-brand"]');
    const brand = brandElement ? brandElement.textContent?.trim() || null : null;
    
    // Try to find UPC in product details - Target often doesn't expose this directly
    let upc: string | null = null;
    // Look for it in page source
    const pageSource = document.documentElement.innerHTML;
    const upcMatch = pageSource.match(/"upc":"(\d{12})"/);
    if (upcMatch) {
      upc = upcMatch[1];
    }
    
    // Get main product image
    const imageElement = document.querySelector('[data-test="product-image"] img');
    const imageUrl = imageElement ? (imageElement as HTMLImageElement).src : null;
    
    return {
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
  } catch (error) {
    console.error('Error extracting Target product data:', error);
    return null;
  }
}

// Extract data and send to background script
function main() {
  const productData = extractProductData();
  
  if (productData) {
    // Send product data to background script
    chrome.runtime.sendMessage({
      action: 'PRODUCT_DATA_EXTRACTED',
      data: productData
    });
    
    console.log('Product data extracted:', productData);
  } else {
    console.warn('No product data could be extracted from this page.');
  }
}

// Wait for page to fully load before extracting data
window.addEventListener('load', () => {
  // Wait a bit longer for dynamic content to load
  setTimeout(main, 1000);
});

// Re-extract when user navigates using browser back/forward
window.addEventListener('popstate', () => {
  setTimeout(main, 1000);
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'GET_PRODUCT_DATA') {
    const productData = extractProductData();
    sendResponse({ productData });
  }
});
