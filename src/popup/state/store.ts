// src/popup/state/store.ts - Central state store for popup

import { create } from 'zustand';
import { ProductData, ProductComparison, Settings, DEFAULT_SETTINGS } from '../../types';
import { sendMessage } from '../../common/messaging';

/**
 * Popup state interface
 */
interface PopupState {
  // Data
  currentProduct: ProductData | null;
  comparison: ProductComparison | null;
  settings: Settings;
  
  // UI state
  loading: boolean;
  error: string | null;
  status: string | null;
  activeTab: 'comparison' | 'settings';
  
  // Actions
  setCurrentProduct: (product: ProductData | null) => void;
  setComparison: (comparison: ProductComparison | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setStatus: (status: string | null) => void;
  setActiveTab: (tab: 'comparison' | 'settings') => void;
  updateSettings: (settings: Partial<Settings>) => void;
  
  // API actions
  loadProductData: () => Promise<void>;
  fetchPriceComparison: () => Promise<void>;
  clearCache: () => Promise<void>;
  saveSettings: () => Promise<void>;
}

/**
 * Create the popup store
 */
export const usePopupStore = create<PopupState>((set, get) => ({
  // Initial state
  currentProduct: null,
  comparison: null,
  settings: DEFAULT_SETTINGS,
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
      setComparison 
    } = get();
    
    if (!currentProduct) {
      setError('No product detected. Try visiting a product page first.');
      return;
    }
    
    setLoading(true);
    setError(null);
    setStatus('Fetching price comparison data...');
    
    try {
      const response = await sendMessage({ 
        action: 'GET_PRICE_COMPARISON', 
        productData: currentProduct 
      });
      
      if (response && response.success) {
        setComparison(response.data);
        setStatus('Price comparison data loaded successfully');
      } else {
        setError(response?.error || 'Failed to get price comparison');
        setStatus(response?.errorDetails || 'An unknown error occurred');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(`Error: ${errorMessage}`);
      console.error('Error fetching price comparison:', error);
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
  }
}));
