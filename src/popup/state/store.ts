// src/popup/state/store.ts - Central state store for popup

import { create } from 'zustand';
import { ProductData, ProductComparison, Settings, MarketplaceType } from '../../types';
import { findMatch } from '../../matchFinder';
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
  activeTab: 'comparison',
  
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
    const { currentProduct, settings, setStatus, setError, setLoading, setManualMatch, setComparison, authState } = get();
    
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
    
    // Determine destination marketplace
    const destinationMarketplace = settings.selectedMarketplace || 
      (currentProduct.marketplace === 'amazon' ? 'walmart' : 'amazon');
    
    setLoading(true);
    setStatus(`Searching ${destinationMarketplace.charAt(0).toUpperCase() + destinationMarketplace.slice(1)} in background...`);
    
    try {
      // Update manual match state to indicate we're searching
      setManualMatch({
        enabled: true,
        sourceProduct: currentProduct,
        searchUrl: null // Will be updated with the actual URL
      });
      
      // Use the new match finder module
      const result = await findMatch(
        currentProduct, 
        destinationMarketplace as 'amazon' | 'walmart',
        {
          includeBrand: true, 
          maxTitleWords: 10,
          timeout: 30000,
          minSimilarity: 0.3
        }
      );
      
      if (result.success && result.match) {
        // Handle successful match
        setStatus(`Found match with ${Math.round(result.match.similarityScore * 100)}% similarity on ${result.match.marketplace}`);
        
        // Calculate profit with fees if enabled
        let profit = 0;
        let profitPercentage = 0;
        
        if (currentProduct.price !== null) {
          profit = result.match.price - currentProduct.price;
          profitPercentage = ((result.match.price - currentProduct.price) / currentProduct.price) * 100;
        }
        
        // Create fee breakdown if settings include fees
        let feeBreakdown = null;
        
        if (settings.includeFees) {
          // Type guard - ensure marketplace is valid
          const marketplace = result.match.marketplace as keyof typeof settings.estimatedFees;
          const feePercentage = settings.estimatedFees[marketplace] || 0;
          const marketplaceFeeAmount = result.match.price * feePercentage;
          const additionalFees = settings.additionalFees || 0;
          const totalFees = marketplaceFeeAmount + additionalFees;
          
          // Recalculate profit with fees if price is available
          if (currentProduct.price !== null) {
            profit = result.match.price - currentProduct.price - totalFees;
            profitPercentage = (profit / currentProduct.price) * 100;
          }
          
          feeBreakdown = {
            marketplace_fee_percentage: feePercentage,
            marketplace_fee_amount: parseFloat(marketplaceFeeAmount.toFixed(2)),
            additional_fees: parseFloat(additionalFees.toFixed(2)),
            total_fees: parseFloat(totalFees.toFixed(2))
          };
        }
        
        // Create comparison object
        const comparison = {
          sourceProduct: currentProduct,
          matchedProducts: {
            [result.match.marketplace]: [
              {
                title: result.match.title,
                price: result.match.price,
                image: result.match.imageUrl,
                url: result.match.url,
                marketplace: result.match.marketplace,
                similarity: result.match.similarityScore,
                profit: {
                  amount: parseFloat(profit.toFixed(2)),
                  percentage: parseFloat(profitPercentage.toFixed(2))
                },
                fee_breakdown: feeBreakdown
              }
            ]
          },
          timestamp: Date.now(),
          manualMatch: true,
          similarity: result.match.similarityScore,
          searchUrl: result.match.searchUrl // Add the search URL for the "View Search" button
        };
        
        // Update the comparison state
        setComparison(comparison);
        
        // Update manual match state with search URL
        setManualMatch({
          enabled: true,
          sourceProduct: currentProduct,
          searchUrl: result.match.url
        });
      } else {
        // Handle no match found
        setError(result.error || 'No suitable match found');
        
        // Let the user know they can try a manual search
        setStatus('Try creating a manual search with more specific keywords');
      }
    } catch (error) {
      setError(`Error searching for match: ${error instanceof Error ? error.message : String(error)}`);
      console.error('Error in findMatchManually:', error);
    } finally {
      setLoading(false);
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
