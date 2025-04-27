// src/popup/views/SettingsView.tsx - Settings tab content

import React from 'react';
import { useSettings } from '../state/selectors';
import { usePopupStore } from '../state/store';
import StatusMessage from '../components/StatusMessage';
import { MarketplaceType } from '../../types';

/**
 * Settings view component
 */
const SettingsView: React.FC = () => {
  // Get settings from store
  const settings = useSettings();
  
  // Get actions from store
  const updateSettings = usePopupStore(state => state.updateSettings);
  const saveSettings = usePopupStore(state => state.saveSettings);
  const clearCache = usePopupStore(state => state.clearCache);
  
  // Handle settings changes for simple fields
  const handleSettingChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const isCheckbox = type === 'checkbox';
    const inputValue = isCheckbox 
      ? (e.target as HTMLInputElement).checked 
      : type === 'number' 
        ? parseFloat(value) 
        : value;

    // For regular settings (not nested)
    if (!name.includes('.')) {
      if (name === 'selectedMarketplace') {
        // Handle the marketplace selection dropdown
        updateSettings({ 
          [name]: value === 'null' ? null : value as MarketplaceType 
        });
      } else {
        updateSettings({ [name]: inputValue });
      }
    }
  };
  
  // Handle fee setting changes
  const handleFeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const market = name.split('.')[1];
    
    // Convert from percentage to decimal (divide by 100)
    const feeValue = parseFloat(value) / 100;
    
    updateSettings({ 
      estimatedFees: {
        ...settings.estimatedFees,
        [market]: feeValue
      }
    });
  };
  
  return (
    <div className="settings-container">
      <h3>Extension Settings</h3>
      
      <div className="settings-group">
        <h4>API Settings</h4>
        <div className="setting-item">
          <label htmlFor="apiBaseUrl">API Base URL:</label>
          <input
            type="text"
            id="apiBaseUrl"
            name="apiBaseUrl"
            value={settings.apiBaseUrl}
            onChange={handleSettingChange}
          />
        </div>
      </div>
      
      <div className="settings-group">
        <h4>Search Settings</h4>
        <div className="setting-item">
          <label htmlFor="selectedMarketplace">Search Only In:</label>
          <select
            id="selectedMarketplace"
            name="selectedMarketplace"
            value={settings.selectedMarketplace || 'null'}
            onChange={handleSettingChange}
          >
            <option value="null">All Marketplaces</option>
            <option value="amazon">Amazon Only</option>
            <option value="walmart">Walmart Only</option>
            <option value="target">Target Only</option>
          </select>
        </div>
      </div>
      
      <div className="settings-group">
        <h4>Cache Settings</h4>
        <div className="setting-item">
          <label htmlFor="cacheExpiration">Cache Expiration (hours):</label>
          <input
            type="number"
            id="cacheExpiration"
            name="cacheExpiration"
            min="1"
            max="72"
            value={settings.cacheExpiration}
            onChange={handleSettingChange}
          />
        </div>
        <button className="clear-cache-button" onClick={clearCache}>
          Clear Cache
        </button>
      </div>
      
      <div className="settings-group">
        <h4>Arbitrage Settings</h4>
        <div className="setting-item">
          <label htmlFor="minimumProfitPercentage">
            Minimum Profit Percentage:
          </label>
          <input
            type="number"
            id="minimumProfitPercentage"
            name="minimumProfitPercentage"
            min="0"
            max="100"
            value={settings.minimumProfitPercentage}
            onChange={handleSettingChange}
          />
        </div>
        <div className="setting-item checkbox">
          <input
            type="checkbox"
            id="includeFees"
            name="includeFees"
            checked={settings.includeFees}
            onChange={handleSettingChange}
          />
          <label htmlFor="includeFees">
            Include estimated marketplace fees in calculations
          </label>
        </div>
      </div>
      
      <div className="settings-group">
        <h4>Estimated Marketplace Fees</h4>
        <div className="setting-item">
          <label htmlFor="estimatedFees.amazon">Amazon Fee (%):</label>
          <input
            type="number"
            id="estimatedFees.amazon"
            name="estimatedFees.amazon"
            min="0"
            max="100"
            step="0.1"
            value={settings.estimatedFees.amazon * 100}
            onChange={handleFeeChange}
          />
        </div>
        <div className="setting-item">
          <label htmlFor="estimatedFees.walmart">Walmart Fee (%):</label>
          <input
            type="number"
            id="estimatedFees.walmart"
            name="estimatedFees.walmart"
            min="0"
            max="100"
            step="0.1"
            value={settings.estimatedFees.walmart * 100}
            onChange={handleFeeChange}
          />
        </div>
        <div className="setting-item">
          <label htmlFor="estimatedFees.target">Target Fee (%):</label>
          <input
            type="number"
            id="estimatedFees.target"
            name="estimatedFees.target"
            min="0"
            max="100"
            step="0.1"
            value={settings.estimatedFees.target * 100}
            onChange={handleFeeChange}
          />
        </div>
      </div>
      
      <button className="save-settings-button" onClick={saveSettings}>
        Save Settings
      </button>
      
      <StatusMessage />
    </div>
  );
};

export default SettingsView;
