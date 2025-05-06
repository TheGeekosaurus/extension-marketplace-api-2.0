// src/popup/views/SettingsView.tsx - Settings tab content

import React, { useState } from 'react';
import { useSettings } from '../state/selectors';
import { usePopupStore } from '../state/store';
import StatusMessage from '../components/StatusMessage';
import { ResellableMarketplaceType } from '../../types';

/**
 * Settings view component
 */
const SettingsView: React.FC = () => {
  // Get settings from store
  const settings = useSettings();
  
  // Local state for selector testing results
  const [selectorTestResults, setSelectorTestResults] = useState<any>(null);
  const [testingSelectors, setTestingSelectors] = useState(false);
  const [customStatus, setCustomStatus] = useState<string | null>(null);
  const [customError, setCustomError] = useState<string | null>(null);
  
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
          [name]: value === 'null' ? null : value as ResellableMarketplaceType 
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
  
  // Test selectors for the current marketplace page
  const handleTestSelectors = async () => {
    setTestingSelectors(true);
    setCustomStatus('Testing selectors on current page...');
    setCustomError(null);
    setSelectorTestResults(null);
    
    try {
      // Get the current active tab
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs[0]?.id) {
        throw new Error('No active tab found');
      }
      
      // Send message to content script to test selectors
      const response = await new Promise<any>((resolve) => {
        chrome.tabs.sendMessage(
          tabs[0].id!, 
          { action: 'DEBUG_SELECTORS' }, 
          (response) => {
            if (chrome.runtime.lastError) {
              resolve({ 
                success: false, 
                error: chrome.runtime.lastError.message 
              });
              return;
            }
            resolve(response);
          }
        );
      });
      
      if (response && response.success) {
        setCustomStatus(`Selector test complete for ${response.marketplace}`);
        setSelectorTestResults(response.results);
      } else {
        setCustomError(response?.error || 'Failed to test selectors. Make sure you are on a supported product page.');
      }
    } catch (error) {
      setCustomError(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setTestingSelectors(false);
    }
  };
  
  // Highlight selectors on the current page
  const handleHighlightSelectors = async () => {
    setCustomStatus('Highlighting selectors on current page...');
    setCustomError(null);
    
    try {
      // Get the current active tab
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs[0]?.id) {
        throw new Error('No active tab found');
      }
      
      // Send message to content script to highlight selectors
      const response = await new Promise<any>((resolve) => {
        chrome.tabs.sendMessage(
          tabs[0].id!, 
          { action: 'HIGHLIGHT_SELECTORS' }, 
          (response) => {
            if (chrome.runtime.lastError) {
              resolve({ 
                success: false, 
                error: chrome.runtime.lastError.message 
              });
              return;
            }
            resolve(response);
          }
        );
      });
      
      if (response && response.success) {
        setCustomStatus(`Highlighting selectors for ${response.marketplace}. Click anywhere on the page to dismiss.`);
      } else {
        setCustomError(response?.error || 'Failed to highlight selectors. Make sure you are on a supported product page.');
      }
    } catch (error) {
      setCustomError(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
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
          </select>
        </div>
      </div>
      
      <div className="settings-group">
        <h4>Location Settings</h4>
        <div className="setting-item">
          <label htmlFor="locationZipCode">Your ZIP Code (for location-specific pricing):</label>
          <input
            type="text"
            id="locationZipCode"
            name="locationZipCode"
            value={settings.locationZipCode || ''}
            onChange={handleSettingChange}
            placeholder="e.g. 90210"
          />
          <small>Used for Home Depot store-specific inventory and pricing</small>
        </div>
        <div className="setting-item">
          <label htmlFor="homeDepotStoreId">Home Depot Store ID (optional):</label>
          <input
            type="text"
            id="homeDepotStoreId"
            name="homeDepotStoreId"
            value={settings.homeDepotStoreId || ''}
            onChange={handleSettingChange}
            placeholder="e.g. 1234"
          />
          <small>Find your store ID at the end of a Home Depot store page URL</small>
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
        <h4>Fee Settings</h4>
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
        <div className="setting-item">
          <label htmlFor="estimatedFees.homedepot">Home Depot Fee (%):</label>
          <input
            type="number"
            id="estimatedFees.homedepot"
            name="estimatedFees.homedepot"
            min="0"
            max="100"
            step="0.1"
            value={settings.estimatedFees.homedepot * 100}
            onChange={handleFeeChange}
          />
        </div>
      </div>
      
      <div className="settings-group">
        <h4>Additional Fees</h4>
        <div className="setting-item">
          <label htmlFor="additionalFees">Additional Fees (shipping, packaging, etc.):</label>
          <input
            type="number"
            id="additionalFees"
            name="additionalFees"
            min="0"
            step="0.01"
            value={settings.additionalFees || 0}
            onChange={handleSettingChange}
            placeholder="Enter additional fixed fees"
          />
        </div>
      </div>
      
      {/* New: Debug Tools Section */}
      <div className="settings-group">
        <h4>Debug Tools</h4>
        <p className="setting-description">
          These tools help diagnose selector issues on marketplace pages.
        </p>
        
        <div className="button-container">
          <button 
            className="debug-button" 
            onClick={handleTestSelectors}
            disabled={testingSelectors}
          >
            {testingSelectors ? 'Testing...' : 'Test Selectors on Current Page'}
          </button>
          
          <button 
            className="highlight-button" 
            onClick={handleHighlightSelectors}
          >
            Highlight Elements on Page
          </button>
        </div>
        
        <small>
          Note: You must be on a supported marketplace product page (Amazon, Walmart, Target, Home Depot)
        </small>
      </div>
      
      {/* Display selector test results */}
      {selectorTestResults && (
        <div className="selector-test-results">
          <h4>Selector Test Results</h4>
          
          {Object.entries(selectorTestResults).map(([groupName, group]: [string, any]) => (
            <div key={groupName} className="selector-group">
              <h5>
                {groupName}: {group.foundCount}/{group.totalCount} selectors matched
              </h5>
              
              <div className="selector-details">
                {group.results.map((result: any, index: number) => (
                  <div 
                    key={index} 
                    className={`selector-result ${result.found ? 'success' : 'failure'}`}
                  >
                    <div className="selector-status">
                      {result.found ? '✅' : '❌'} {result.selector}
                    </div>
                    
                    {result.found && (
                      <div className="selector-info">
                        Found {result.count} element{result.count !== 1 ? 's' : ''}
                        {result.foundText && (
                          <div className="selector-text">
                            Text: "{result.foundText}"
                          </div>
                        )}
                      </div>
                    )}
                    
                    {!result.found && result.error && (
                      <div className="selector-error">
                        Error: {result.error}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      
      <button className="save-settings-button" onClick={saveSettings}>
        Save Settings
      </button>
      
      <StatusMessage 
        customStatus={customStatus}
        customError={customError}
      />
    </div>
  );
};

export default SettingsView;
