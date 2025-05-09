// src/popup/state/store.ts - Central state store for popup

import { create } from 'zustand';
import { ProductData, ProductComparison, Settings, MarketplaceType } from '../../types';
import { sendMessage } from '../../common/messaging';
import { DEFAULT_SETTINGS } from '../../common/constants';

// Simple logger for debugging
const logger = {
  info: (message: string, ...args: any[]) => console.info(`[Store] ${message}`, ...args),
  error: (message: string, ...args: any[]) => console.error(`[Store] ${message}`, ...args),
  warn: (message: string, ...args: any[]) => console.warn(`[Store] ${message}`, ...args),
  debug: (message: string, ...args: any[]) => console.debug(`[Store] ${message}`, ...args)
};

/**
 * Auth state interface for the popup
 */
interface AuthState {
  isAuthenticated: boolean;
  user: {
    id: string;
    email: string;
    credits: number;
  } | null;
}

/**
 * Manual match state interface
 */
interface ManualMatchState {
  enabled: boolean;
  sourceProduct: ProductData | null;
  searchUrl: string | null;
}

/**
 * Popup state interface
 */
interface PopupState {
  // Data
  currentProduct: ProductData | null;
  comparison: ProductComparison | null;
  settings: Settings;
  
  // Auth state
  authState: AuthState;
  
  // Manual match state
  manualMatch: ManualMatchState;
  
  // UI state
  loading: boolean;
  error: string | null;
  status: string | null;
  activeTab: 'product' | 'categories' | 'settings' | 'account';
  
