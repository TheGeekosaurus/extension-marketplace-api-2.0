// src/popup/Popup.tsx - Main popup component

import React, { useEffect } from 'react';
import { usePopupStore } from './state/store';
import { useActiveTab } from './state/selectors';
import ComparisonView from './views/ComparisonView';
import SettingsView from './views/SettingsView';
import { VERSION } from '../common/constants';
import './Popup.css';

/**
 * Main popup component
 */
const Popup: React.FC = () => {
  // Get active tab and tab switching function from store
  const activeTab = useActiveTab();
  const setActiveTab = usePopupStore(state => state.setActiveTab);
  
  // Other actions from store
  const setCurrentProduct = usePopupStore(state => state.setCurrentProduct);
  const updateSettings = usePopupStore(state => state.updateSettings);
  const setStatus = usePopupStore(state => state.setStatus);
  
  // Load current product and settings on mount
  useEffect(() => {
    console.log('Popup component mounted');
    
    // Check if we're on a supported website
    checkCurrentTab();
    
    // Load stored data
    chrome.storage.local.get(['currentProduct', 'settings'], (result) => {
      console.log('Loaded from storage:', result);
      
      if (result.currentProduct) {
        setCurrentProduct(result.currentProduct);
        setStatus('Product data loaded from storage');
      } else {
        setStatus('No product data in storage. Try visiting a product page first.');
      }
      
      if (result.settings) {
        updateSettings(result.settings);
      }
    });
  }, []);

  // Check if the current tab is a supported website
  const checkCurrentTab = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentTab = tabs[0];
      if (!currentTab?.url) return;
      
      const isProductPage = (
        currentTab.url.includes('amazon.com') || 
        currentTab.url.includes('walmart.com') || 
        currentTab.url.includes('target.com')
      );
      
      if (!isProductPage) {
        setStatus('Please navigate to a product page on Amazon, Walmart, or Target.');
      }
    });
  };

  return (
    <div className="popup-container">
      <header className="popup-header">
        <h1>E-commerce Arbitrage Assistant</h1>
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
        </div>
      </header>
      
      <main className="popup-content">
        {activeTab === 'comparison' ? <ComparisonView /> : <SettingsView />}
      </main>
      
      <footer className="popup-footer">
        <p>E-commerce Arbitrage Assistant v{VERSION}</p>
      </footer>
    </div>
  );
};

export default Popup;
