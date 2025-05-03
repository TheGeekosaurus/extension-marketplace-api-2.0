// src/popup/Popup.tsx - Main popup component

import React, { useEffect } from 'react';
import { usePopupStore, checkAuthStatus, loadStoredState } from './state/store';
import { useActiveTab } from './state/selectors';
import ComparisonView from './views/ComparisonView';
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
  const updateSettings = usePopupStore(state => state.updateSettings);
  const setStatus = usePopupStore(state => state.setStatus);
  
  // Load stored state on mount
  useEffect(() => {
    console.log('Popup component mounted');
    
    const initializePopup = async () => {
      // Load stored state first
      await loadStoredState();
      
      // Check auth status
      await checkAuthStatus();
      
      // Check if we're on a supported website
      checkCurrentTab();
    };
    
    initializePopup();
  }, []);

  // Check if the current tab is a supported website
  const checkCurrentTab = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentTab = tabs[0];
      if (!currentTab?.url) return;
      
      const isProductPage = (
        currentTab.url.includes('amazon.com') || 
        currentTab.url.includes('walmart.com') || 
        currentTab.url.includes('target.com') ||
        currentTab.url.includes('homedepot.com')
      );
      
      if (!isProductPage) {
        setStatus('Please navigate to a product page on Amazon, Walmart, Target, or Home Depot.');
      }
    });
  };

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
            className={`tab-button ${activeTab === 'comparison' ? 'active' : ''}`}
            onClick={() => setActiveTab('comparison')}
          >
            Comparison
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
        {activeTab === 'comparison' ? (
          <ComparisonView />
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
