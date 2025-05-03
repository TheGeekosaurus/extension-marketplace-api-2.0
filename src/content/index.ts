// src/content/index.ts - Main content script entry point

import { ProductData } from '../types';
import { extractAmazonProductData } from './extractors/amazon';
import { extractWalmartProductData } from './extractors/walmart';
import { extractTargetProductData } from './extractors/target';
import { extractHomeDepotProductData } from './extractors/homedepot';

/**
 * Main function to extract product data based on current page
 * 
 * @returns Extracted product data or null if extraction fails
 */
async function extractProductData(): Promise<ProductData | null> {
  const url = window.location.href;
  console.log('[E-commerce Arbitrage] Attempting to extract data from URL:', url);
  
  try {
    // Determine which marketplace we're on
    if (url.includes('amazon.com')) {
      console.log('[E-commerce Arbitrage] Detected Amazon page');
      return extractAmazonProductData();
    } else if (url.includes('walmart.com')) {
      console.log('[E-commerce Arbitrage] Detected Walmart page');
      return extractWalmartProductData();
    } else if (url.includes('target.com')) {
      console.log('[E-commerce Arbitrage] Detected Target page');
      return extractTargetProductData();
    } else if (url.includes('homedepot.com')) {
      console.log('[E-commerce Arbitrage] Detected HomeDepot page');
      // Handle the Promise returned by extractHomeDepotProductData
      return await extractHomeDepotProductData();
    }
    
    console.log('[E-commerce Arbitrage] No supported marketplace detected');
    return null;
  } catch (error) {
    console.error('[E-commerce Arbitrage] Error in main extraction:', error);
    return null;
  }
}

/**
 * Extract data and send to background script
 */
function main() {
  console.log('[E-commerce Arbitrage] Content script executed - attempting to extract product data');
  
  extractProductData()
    .then(productData => {
      if (productData) {
        // Send product data to background script
        chrome.runtime.sendMessage({
          action: 'PRODUCT_DATA_EXTRACTED',
          data: productData
        }, response => {
          if (chrome.runtime.lastError) {
            console.error('[E-commerce Arbitrage] Error sending product data:', chrome.runtime.lastError);
          } else {
            console.log('[E-commerce Arbitrage] Product data sent to background script with response:', response);
          }
        });
        
        console.log('[E-commerce Arbitrage] Product data extracted and sent:', productData);
      } else {
        console.warn('[E-commerce Arbitrage] No product data could be extracted from this page.');
      }
    })
    .catch(error => {
      console.error('[E-commerce Arbitrage] Error in extractProductData:', error);
    });
}

/**
 * Display a notification with manual match results
 */
