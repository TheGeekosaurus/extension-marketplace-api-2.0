// src/common/messaging.ts - Chrome messaging utilities

/**
 * Send a message to the background script
 * 
 * @param message - Message to send
 * @returns Promise that resolves with the response
 */
export async function sendMessage<T = any>(message: any): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        
        if (response && response.success === false) {
          reject(new Error(response.error || 'Unknown error'));
          return;
        }
        
        resolve(response);
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Send a message to a specific tab
 * 
 * @param tabId - Tab ID to send to
 * @param message - Message to send
 * @returns Promise that resolves with the response
 */
export async function sendTabMessage<T = any>(tabId: number, message: any): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    try {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        
        if (response && response.success === false) {
          reject(new Error(response.error || 'Unknown error'));
          return;
        }
        
        resolve(response);
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Get the active tab
 * 
 * @returns Promise that resolves with the active tab
 */
export async function getActiveTab(): Promise<chrome.tabs.Tab> {
  return new Promise<chrome.tabs.Tab>((resolve, reject) => {
    try {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        
        if (!tabs || tabs.length === 0) {
          reject(new Error('No active tab found'));
          return;
        }
        
        resolve(tabs[0]);
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Check if the current tab has a supported marketplace URL
 * 
 * @param tab - Tab to check
 * @returns Whether the tab has a supported marketplace URL
 */
export function isSupportedMarketplace(tab: chrome.tabs.Tab): boolean {
  if (!tab.url) return false;
  
  return (
    tab.url.includes('amazon.com') ||
    tab.url.includes('walmart.com') ||
    tab.url.includes('target.com')
  );
}

/**
 * Determine the marketplace from a URL
 * 
 * @param url - URL to check
 * @returns Marketplace name or null if not supported
 */
export function getMarketplaceFromUrl(url: string): 'amazon' | 'walmart' | 'target' | null {
  if (url.includes('amazon.com')) return 'amazon';
  if (url.includes('walmart.com')) return 'walmart';
  if (url.includes('target.com')) return 'target';
  return null;
}

/**
 * Get product data from the current tab
 * 
 * @returns Promise that resolves with the product data response
 */
export async function getProductDataFromPage(): Promise<any> {
  const tab = await getActiveTab();
  
  if (!tab.id) {
    throw new Error('No tab ID available');
  }
  
  if (!isSupportedMarketplace(tab)) {
    throw new Error('Not a supported marketplace page');
  }
  
  return sendTabMessage(tab.id, { action: 'GET_PRODUCT_DATA' });
}

/**
 * Format message actions for consistent usage
 */
export const MessageAction = {
  PRODUCT_DATA_EXTRACTED: 'PRODUCT_DATA_EXTRACTED',
  GET_PRODUCT_DATA: 'GET_PRODUCT_DATA',
  GET_PRICE_COMPARISON: 'GET_PRICE_COMPARISON',
  CLEAR_CACHE: 'CLEAR_CACHE',
  UPDATE_SETTINGS: 'UPDATE_SETTINGS'
};
