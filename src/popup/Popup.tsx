// src/popup/Popup.tsx - Main popup component

import React, { useEffect } from 'react';
import { usePopupStore, checkAuthStatus } from './state/store';
import { useActiveTab } from './state/selectors';
import ComparisonView from './views/ComparisonView';
import CategoriesView from './views/CategoriesView';
import SettingsView from './views/SettingsView';
import AccountView from './views/AccountView';
import { VERSION } from '../common/constants';
import './Popup.css';

/**
 * Main popup component
 */
const Popup: React.FC = () => {
  // Get active tab and tab switching function from store
  const activeTab = useActiveTab();
  const setActiveTab = usePopupStore(state => state.setActiveTab);
  const authState = usePopupStore(state => state.authState);
  
  // Other actions from store
  const setCurrentProduct = usePopupStore(state => state.setCurrentProduct);
  const setComparison = usePopupStore(state => state.setComparison);
  const updateSettings = usePopupStore(state => state.updateSettings);
  const setStatus = usePopupStore(state => state.setStatus);
  
  // Load current product and settings on mount
  useEffect(() => {
    console.log('Popup component mounted');
    
    // Check auth status on mount
    checkAuthStatus();
    
    // FIX 3: Load all stored state on mount
    chrome.storage.local.get(['currentProduct', 'comparison', 'settings', 'activeTab'], (result) => {
      console.log('Loaded from storage:', result);
      
      // Load current product if available
      if (result.currentProduct) {
        setCurrentProduct(result.currentProduct);
        setStatus('Product data loaded from storage');
      }
      
      // Load comparison if available
      if (result.comparison) {
        setComparison(result.comparison);
      }
      
      // Load settings if available
      if (result.settings) {
        updateSettings(result.settings);
      }
      
      // Load active tab if available
      if (result.activeTab) {
        setActiveTab(result.activeTab);
      }
    });
    
    // FIX 3: Add listener for the beforeunload event to persist state
    const beforeUnloadListener = () => {
      // No need to do anything here as the state is already persisted
      // on each update in the store.ts file
      console.log("Extension popup closing");
    };
    
    window.addEventListener('beforeunload', beforeUnloadListener);
    
    // Clean up event listener
    return () => {
      window.removeEventListener('beforeunload', beforeUnloadListener);
    };
  }, []);

  return (
    <div className="popup-container">
      <header className="popup-header">
        <h1 className="text-xl font-bold">E-commerce Arbitrage Assistant</h1>
        
        {/* Show credit balance if authenticated */}
        {authState.isAuthenticated && (
          <div className="text-sm text-right text-white/90 mb-2">
            Credits: <span className="font-semibold">{authState.user?.credits || 0}</span>
          </div>
        )}
        
        <div className="tab-navigation">
          <button
            className={`tab-button ${activeTab === 'product' ? 'active' : ''}`}
            onClick={() => setActiveTab('product')}
          >
            Product
          </button>
          <button
            className={`tab-button ${activeTab === 'categories' ? 'active' : ''}`}
            onClick={() => setActiveTab('categories')}
          >
            Categories
          </button>
          <button
            className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </button>
          <button
            className={`tab-button ${activeTab === 'account' ? 'active' : ''}`}
            onClick={() => setActiveTab('account')}
          >
            Account
          </button>
        </div>
      </header>
      
      <main className="popup-content">
        {activeTab === 'product' ? (
          <ComparisonView />
        ) : activeTab === 'categories' ? (
          <CategoriesView />
        ) : activeTab === 'settings' ? (
          <SettingsView />
        ) : (
          <AccountView />
        )}
      </main>
      
      <footer className="popup-footer">
        <p>E-commerce Arbitrage Assistant v{VERSION}</p>
      </footer>
    </div>
  );
};

export default Popup;
