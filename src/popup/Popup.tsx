// Popup.tsx - Main extension UI component

import React, { useEffect, useState } from 'react';
import './Popup.css';

// Types
interface ProductData {
  title: string;
  price: number | null;
  marketplace: string;
  productId: string;
  brand: string | null;
  upc: string | null;
  asin: string | null;
  imageUrl: string | null;
  pageUrl: string;
}

interface ProductMatchResult {
  title: string;
  price: number | null;
  image: string | null;
  url: string;
  marketplace: string;
  item_id?: string;
  asin?: string;
  upc?: string;
  profit?: {
    amount: number;
    percentage: number;
  };
  ratings?: {
    average: number | null;
    count: number | null;
  };
}

interface ProductComparison {
  sourceProduct: ProductData;
  matchedProducts: {
    amazon?: ProductMatchResult[];
    walmart?: ProductMatchResult[];
    target?: ProductMatchResult[];
  };
  timestamp: number;
}

interface EstimatedFees {
  amazon: number;
  walmart: number;
  target: number;
}

interface Settings {
  apiBaseUrl: string;
  cacheExpiration: number;
  minimumProfitPercentage: number;
  includeFees: boolean;
  estimatedFees: EstimatedFees;
}

type TabType = 'comparison' | 'settings';

const Popup: React.FC = () => {
  // State
  const [currentProduct, setCurrentProduct] = useState<ProductData | null>(null);
  const [comparison, setComparison] = useState<ProductComparison | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>({
    apiBaseUrl: 'https://extension-marketplace-api-2-0-1.onrender.com/api',
    cacheExpiration: 24,
    minimumProfitPercentage: 10,
    includeFees: true,
    estimatedFees: {
      amazon: 0.15,
      walmart: 0.12,
      target: 0.10
    }
  });
  const [activeTab, setActiveTab] = useState<TabType>('comparison');

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
        setSettings(result.settings);
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

  // Manually request product data from the current page
  const requestProductData = () => {
    setStatus('Requesting fresh product data from page...');
    setError(null);
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0].id === undefined) {
        setError('Could not communicate with the current tab');
        return;
      }
      
      try {
        chrome.tabs.sendMessage(
          tabs[0].id, 
          { action: 'GET_PRODUCT_DATA' }, 
          (response) => {
            if (chrome.runtime.lastError) {
              console.error('Runtime error:', chrome.runtime.lastError);
              setError(`Communication error: ${chrome.runtime.lastError.message || 'Unknown error'}`);
              setStatus('Make sure you are on a product page and try refreshing.');
              return;
            }
            
            if (response && response.productData) {
              setCurrentProduct(response.productData);
              chrome.storage.local.set({ currentProduct: response.productData });
              setStatus('Product data successfully retrieved from page');
            } else {
              setError('No product data could be extracted from this page');
              setStatus('Make sure you are on a product page (not a search results page)');
            }
          }
        );
      } catch (err) {
        console.error('Error requesting product data:', err);
        setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
      }
    });
  };

  // Function to get price comparison
  const fetchPriceComparison = async () => {
    if (!currentProduct) {
      setError('No product detected. Try visiting a product page first.');
      return;
    }
    
    setLoading(true);
    setError(null);
    setStatus('Fetching price comparison data...');
    
    try {
      // Get price comparison from background script
      chrome.runtime.sendMessage(
        { action: 'GET_PRICE_COMPARISON', productData: currentProduct }, 
        (response) => {
          setLoading(false);
          
          if (chrome.runtime.lastError) {
            setError(`Error: ${chrome.runtime.lastError.message}`);
            return;
          }
          
          if (response && response.success) {
            setComparison(response.data);
            setStatus('Price comparison data loaded successfully');
          } else {
            setError(response?.error || 'Failed to get price comparison');
            setStatus(response?.errorDetails || 'An unknown error occurred');
          }
        }
      );
    } catch (err) {
      setLoading(false);
      setError('An error occurred while fetching price data');
      console.error('Error fetching price comparison:', err);
    }
  };

  // Function to clear cache
  const clearCache = () => {
    chrome.runtime.sendMessage({ action: 'CLEAR_CACHE' }, (response) => {
      if (response && response.success) {
        setStatus('Cache cleared successfully');
      } else {
        setStatus('Failed to clear cache');
      }
    });
  };

  // Function to save settings
  const saveSettings = () => {
    chrome.runtime.sendMessage(
      { action: 'UPDATE_SETTINGS', settings }, 
      (response) => {
        if (response && response.success) {
          setStatus('Settings saved successfully');
        } else {
          setStatus('Failed to save settings');
        }
      }
    );
  };

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
      setSettings((prev) => {
        return {
          ...prev,
          [name]: inputValue
        };
      });
    }
  };

  // Format price for display
  const formatPrice = (price: number | null): string => {
    if (price === null) return 'N/A';
    return `$${price.toFixed(2)}`;
  };

  // Format profit for display
  const formatProfit = (profit: { amount: number; percentage: number } | undefined): string => {
    if (!profit) return 'N/A';
    return `$${profit.amount.toFixed(2)} (${profit.percentage.toFixed(2)}%)`;
  };

  // Filter products by minimum profit
  const getFilteredProducts = (products: ProductMatchResult[] | undefined): ProductMatchResult[] => {
    if (!products) return [];
    
    return products.filter(product => 
      product.profit && product.profit.percentage >= settings.minimumProfitPercentage
    );
  };

  // Handle fee setting changes
  const handleFeeChange = (marketplace: keyof EstimatedFees, value: number) => {
    setSettings((prev) => {
      return {
        ...prev,
        estimatedFees: {
          ...prev.estimatedFees,
          [marketplace]: value / 100 // Convert from percentage to decimal
        }
      };
    });
  };

  // Render product comparison section
  const renderComparison = () => {
    return (
      <div className="comparison-container">
        <div className="source-product">
          <h3>Current Product</h3>
          
          {currentProduct ? (
            <div className="product-card">
              {currentProduct.imageUrl && (
                <img 
                  src={currentProduct.imageUrl} 
                  alt={currentProduct.title} 
                  className="product-image" 
                />
              )}
              <div className="product-info">
                <h4>{currentProduct.title}</h4>
                <p>Price: {formatPrice(currentProduct.price)}</p>
                <p>Platform: {currentProduct.marketplace}</p>
                {currentProduct.brand && <p>Brand: {currentProduct.brand}</p>}
                {currentProduct.upc && <p>UPC: {currentProduct.upc}</p>}
                {currentProduct.asin && <p>ASIN: {currentProduct.asin}</p>}
              </div>
            </div>
          ) : (
            <div className="no-product">
              <p>No product detected on this page.</p>
              <p>Please navigate to a product page on Amazon, Walmart, or Target.</p>
            </div>
          )}
          
          <div className="button-container">
            <button 
              className="refresh-button"
              onClick={requestProductData}
              disabled={loading}
            >
              Refresh Product Data
            </button>
            
            <button 
              className="compare-button"
              onClick={fetchPriceComparison}
              disabled={loading || !currentProduct}
            >
              {loading ? 'Loading...' : 'Find Arbitrage Opportunities'}
            </button>
          </div>
          
          {status && <div className="status-message">{status}</div>}
          {error && <div className="error-message">{error}</div>}
        </div>
        
        {comparison && (
          <div className="matched-products">
            <h3>Arbitrage Opportunities</h3>
            
            {/* Amazon matches */}
            {comparison.matchedProducts.amazon && comparison.matchedProducts.amazon.length > 0 && (
              <div className="marketplace-section">
                <h4>Amazon</h4>
                {getFilteredProducts(comparison.matchedProducts.amazon).length > 0 ? (
                  getFilteredProducts(comparison.matchedProducts.amazon).map((product, index) => (
                    <div key={`amazon-${index}`} className="product-card matched">
                      {product.image && (
                        <img 
                          src={product.image} 
                          alt={product.title} 
                          className="product-image" 
                        />
                      )}
                      <div className="product-info">
                        <h5>{product.title}</h5>
                        <p>Price: {formatPrice(product.price)}</p>
                        <p className={product.profit && product.profit.amount > 0 ? 'profit positive' : 'profit negative'}>
                          Profit: {formatProfit(product.profit)}
                        </p>
                        {product.ratings && (
                          <p>Rating: {product.ratings.average} ({product.ratings.count} reviews)</p>
                        )}
                        <a 
                          href={product.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="view-button"
                        >
                          View Product
                        </a>
                      </div>
                    </div>
                  ))
                ) : (
                  <p>No profitable opportunities found on Amazon.</p>
                )}
              </div>
            )}
            
            {/* Walmart matches */}
            {comparison.matchedProducts.walmart && comparison.matchedProducts.walmart.length > 0 && (
              <div className="marketplace-section">
                <h4>Walmart</h4>
                {getFilteredProducts(comparison.matchedProducts.walmart).length > 0 ? (
                  getFilteredProducts(comparison.matchedProducts.walmart).map((product, index) => (
                    <div key={`walmart-${index}`} className="product-card matched">
                      {product.image && (
                        <img 
                          src={product.image} 
                          alt={product.title} 
                          className="product-image" 
                        />
                      )}
                      <div className="product-info">
                        <h5>{product.title}</h5>
                        <p>Price: {formatPrice(product.price)}</p>
                        <p className={product.profit && product.profit.amount > 0 ? 'profit positive' : 'profit negative'}>
                          Profit: {formatProfit(product.profit)}
                        </p>
                        {product.ratings && (
                          <p>Rating: {product.ratings.average} ({product.ratings.count} reviews)</p>
                        )}
                        <a 
                          href={product.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="view-button"
                        >
                          View Product
                        </a>
                      </div>
                    </div>
                  ))
                ) : (
                  <p>No profitable opportunities found on Walmart.</p>
                )}
              </div>
            )}
            
            {/* Target matches */}
            {comparison.matchedProducts.target && comparison.matchedProducts.target.length > 0 && (
              <div className="marketplace-section">
                <h4>Target</h4>
                {getFilteredProducts(comparison.matchedProducts.target).length > 0 ? (
                  getFilteredProducts(comparison.matchedProducts.target).map((product, index) => (
                    <div key={`target-${index}`} className="product-card matched">
                      {product.image && (
                        <img 
                          src={product.image} 
                          alt={product.title} 
                          className="product-image" 
                        />
                      )}
                      <div className="product-info">
                        <h5>{product.title}</h5>
                        <p>Price: {formatPrice(product.price)}</p>
                        <p className={product.profit && product.profit.amount > 0 ? 'profit positive' : 'profit negative'}>
                          Profit: {formatProfit(product.profit)}
                        </p>
                        {product.ratings && (
                          <p>Rating: {product.ratings.average} ({product.ratings.count} reviews)</p>
                        )}
                        <a 
                          href={product.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="view-button"
                        >
                          View Product
                        </a>
                      </div>
                    </div>
                  ))
                ) : (
                  <p>No profitable opportunities found on Target.</p>
                )}
              </div>
            )}
            
            {/* No matches found */}
            {Object.keys(comparison.matchedProducts).length === 0 && (
              <p>No matching products found on other marketplaces.</p>
            )}
            
            <div className="comparison-footer">
              <p className="timestamp">
                Last updated: {new Date(comparison.timestamp).toLocaleString()}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render settings section
  const renderSettings = () => {
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
              onChange={(e) => handleFeeChange('amazon', parseFloat(e.target.value))}
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
              onChange={(e) => handleFeeChange('walmart', parseFloat(e.target.value))}
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
              onChange={(e) => handleFeeChange('target', parseFloat(e.target.value))}
            />
          </div>
        </div>
        
        <button className="save-settings-button" onClick={saveSettings}>
          Save Settings
        </button>
        
        {status && <div className="status-message">{status}</div>}
      </div>
    );
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
        {activeTab === 'comparison' ? renderComparison() : renderSettings()}
      </main>
      
      <footer className="popup-footer">
        <p>E-commerce Arbitrage Assistant v1.0.0</p>
      </footer>
    </div>
  );
};

export default Popup;
