// src/popup/views/SettingsView.tsx - Settings tab content

import React, { useState } from 'react';
import { useSettings, useCurrentProduct } from '../state/selectors';
import { usePopupStore } from '../state/store';
import StatusMessage from '../components/StatusMessage';
import { ResellableMarketplaceType } from '../../types';

/**
 * Settings view component
 */
const SettingsView: React.FC = () => {
  // Get settings from store
  const settings = useSettings();
  const currentProduct = useCurrentProduct();
  
  // Local state for selector testing results
  const [selectorTestResults, setSelectorTestResults] = useState<any>(null);
  const [testingSelectors, setTestingSelectors] = useState(false);
  const [customStatus, setCustomStatus] = useState<string | null>(null);
  const [customError, setCustomError] = useState<string | null>(null);
  const [pageType, setPageType] = useState<'product' | 'search' | null>(null);
  const [activatingCategoryMode, setActivatingCategoryMode] = useState(false);
  const [walmartApiTestResult, setWalmartApiTestResult] = useState<{success: boolean, error?: string} | null>(null);
  
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
    setPageType(null);
    
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
        const pageTypeLabel = response.pageType === 'search' ? 'search page' : 'product page';
        setCustomStatus(`Selector test complete for ${response.marketplace} ${pageTypeLabel}`);
        setSelectorTestResults(response.results);
        setPageType(response.pageType);
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
        const pageTypeLabel = response.pageType === 'search' ? 'search page' : 'product page';
        setCustomStatus(`Highlighting selectors for ${response.marketplace} ${pageTypeLabel}. Click anywhere on the page to dismiss.`);
      } else {
        setCustomError(response?.error || 'Failed to highlight selectors. Make sure you are on a supported product page.');
      }
    } catch (error) {
      setCustomError(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  // Activate category mode on the current page
  const handleActivateCategoryMode = async () => {
    setActivatingCategoryMode(true);
    setCustomStatus('Activating category mode on current page...');
    setCustomError(null);
    
    try {
      // Get the current active tab
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs[0]?.id) {
        throw new Error('No active tab found');
      }
      
      // Check if the current tab is a search/category page
      const url = tabs[0].url || '';
      const isSearchPage = 
        (url.includes('amazon.com/s') || url.includes('amazon.com/search') || url.includes('amazon.com/b/')) ||
        (url.includes('walmart.com/search') || url.includes('walmart.com/browse') || url.includes('walmart.com/cp/'));
      
      if (!isSearchPage) {
        throw new Error('This tab is not a search or category page. Navigate to an Amazon or Walmart search/category page first.');
      }
      
      // Store category mode settings in local storage
      await new Promise<void>((resolve) => {
        chrome.storage.local.set(
          { 
            categoryModeEnabled: true,
            categoryMaxProducts: settings.categoryMaxProducts,
            categoryBatchSize: settings.categoryBatchSize
          }, 
          () => resolve()
        );
      });
      
      // Send message to content script to activate category mode
      const response = await new Promise<any>((resolve) => {
        chrome.tabs.sendMessage(
          tabs[0].id!, 
          { action: 'INIT_CATEGORY_MODE' }, 
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
        setCustomStatus('Category mode activated. Products are being extracted from the page.');
      } else {
        setCustomError(response?.error || 'Failed to activate category mode on the current page.');
      }
    } catch (error) {
      setCustomError(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setActivatingCategoryMode(false);
    }
  };

  // Test the MatchFinder in debug mode
  const handleTestMatchFinder = async () => {
    setCustomStatus('Launching Match Finder test mode...');
    setCustomError(null);
    
    try {
      // Make sure we have a current product
      if (!currentProduct) {
        throw new Error('No product data available. Please extract a product first.');
      }
      
      // Get the current active tab
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs[0]?.id) {
        throw new Error('No active tab found');
      }
      
      // Check if the current tab is a search page
      const url = tabs[0].url || '';
      const isSearchPage = 
        (url.includes('amazon.com/s') || url.includes('amazon.com/search')) ||
        (url.includes('walmart.com/search') || url.includes('walmart.com/browse'));
      
      if (!isSearchPage) {
        throw new Error('This tab is not a search page. Navigate to an Amazon or Walmart search page first.');
      }
      
      // Send message to content script to activate test mode
      const response = await new Promise<any>((resolve) => {
        chrome.tabs.sendMessage(
          tabs[0].id!, 
          { 
            action: 'TEST_MATCH_FINDER',
            sourceProduct: currentProduct
          }, 
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
        setCustomStatus('Match Finder test mode activated. Please check the search page for the debug panel.');
      } else {
        setCustomError(response?.error || 'Failed to activate Match Finder test mode.');
      }
    } catch (error) {
      setCustomError(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  // Test Walmart API connection
  const handleTestWalmartConnection = async () => {
    setWalmartApiTestResult(null);
    setCustomStatus('Testing Walmart API connection...');
    setCustomError(null);
    
    try {
      // Send message to background script to test the API connection
      const response = await chrome.runtime.sendMessage({
        action: 'TEST_WALMART_API_CONNECTION'
      });
      
      if (response && response.success) {
        setWalmartApiTestResult({ success: true });
        setCustomStatus('Walmart API connection test successful!');
      } else {
        setWalmartApiTestResult({ success: false, error: response?.error || 'Unknown error' });
        setCustomError(`Walmart API test failed: ${response?.error || 'Unknown error'}`);
      }
    } catch (error) {
      setWalmartApiTestResult({ success: false, error: String(error) });
      setCustomError(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  return (
    <div className="settings-container">
      <h3>Extension Settings</h3>
      
      {/* API settings are managed in constants.ts */}
      
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
        <h4>Category Mode</h4>
        <div className="setting-item checkbox">
          <input
            type="checkbox"
            id="categoryModeEnabled"
            name="categoryModeEnabled"
            checked={settings.categoryModeEnabled}
            onChange={handleSettingChange}
          />
          <label htmlFor="categoryModeEnabled">
            Enable Category Mode (extract multiple products from search/category pages)
          </label>
        </div>
        <p className="setting-description">
          Category mode allows you to extract multiple products from search or category pages and 
          find matches for them all at once. Go to the Categories tab to use this feature.
        </p>
        
        <div className="setting-item">
          <label htmlFor="categoryMaxProducts">Max Products to Extract:</label>
          <input
            type="number"
            id="categoryMaxProducts"
            name="categoryMaxProducts"
            min="1"
            max="50"
            value={settings.categoryMaxProducts}
            onChange={handleSettingChange}
            disabled={!settings.categoryModeEnabled}
          />
        </div>
        
        <div className="setting-item">
          <label htmlFor="categoryBatchSize">Batch Size for Processing:</label>
          <input
            type="number"
            id="categoryBatchSize"
            name="categoryBatchSize"
            min="1"
            max="10"
            value={settings.categoryBatchSize}
            onChange={handleSettingChange}
            disabled={!settings.categoryModeEnabled}
          />
        </div>
      </div>
      
      {/* Location settings removed as we're not reselling on Home Depot */}
      
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
        <h4>Walmart API Settings</h4>
        <p className="setting-description">
          Configure Walmart's Affiliate API for the official API button. This provides direct access to Walmart's product data.
        </p>

        <div className="direct-api-settings">
          <h5>Walmart API Configuration</h5>
            <div className="setting-item">
              <label htmlFor="walmartApiConfig.publisherId">Publisher ID:</label>
              <input
              type="text"
              id="walmartApiConfig.publisherId"
              name="walmartApiConfig.publisherId"
              value={settings.walmartApiConfig?.publisherId || ''}
              onChange={(e) => {
                // Ensure all required properties are included
                if (settings.walmartApiConfig) {
                  updateSettings({
                    walmartApiConfig: {
                      consumerId: settings.walmartApiConfig.consumerId,
                      privateKey: settings.walmartApiConfig.privateKey || '',
                      privateKeyVersion: settings.walmartApiConfig.privateKeyVersion || '1',
                      baseUrl: settings.walmartApiConfig.baseUrl || 'https://developer.api.walmart.com',
                      publisherId: e.target.value
                    }
                  });
                }
              }}
              placeholder="Your Impact Radius Publisher Id"
            />
          </div>
          <div className="setting-item">
            <label htmlFor="walmartApiConfig.privateKey">Private Key:</label>
            <textarea
              id="walmartApiConfig.privateKey"
              name="walmartApiConfig.privateKey"
              value={settings.walmartApiConfig?.privateKey || ''}
              onChange={(e) => {
                // Ensure all required properties are included
                if (settings.walmartApiConfig) {
                  updateSettings({
                    walmartApiConfig: {
                      consumerId: settings.walmartApiConfig.consumerId,
                      publisherId: settings.walmartApiConfig.publisherId || '',
                      privateKeyVersion: settings.walmartApiConfig.privateKeyVersion || '1',
                      baseUrl: settings.walmartApiConfig.baseUrl || 'https://developer.api.walmart.com',
                      privateKey: e.target.value
                    }
                  });
                }
              }}
              placeholder="Your private key (PEM format or base64 encoded)"
              rows={3}
            />
          </div>
          <p className="setting-note">
            Consumer ID is pre-configured as: {settings.walmartApiConfig?.consumerId || ''}
          </p>
          <div className="walmart-api-test">
            <button 
              className="test-connection-button" 
              onClick={handleTestWalmartConnection}
              disabled={!settings.walmartApiConfig?.publisherId || !settings.walmartApiConfig?.privateKey}
            >
              Test Walmart API Connection
            </button>
            {walmartApiTestResult && (
              <div className={`test-result ${walmartApiTestResult.success ? 'success' : 'error'}`}>
                {walmartApiTestResult.success ? (
                  <span>✅ Connection successful</span>
                ) : (
                  <span>❌ Error: {walmartApiTestResult.error}</span>
                )}
              </div>
            )}
          </div>
        </div>
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
      
      {/* Debug Tools Section */}
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
          
          {/* New Match Finder Test button */}
          <button 
            className="debug-button match-finder-test" 
            onClick={handleTestMatchFinder}
            disabled={!currentProduct}
            title={!currentProduct ? 'Extract a product first' : 'Test Match Finder on a search page'}
          >
            Test Match Finder
          </button>
        </div>
        
        <small>
          Note: You must be on a supported marketplace page to use these tools.
        </small>
      </div>
      
      {/* Display selector test results */}
      {selectorTestResults && (
        <div className="selector-test-results">
          <h4>Selector Test Results {pageType ? `(${pageType} page)` : ''}</h4>
          
          {/* Display search page specific extraction results if this is a search page */}
          {pageType === 'search' && selectorTestResults.extractionResult && (
            <div className="extraction-results">
              <h5>Search Result Extraction</h5>
              <div className={`extraction-status ${selectorTestResults.extractionResult.success ? 'success' : 'failure'}`}>
                {selectorTestResults.extractionResult.success ? (
                  <div>✅ Successfully found {selectorTestResults.extractionResult.elements} search result elements</div>
                ) : (
                  <div>❌ Failed to extract search results: {selectorTestResults.extractionResult.error || 'No elements found'}</div>
                )}
              </div>
            </div>
          )}
          
          {/* Results for selector groups */}
          {Object.entries(pageType === 'search' ? selectorTestResults.selectorResults : selectorTestResults).map(([groupName, group]: [string, any]) => (
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