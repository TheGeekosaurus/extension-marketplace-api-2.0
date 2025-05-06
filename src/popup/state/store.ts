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
  searchUrl: string | null; // Keep as string | null here
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
    // Persist the current product state
    if (product) {
      chrome.storage.local.set({ currentProduct: product });
    }
  },
  setComparison: (comparison) => {
    set({ comparison });
    // Persist the comparison state
    if (comparison) {
      chrome.storage.local.set({ comparison });
    }
  },
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setStatus: (status) => set({ status }),
  setActiveTab: (tab) => {
    set({ activeTab: tab });
    // Persist the active tab
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
  
  // Rest of the actions...
  // (other methods omitted for brevity)
}));

// Rest of the file...
