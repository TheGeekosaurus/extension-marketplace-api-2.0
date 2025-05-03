// src/popup/state/store.ts - Central state store for popup

import { create } from 'zustand';
import { ProductData, ProductComparison, Settings, ProductMatchResult } from '../../types';
import { sendMessage } from '../../common/messaging';
import { DEFAULT_SETTINGS } from '../../common/constants';

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
 * Manual match interface for tracking background searches
 */
interface ManualMatchState {
  isSearching: boolean;
  searchUrl: string | null;
  sourceProduct: ProductData | null;
  matchedProduct: ProductMatchResult | null;
  similarity: number | null;
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
  activeTab: 'comparison' | 'settings' | 'account';
  
  // Actions
  setCurrentProduct: (product: ProductData | null) => void;
  setComparison: (comparison: ProductComparison | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setStatus: (status: string | null) => void;
  setActiveTab: (tab: 'comparison' | 'settings' | 'account') => void;
  updateSettings: (settings: Partial<Settings>) => void;
  setAuthState: (state: Partial<AuthState>) => void;
  setManualMatchState: (state: Partial<ManualMatchState>) => void;
  
  // API actions
  loadProductData: () => Promise<void>;
  fetchPriceComparison: () => Promise<void>;
  findMatchManually: () => Promise<void>;
  clearCache: () => Promise<void>;
  saveSettings: () => Promise<void>;
  viewSearchResults: () => Promise<void>;
  
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
    isSearching: false,
    searchUrl: null,
    sourceProduct: null,
    matchedProduct: null,
    similarity: null
  },
  loading: false,
  error: null,
  status: null,
  activeTab: 'comparison',
  
  // State setters
  setCurrentProduct: (product) => set({ currentProduct: product }),
  setComparison: (comparison) => set({ comparison }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setStatus: (status) => set({ status }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  updateSettings: (partialSettings) => set((state) => ({
    settings: { ...state.settings, ...partialSettings }
  })),
  setAuthState: (partialState) => set((state) => ({
    authState: { ...state.authState, ...partialState }
  })),
  setManualMatchState: (partialState) => set((state) => ({
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
        chrome.storage.local.set({ currentProduct: response.productData });
        setStatus('Product data successfully retrieved from page');
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
    const { currentProduct, settings, setStatus, setError, setLoading, setManualMatchState } = get();
    
    if (!currentProduct) {
      setError('No product detected. Try visiting a product page first.');
      return;
    }
    
    // Determine destination marketplace
    const destinationMarketplace = settings.selectedMarketplace || 
      (currentProduct.marketplace === 'amazon' ? 'walmart' : 'amazon');
    
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
    setStatus(`Searching for matches on ${destinationMarketplace}...`);
    
    // Update manual match state
    setManualMatchState({
      isSearching: true,
      searchUrl: destinationUrl,
      sourceProduct: currentProduct,
      matchedProduct: null,
      similarity: null
    });
    
    try {
      // Send message to background script to perform search in background
      const response = await sendMessage({
        action: 'BACKGROUND_SEARCH',
        sourceProduct: currentProduct,
        searchUrl: destinationUrl,
        marketplace: destinationMarketplace
      });
      
      if (response && response.success) {
        setStatus('Search completed. Best match found.');
        
        // Create comparison from the match
        if (response.match) {
          // Update manual match state
          setManualMatchState({
            isSearching: false,
            matchedProduct: response.match,
            similarity: response.similarity || 0
          });
          
          // Create comparison object
          const matchedProducts: Record<string, ProductMatchResult[]> = {};
          matchedProducts[destinationMarketplace] = [response.match];
          
          // Set the comparison
          setComparison({
            sourceProduct: currentProduct,
            matchedProducts: matchedProducts,
            timestamp: Date.now(),
            manualMatch: true,
            similarity: response.similarity || 0,
            searchUrl: destinationUrl
          });
        } else {
          setError('No good matches found. Try refining your search or selecting a different marketplace.');
          setManualMatchState({
            isSearching: false
          });
        }
      } else {
        setError(response?.error || 'Failed to search for matches');
        setManualMatchState({
          isSearching: false
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(`Error searching for matches: ${errorMessage}`);
      setManualMatchState({
        isSearching: false
      });
      console.error('Error in manual match search:', error);
    } finally {
      setLoading(false);
    }
  },
  
  viewSearchResults: async () => {
    const { comparison } = get();
    
    if (!comparison || !comparison.searchUrl) {
      return;
    }
    
    // Open the search results in a new tab
    await chrome.tabs.create({ 
      url: comparison.searchUrl, 
      active: true 
    });
    
    // The matchFinder.ts script will automatically run on the search page
    // and highlight the matched product
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