function displayMatchNotification(match: any, sourceProduct: ProductData) {
  // Create a floating notification with match details
  const notificationDiv = document.createElement('div');
  notificationDiv.id = 'extension-match-notification';
  
  // Style the notification
  Object.assign(notificationDiv.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    width: '350px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    zIndex: '10000',
    padding: '16px',
    fontFamily: 'Arial, sans-serif',
    border: '2px solid #4a6bd8'
  });
  
  // Calculate profit
  const profit = match.price && sourceProduct.price !== null 
    ? match.price - sourceProduct.price 
    : 0;
  
  const profitPercent = sourceProduct.price !== null 
    ? (profit / sourceProduct.price) * 100 
    : 0;
  
  // Create the notification content
  notificationDiv.innerHTML = `
    <div style="text-align: right; margin-bottom: 8px;">
      <button id="close-notification" style="background: none; border: none; cursor: pointer; font-size: 16px;">×</button>
    </div>
    <h3 style="margin: 0 0 12px; color: #4a6bd8; font-size: 16px;">Found Potential Match</h3>
    <div style="display: flex; gap: 12px; margin-bottom: 12px;">
      ${match.imageUrl ? `<img src="${match.imageUrl}" style="width: 80px; height: 80px; object-fit: contain;">` : ''}
      <div>
        <div style="font-size: 14px; font-weight: bold;">${match.title}</div>
        <div style="font-size: 14px; margin-top: 4px;">Price: $${match.price.toFixed(2)}</div>
        <div style="font-size: 14px; margin-top: 4px;">Similarity: ${(match.similarityScore * 100).toFixed(1)}%</div>
      </div>
    </div>
    <div style="margin-bottom: 12px;">
      <div style="font-weight: bold; font-size: 14px; margin-bottom: 4px;">Potential Profit:</div>
      <div style="font-size: 15px; color: ${profit > 0 ? '#27ae60' : '#e74c3c'}; font-weight: bold;">
        $${profit.toFixed(2)} (${profitPercent.toFixed(1)}%)
      </div>
    </div>
    <div style="display: flex; gap: 8px;">
      <button id="save-match" style="
        flex: 1;
        background-color: #4a6bd8;
        color: white;
        border: none;
        border-radius: 4px;
        padding: 8px;
        cursor: pointer;
        font-size: 14px;
      ">Save Match</button>
      <button id="view-details" style="
        flex: 1;
        background-color: transparent;
        color: #4a6bd8;
        border: 1px solid #4a6bd8;
        border-radius: 4px;
        padding: 8px;
        cursor: pointer;
        font-size: 14px;
      ">View Details</button>
    </div>
  `;
  
  // Add to page
  document.body.appendChild(notificationDiv);
  
  // Add event listeners
  document.getElementById('close-notification')?.addEventListener('click', () => {
    notificationDiv.remove();
  });
  
  document.getElementById('save-match')?.addEventListener('click', () => {
    // Create the comparison object
    const comparison = {
      sourceProduct,
      matchedProducts: {
        [match.marketplace]: [
          {
            title: match.title,
            price: match.price,
            image: match.imageUrl,
            url: match.url,
            marketplace: match.marketplace,
            similarity: match.similarityScore,
            profit: {
              amount: profit,
              percentage: profitPercent
            }
          }
        ]
      },
      timestamp: Date.now(),
      manualMatch: true,
      similarity: match.similarityScore
    };
    
    // Save to storage
    chrome.storage.local.set({ comparison }, () => {
      console.log('[E-commerce Arbitrage] Saved manual match comparison');
      
      // Update the notification
      notificationDiv.innerHTML = `
        <div style="text-align: center; padding: 12px;">
          <div style="color: #27ae60; font-size: 24px; margin-bottom: 12px;">✓</div>
          <h3 style="margin: 0 0 8px; font-size: 16px; color: #4a6bd8;">Match Saved!</h3>
          <p style="font-size: 14px; margin-bottom: 16px;">The match has been saved to your comparison.</p>
          <button id="close-after-save" style="
            background-color: #4a6bd8;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 8px 16px;
            font-size: 14px;
            cursor: pointer;
          ">Close</button>
        </div>
      `;
      
      document.getElementById('close-after-save')?.addEventListener('click', () => {
        notificationDiv.remove();
      });
    });
  });
  
  document.getElementById('view-details')?.addEventListener('click', () => {
    // Open the product page in a new tab
    window.open(match.url, '_blank');
  });
}

// Wait for page to fully load before extracting data
console.log('[E-commerce Arbitrage] Content script loaded, waiting for window load event');

// Run extraction on document complete
if (document.readyState === 'complete') {
  console.log('[E-commerce Arbitrage] Document already complete, running extraction');
  setTimeout(main, 500);
} else {
  window.addEventListener('load', () => {
    // Wait a bit longer for dynamic content to load
    console.log('[E-commerce Arbitrage] Window loaded, waiting additional time for dynamic content');
    setTimeout(main, 1500);
  });
}

// Re-extract when user navigates using browser back/forward
window.addEventListener('popstate', () => {
  console.log('[E-commerce Arbitrage] Navigation detected, re-extracting product data');
  setTimeout(main, 1500);
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[E-commerce Arbitrage] Received message in content script:', message);
  
  if (message.action === 'GET_PRODUCT_DATA') {
    console.log('[E-commerce Arbitrage] Retrieving fresh product data');
    
    extractProductData()
      .then(productData => {
        console.log('[E-commerce Arbitrage] Sending product data response:', productData);
        sendResponse({ productData });
      })
      .catch(error => {
        console.error('[E-commerce Arbitrage] Error retrieving product data:', error);
        sendResponse({ error: error instanceof Error ? error.toString() : String(error) });
      });
    
    return true; // Keep the message channel open for async response
  }
  
  // Listen for match results being forwarded from background script
  if (message.action === 'MANUAL_MATCH_FOUND') {
    console.log('[E-commerce Arbitrage] Received match result:', message.match);
    
    // Get source product from storage and display notification
    chrome.storage.local.get(['manualMatchSourceProduct'], (result) => {
      const sourceProduct = result.manualMatchSourceProduct;
      
      if (!sourceProduct) {
        console.error('[E-commerce Arbitrage] Source product not found in storage');
        return;
      }
      
      displayMatchNotification(message.match, sourceProduct);
    });
    
    return true;
  }
  
  if (message.action === 'MANUAL_MATCH_NOT_FOUND') {
    console.log('[E-commerce Arbitrage] No match found in background search');
    // Could display a notification that no match was found
    return true;
  }
  
  if (message.action === 'MANUAL_MATCH_ERROR') {
    console.error('[E-commerce Arbitrage] Error in background search:', message.error);
    // Could display a notification about the error
    return true;
  }
  
  return true; // Keep the message channel open for async response
});

// Execute main function immediately in case the page is already loaded
// This helps with pages that don't trigger the load event
console.log('[E-commerce Arbitrage] Running initial extraction attempt');
setTimeout(main, 500);