  // Actions
  setCurrentProduct: (product: ProductData | null) => void;
  setComparison: (comparison: ProductComparison | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setStatus: (status: string | null) => void;
  setActiveTab: (tab: 'product' | 'categories' | 'settings' | 'account') => void;
  updateSettings: (settings: Partial<Settings>) => void;
  setAuthState: (state: Partial<AuthState>) => void;
  setManualMatch: (state: Partial<ManualMatchState>) => void;
  
  // API actions
  loadProductData: () => Promise<void>;
  fetchPriceComparison: () => Promise<void>;
  clearCache: () => Promise<void>;
  saveSettings: () => Promise<void>;
  findMatchManually: () => Promise<void>;
  
  // Auth actions
  validateApiKey: (apiKey: string) => Promise<boolean>;
  getCreditsBalance: () => Promise<number>;
  logout: () => Promise<void>;
}

/**
 * Create the popup store
 */
export const usePopupStore = create<PopupState>((set, get) => ({
  // Initial state
  currentProduct: null,
  comparison: null,
  settings: DEFAULT_SETTINGS,
  authState: {
    isAuthenticated: false,
    user: null
  },
  manualMatch: {
    enabled: false,
    sourceProduct: null,
    searchUrl: null
  },
  loading: false,
  error: null,
  status: null,
  activeTab: 'product',
  
  // State setters
  setCurrentProduct: (product) => {
    set({ currentProduct: product });
    // FIX 3: Persist the current product state
    if (product) {
      chrome.storage.local.set({ currentProduct: product });
    }
  },
  setComparison: (comparison) => {
    set({ comparison });
    // FIX 3: Persist the comparison state
    if (comparison) {
      chrome.storage.local.set({ comparison });
    }
  },
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setStatus: (status) => set({ status }),
  setActiveTab: (tab) => {
    set({ activeTab: tab });
    // FIX 3: Persist the active tab
    chrome.storage.local.set({ activeTab: tab });
  },
  updateSettings: (partialSettings) => set((state) => ({
    settings: { ...state.settings, ...partialSettings }
  })),
  setAuthState: (partialState) => set((state) => ({
    authState: { ...state.authState, ...partialState }
  })),
  setManualMatch: (partialState) => set((state) => ({
    manualMatch: { ...state.manualMatch, ...partialState }
  })),
  
  // API actions
  loadProductData: async () => {
    const { setLoading, setError, setStatus, setCurrentProduct } = get();
    
    setLoading(true);
    setError(null);
    setStatus('Requesting fresh product data from page...');
    
    try {
      // Get active tab ID
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs[0]?.id) {
        throw new Error('Could not get active tab ID');
      }
      
      // Request product data from content script
      const response = await new Promise<any>((resolve, reject) => {
        chrome.tabs.sendMessage(
          tabs[0].id!, 
          { action: 'GET_PRODUCT_DATA' }, 
          (response) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
              return;
            }
            resolve(response);
          }
        );
      });
      
      if (response && response.productData) {
        setCurrentProduct(response.productData);
        // FIX 3: Already persisted in setCurrentProduct
        setStatus('Product data successfully retrieved from page');
        
        // FIX 3: Clear comparison when explicitly refreshing product data
        set({ comparison: null });
        chrome.storage.local.remove(['comparison']);
      } else {
        setError('No product data could be extracted from this page');
        setStatus('Make sure you are on a product page (not a search results page)');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(`Error: ${errorMessage}`);
      setStatus('Make sure you are on a product page and try refreshing.');
      console.error('Error loading product data:', error);
    } finally {
      setLoading(false);
    }
  },
  
  fetchPriceComparison: async () => {
    const { 
      currentProduct, 
      setLoading, 
      setError, 
      setStatus, 
      setComparison,
      settings,
      authState
    } = get();
    
    if (!currentProduct) {
      setError('No product detected. Try visiting a product page first.');
      return;
    }
    
    // Check if the user is authenticated
    if (!authState.isAuthenticated) {
      setError('Please enter your API key in the Account tab to use this feature.');
      set({ activeTab: 'account' });
      return;
    }
    
    setLoading(true);
    setError(null);
    
    // Show which marketplace we're searching in the status message
    if (settings.selectedMarketplace) {
      setStatus(`Fetching price comparison data from ${settings.selectedMarketplace.charAt(0).toUpperCase() + settings.selectedMarketplace.slice(1)}...`);
    } else {
      setStatus('Fetching price comparison data from all marketplaces...');
    }
    
    try {
      // Send message to background script to get price comparison
      const response = await sendMessage({ 
        action: 'GET_PRICE_COMPARISON', 
        productData: currentProduct 
      });
      
      if (response && response.success) {
        setComparison(response.data);
        // FIX 3: Already persisted in setComparison
        
        // Update credits in the auth state after operation
        await get().getCreditsBalance();
        if (settings.selectedMarketplace) {
          setStatus(`Price comparison data from ${settings.selectedMarketplace} loaded successfully`);
        } else {
          setStatus('Price comparison data loaded successfully');
        }
      } else {
        const error = response?.error || 'Failed to get price comparison';
        
        // Check if this is an insufficient credits error
        if (error.includes('Insufficient credits')) {
          setError('You do not have enough credits for this operation');
          set({ activeTab: 'account' });
        } else {
          setError(error);
          setStatus(response?.errorDetails || 'An unknown error occurred');
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Check if this is an insufficient credits error
      if (typeof error === 'object' && error && 'insufficientCredits' in error) {
        setError('You do not have enough credits for this operation');
        set({ activeTab: 'account' });
      } else {
        setError(`Error: ${errorMessage}`);
      }
      console.error('Error fetching price comparison:', error);
    } finally {
      setLoading(false);
    }
  },
  
  findMatchManually: async () => {
    const { currentProduct, settings, setStatus, setError, setLoading, setManualMatch, setComparison } = get();
    
    if (!currentProduct) {
      setError('No product detected. Try visiting a product page first.');
      return;
    }
    
    // Determine destination marketplace
    // For Home Depot or Target as source, default to searching on both Amazon and Walmart
    // unless a specific marketplace is selected in settings
    let destinationMarketplace;
    
    if (settings.selectedMarketplace) {
      // Use the selected marketplace from settings
      destinationMarketplace = settings.selectedMarketplace;
    } else if (currentProduct.marketplace === 'amazon') {
      // From Amazon, search Walmart
      destinationMarketplace = 'walmart';
    } else if (currentProduct.marketplace === 'walmart') {
      // From Walmart, search Amazon
      destinationMarketplace = 'amazon';
    } else if (currentProduct.marketplace === 'homedepot' || currentProduct.marketplace === 'target') {
      // From Home Depot or Target, default to Amazon (could also be Walmart)
      destinationMarketplace = 'amazon';
    } else {
      // Default fallback
      destinationMarketplace = 'amazon';
    }
    
    console.log(`Source marketplace: ${currentProduct.marketplace}, destination: ${destinationMarketplace}`);
    
    // Create search term from product data
    const brandPrefix = currentProduct.brand ? `${currentProduct.brand} ` : '';
    const searchTerm = `${brandPrefix}${currentProduct.title}`.substring(0, 100);
    const encodedSearchTerm = encodeURIComponent(searchTerm);
    
    // Create destination URL
    let destinationUrl;
    if (destinationMarketplace === 'amazon') {
      destinationUrl = `https://www.amazon.com/s?k=${encodedSearchTerm}`;
    } else if (destinationMarketplace === 'walmart') {
      destinationUrl = `https://www.walmart.com/search?q=${encodedSearchTerm}`;
    } else {
      setError(`Unsupported destination marketplace: ${destinationMarketplace}`);
      return;
    }
    
    setLoading(true);
    setStatus(`Searching ${destinationMarketplace.charAt(0).toUpperCase() + destinationMarketplace.slice(1)} in background...`);
    
    try {
      // Update manual match state
      setManualMatch({
        enabled: true,
        sourceProduct: currentProduct,
        searchUrl: destinationUrl
      });
      
      // Store the source product in local storage for the match finder to use
      chrome.storage.local.set({ 
        manualMatchSourceProduct: currentProduct,
        manualMatchInProgress: true
      });
      
      // Open the search tab in background (not active)
      const searchTab = await chrome.tabs.create({ 
        url: destinationUrl, 
        active: false // Keep current tab active
      });
      
      // Listen for message from the background search tab
      const matchFound = await new Promise<any>((resolve) => {
        const messageListener = (message: any, sender: chrome.runtime.MessageSender) => {
          // Only listen for messages from our search tab
          if (sender.tab?.id === searchTab.id && message.action === 'MANUAL_MATCH_FOUND') {
            chrome.runtime.onMessage.removeListener(messageListener);
            resolve(message.match);
          }
        };
        
        chrome.runtime.onMessage.addListener(messageListener);
        
        // Set a timeout in case the match isn't found
        setTimeout(() => {
          chrome.runtime.onMessage.removeListener(messageListener);
          resolve(null);
        }, 30000); // 30 second timeout
      });
      
      // Close the search tab when done
      if (searchTab.id) {
        try {
          chrome.tabs.remove(searchTab.id);
        } catch (e) {
          console.error('Error closing search tab:', e);
        }
      }
      
      if (matchFound) {
        // Calculate profit with fees if enabled
        let profit = 0;
        let profitPercentage = 0;
        
        if (currentProduct.price !== null) {
          profit = matchFound.price - currentProduct.price;
          profitPercentage = ((matchFound.price - currentProduct.price) / currentProduct.price) * 100;
        }
        
        // Create fee breakdown if settings include fees
        let feeBreakdown = null;
        
        if (settings.includeFees) {
          // Type guard - ensure marketplace is valid
          const marketplace = matchFound.marketplace as keyof typeof settings.estimatedFees;
          const feePercentage = settings.estimatedFees[marketplace] || 0;
          const marketplaceFeeAmount = matchFound.price * feePercentage;
          const additionalFees = settings.additionalFees || 0;
          const totalFees = marketplaceFeeAmount + additionalFees;
          
          // Recalculate profit with fees if price is available
          if (currentProduct.price !== null) {
            profit = matchFound.price - currentProduct.price - totalFees;
            profitPercentage = (profit / currentProduct.price) * 100;
          }
          
          feeBreakdown = {
            marketplace_fee_percentage: feePercentage,
            marketplace_fee_amount: parseFloat(marketplaceFeeAmount.toFixed(2)),
            additional_fees: parseFloat(additionalFees.toFixed(2)),
            total_fees: parseFloat(totalFees.toFixed(2))
          };
        }
        
        // Save the match to comparison
        // Create matchedProducts object with correct marketplace keys
        const matchedProducts: Record<string, any[]> = {
          amazon: [],
          walmart: []
        };
        
        // Add the found match to the correct marketplace array
        matchedProducts[matchFound.marketplace] = [
          {
            title: matchFound.title,
            price: matchFound.price,
            image: matchFound.imageUrl,
            url: matchFound.url,
            marketplace: matchFound.marketplace,
            similarity: matchFound.similarityScore,
            profit: {
              amount: parseFloat(profit.toFixed(2)),
              percentage: parseFloat(profitPercentage.toFixed(2))
            },
            fee_breakdown: feeBreakdown
          }
        ];
        
        const comparison = {
          sourceProduct: currentProduct,
          matchedProducts: matchedProducts,
          timestamp: Date.now(),
          manualMatch: true,
          similarity: matchFound.similarityScore,
          searchUrl: destinationUrl
        };
        
        // Set the comparison in store and save to storage
        setComparison(comparison);
        // FIX 3: Already persisted in setComparison
        
        setStatus(`Found match with ${Math.round(matchFound.similarityScore * 100)}% similarity on ${matchFound.marketplace}`);
      } else {
        // If no match found, create an empty comparison result with search URL
        // This will show "No matches found" but still provide the search URL for manual searching
        // Create matchedProducts object with both marketplace keys for consistency
        const emptyMatchedProducts: Record<string, any[]> = {
          amazon: [],
          walmart: []
        };
        
        // Ensure the destination marketplace has an empty array
        emptyMatchedProducts[destinationMarketplace] = [];
        
        const emptyComparison = {
          sourceProduct: currentProduct,
          matchedProducts: emptyMatchedProducts,
          timestamp: Date.now(),
          manualMatch: true,
          searchUrl: destinationUrl // Include the search URL for the "View Search" button
        };
        
        // Set the comparison with no matches
        setComparison(emptyComparison);
        
        // Close the search tab quietly in the background
        try {
          if (searchTab.id) {
            chrome.tabs.remove(searchTab.id);
          }
        } catch (error) {
          logger.error('Error closing search tab:', error);
        }
        
        // Show a status message
        setStatus('No automatic match found on ' + destinationMarketplace);
        setError('No good match found automatically. Use "View Search" to search manually.');
      }
    } catch (error) {
      setError(`Error searching for match: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
      chrome.storage.local.set({ manualMatchInProgress: false });
    }
  },
  
  clearCache: async () => {
    const { setStatus, setError } = get();
    
    try {
      const response = await sendMessage({ action: 'CLEAR_CACHE' });
      if (response && response.success) {
        setStatus('Cache cleared successfully');
      } else {
        setStatus('Failed to clear cache');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(`Error clearing cache: ${errorMessage}`);
      console.error('Error clearing cache:', error);
    }
  },
  
  saveSettings: async () => {
    const { settings, setStatus, setError } = get();
    
    try {
      const response = await sendMessage({ 
        action: 'UPDATE_SETTINGS', 
        settings 
      });
      
      if (response && response.success) {
        setStatus('Settings saved successfully');
      } else {
        setStatus('Failed to save settings');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(`Error saving settings: ${errorMessage}`);
      console.error('Error saving settings:', error);
    }
  },
  
  // Auth actions
  validateApiKey: async (apiKey: string) => {
    const { setLoading, setError, setAuthState, getCreditsBalance } = get();
    
    if (!apiKey || apiKey.trim() === '') {
      setError('Please enter a valid API key');
      return false;
    }
    
    setLoading(true);
    
    try {
      const response = await sendMessage({
        action: 'VALIDATE_API_KEY',
        apiKey: apiKey.trim()
      });
      
      if (response && response.success) {
        setAuthState({
          isAuthenticated: true,
          user: response.user
        });
        
        // Get latest credit balance
        await getCreditsBalance();
        
        return true;
      } else {
        setError('Invalid API key. Please check and try again.');
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(`Error validating API key: ${errorMessage}`);
      console.error('Error validating API key:', error);
      return false;
    } finally {
      setLoading(false);
    }
  },
  
  getCreditsBalance: async () => {
    const { setAuthState } = get();
    
    try {
      const response = await sendMessage({
        action: 'GET_CREDITS_BALANCE'
      });
      
      if (response && response.success) {
        // Update the credits in the auth state
        setAuthState({
          user: {
            ...get().authState.user!,
            credits: response.balance
          }
        });
        return response.balance;
      }
      
      return 0;
    } catch (error) {
      console.error('Error getting credits balance:', error);
      return 0;
    }
  },
  
  logout: async () => {
    const { setLoading, setError, setAuthState } = get();
    
    setLoading(true);
    
    try {
      await sendMessage({ action: 'LOGOUT' });
      
      setAuthState({
        isAuthenticated: false,
        user: null
      });
      
      return;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(`Error logging out: ${errorMessage}`);
      console.error('Error logging out:', error);
    } finally {
      setLoading(false);
    }
  }
}));

/**
 * Load settings from chrome storage
 * @returns Promise that resolves to loaded settings
 */
export async function loadSettings(): Promise<Settings> {
  return new Promise<Settings>((resolve) => {
    chrome.storage.local.get(['settings'], (result) => {
      const settings = result.settings || DEFAULT_SETTINGS;
      resolve(settings);
    });
  });
}

/**
 * Check authentication status on startup
 */
export async function checkAuthStatus(): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    chrome.storage.local.get(['apiKey'], async (result) => {
      if (result.apiKey) {
        // Verify the API key
        try {
          const response = await sendMessage({
            action: 'VALIDATE_API_KEY',
            apiKey: result.apiKey
          });
          
          if (response && response.success) {
            usePopupStore.getState().setAuthState({
              isAuthenticated: true,
              user: response.user
            });
            
            // Get latest credit balance
            await usePopupStore.getState().getCreditsBalance();
            
            resolve(true);
            return;
          }
        } catch (error) {
          console.error('Error verifying API key:', error);
        }
      }
      
      resolve(false);
    });
  });
}
