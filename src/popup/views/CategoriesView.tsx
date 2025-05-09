// src/popup/views/CategoriesView.tsx - Categories tab content
import React, { useState, useEffect } from 'react';
import { usePopupStore } from '../state/store';
import { useSettings, useLoading } from '../state/selectors';
import { formatDate, formatMarketplace } from '../../common/formatting';
import StatusMessage from '../components/StatusMessage';
import { ProductComparison, ProductData } from '../../types';

/**
 * Categories view for showing batch processing of category pages
 */
const CategoriesView: React.FC = () => {
  // Local state
  const [categoryResults, setCategoryResults] = useState<ProductComparison[]>([]);
  const [hasResults, setHasResults] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [categoryPageInfo, setCategoryPageInfo] = useState<any>(null);
  const [targetMarketplace, setTargetMarketplace] = useState<string>('walmart');
  
  // Get state from store
  const settings = useSettings();
  const loading = useLoading();
  const setStatus = usePopupStore(state => state.setStatus);
  const setError = usePopupStore(state => state.setError);
  
  // Load category results on mount
  useEffect(() => {
    // Load category results and page info from storage
    chrome.storage.local.get(['categoryComparisons', 'categoryPageResult'], (result) => {
      if (result.categoryComparisons && Array.isArray(result.categoryComparisons) && result.categoryComparisons.length > 0) {
        setCategoryResults(result.categoryComparisons);
        setHasResults(true);
        
        // Determine target marketplace from the results
        if (result.categoryComparisons[0].matchedProducts) {
          // Get the first marketplace that has results
          const firstKey = Object.keys(result.categoryComparisons[0].matchedProducts)[0];
          if (firstKey) {
            setTargetMarketplace(firstKey);
          }
        }
      }
      
      if (result.categoryPageResult) {
        setCategoryPageInfo(result.categoryPageResult);
      }
    });

    // Set up a storage listener to update when results change
    const storageListener = (changes: any, areaName: string) => {
      if (areaName === 'local') {
        if (changes.categoryComparisons) {
          setCategoryResults(changes.categoryComparisons.newValue || []);
          setHasResults(changes.categoryComparisons.newValue?.length > 0);
        }
        if (changes.categoryPageResult) {
          setCategoryPageInfo(changes.categoryPageResult.newValue);
        }
      }
    };

    chrome.storage.onChanged.addListener(storageListener);
    
    // Clean up listener on unmount
    return () => {
      chrome.storage.onChanged.removeListener(storageListener);
    };
  }, []);
  
  // We've removed handleScrapeCurrentPage as handleActivateCategoryMode now takes care of scraping
  
  // Handle finding matches with browser-based method
  const handleFindMatchesBrowser = async () => {
    if (!categoryPageInfo) {
      setError('No category page has been scraped yet. Please scrape a category page first.');
      return;
    }
    
    setIsProcessing(true);
    setStatus('Starting browser-based matching process...');
    
    try {
      // Get the current active tab
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs[0]?.id) {
        throw new Error('No active tab found');
      }
      
      console.log('Sending START_CATEGORY_BATCH_PROCESSING message to tab', tabs[0].id);
      
      // First ensure category mode is enabled in storage
      await new Promise<void>((resolve) => {
        chrome.storage.local.set({
          categoryModeEnabled: true,
          targetMarketplace: 'walmart',
          useApiMatching: false // Set to false to use browser-based matching
        }, () => resolve());
      });
      
      // First, make sure category mode is initialized again
      chrome.tabs.sendMessage(
        tabs[0].id!,
        { action: 'INIT_CATEGORY_MODE' },
        (initResponse) => {
          if (chrome.runtime.lastError) {
            console.error('Error initializing category mode:', chrome.runtime.lastError);
            setError(`Error initializing: ${chrome.runtime.lastError.message}`);
            setIsProcessing(false);
            return;
          }
          
          console.log('Category mode initialization response:', initResponse);
          
          // Give time for initialization to complete
          setTimeout(() => {
            // Now start batch processing
            chrome.tabs.sendMessage(
              tabs[0].id!,
              { action: 'START_CATEGORY_BATCH_PROCESSING', method: 'browser' },
              (response) => {
                if (chrome.runtime.lastError) {
                  console.error('Error starting batch processing:', chrome.runtime.lastError);
                  setError(`Error: ${chrome.runtime.lastError.message}`);
                  setIsProcessing(false);
                  return;
                }
                
                console.log('Batch processing response:', response);
                
                if (response && response.success) {
                  setStatus('Browser-based matching started. This may take a while...');
                  
                  // Set up a listener for batch completion
                  chrome.runtime.onMessage.addListener(function batchListener(message) {
                    console.log('Received message in listener:', message);
                    
                    if (message.action === 'CATEGORY_PROCESSING_COMPLETE') {
                      console.log('Category processing complete notification received');
                      
                      // Remove the listener
                      chrome.runtime.onMessage.removeListener(batchListener);
                      
                      // Check for results
                      chrome.storage.local.get(['categoryComparisons'], (result) => {
                        console.log('Retrieved category comparisons from storage:', result);
                        
                        if (result.categoryComparisons && Array.isArray(result.categoryComparisons)) {
                          setCategoryResults(result.categoryComparisons);
                          setHasResults(true);
                          setStatus(`Browser matching complete. Found ${result.categoryComparisons.length} matches.`);
                        } else {
                          setStatus('Processing complete but no matches were found.');
                        }
                        setIsProcessing(false);
                      });
                    }
                  });
                } else {
                  setError(response?.error || 'Failed to start batch processing');
                  setIsProcessing(false);
                }
              }
            );
          }, 1000); // Wait 1 second after initialization
        }
      );
    } catch (error) {
      console.error('Error in handleFindMatchesBrowser:', error);
      setError(`Error: ${error instanceof Error ? error.message : String(error)}`);
      setIsProcessing(false);
    }
  };
  
  // Handle finding matches with API method
  const handleFindMatchesAPI = async () => {
    if (!categoryPageInfo) {
      setError('No category page has been scraped yet. Please scrape a category page first.');
      return;
    }
    
    setIsProcessing(true);
    setStatus('Starting API-based matching process...');
    
    try {
      // Get the current active tab
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs[0]?.id) {
        throw new Error('No active tab found');
      }
      
      console.log('Sending START_CATEGORY_BATCH_PROCESSING message to tab', tabs[0].id);
      
      // First ensure category mode is enabled in storage with API flag
      await new Promise<void>((resolve) => {
        chrome.storage.local.set({
          categoryModeEnabled: true,
          targetMarketplace: 'walmart',
          useApiMatching: true // Set to true to use API-based matching
        }, () => resolve());
      });
      
      // First, make sure category mode is initialized again
      chrome.tabs.sendMessage(
        tabs[0].id!,
        { action: 'INIT_CATEGORY_MODE' },
        (initResponse) => {
          if (chrome.runtime.lastError) {
            console.error('Error initializing category mode:', chrome.runtime.lastError);
            setError(`Error initializing: ${chrome.runtime.lastError.message}`);
            setIsProcessing(false);
            return;
          }
          
          console.log('Category mode initialization response:', initResponse);
          
          // Give time for initialization to complete
          setTimeout(() => {
            // Now start batch processing with API method
            chrome.tabs.sendMessage(
              tabs[0].id!,
              { action: 'START_CATEGORY_BATCH_PROCESSING', method: 'api' },
              (response) => {
                if (chrome.runtime.lastError) {
                  console.error('Error starting API batch processing:', chrome.runtime.lastError);
                  setError(`Error: ${chrome.runtime.lastError.message}`);
                  setIsProcessing(false);
                  return;
                }
                
                console.log('API batch processing response:', response);
                
                if (response && response.success) {
                  setStatus('API-based matching started. This may take a while...');
                  
                  // Set up a listener for batch completion
                  chrome.runtime.onMessage.addListener(function batchListener(message) {
                    console.log('Received message in listener:', message);
                    
                    if (message.action === 'CATEGORY_PROCESSING_COMPLETE') {
                      console.log('Category processing complete notification received');
                      
                      // Remove the listener
                      chrome.runtime.onMessage.removeListener(batchListener);
                      
                      // Check for results
                      chrome.storage.local.get(['categoryComparisons'], (result) => {
                        console.log('Retrieved category comparisons from storage:', result);
                        
                        if (result.categoryComparisons && Array.isArray(result.categoryComparisons)) {
                          setCategoryResults(result.categoryComparisons);
                          setHasResults(true);
                          setStatus(`API matching complete. Found ${result.categoryComparisons.length} matches.`);
                        } else {
                          setStatus('Processing complete but no matches were found.');
                        }
                        setIsProcessing(false);
                      });
                    }
                  });
                } else {
                  setError(response?.error || 'Failed to start API batch processing');
                  setIsProcessing(false);
                }
              }
            );
          }, 1000); // Wait 1 second after initialization
        }
      );
    } catch (error) {
      console.error('Error in handleFindMatchesAPI:', error);
      setError(`Error: ${error instanceof Error ? error.message : String(error)}`);
      setIsProcessing(false);
    }
  };
  
  // Handle clearing results
  const handleClearResults = () => {
    chrome.storage.local.remove(['categoryComparisons', 'categoryPageResult'], () => {
      setCategoryResults([]);
      setCategoryPageInfo(null);
      setHasResults(false);
      setStatus('Category results cleared');
    });
  };
  
  // We've removed the view toggle functionality to only show cards
  
  // Handle activating category mode on the current page
  const handleActivateCategoryMode = async () => {
    setIsProcessing(true);
    setStatus('Activating category mode on current page...');
    setError(null);
    
    try {
      // Get the current active tab
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs[0]?.id) {
        throw new Error('No active tab found');
      }
      
      // Check if the current tab is a search/category page
      const url = tabs[0].url || '';
      const isSearchPage = 
        (url.includes('amazon.com/s') || url.includes('amazon.com/search') || 
         url.includes('amazon.com/b/') || url.includes('node=')) ||
        (url.includes('walmart.com/search') || url.includes('walmart.com/browse') || 
         url.includes('walmart.com/cp/'));
      
      if (!isSearchPage) {
        throw new Error('This tab is not a search or category page. Navigate to an Amazon or Walmart search/category page first.');
      }
      
      // Store category mode settings in local storage
      await new Promise<void>((resolve) => {
        chrome.storage.local.set(
          { 
            categoryModeEnabled: true,
            categoryMaxProducts: settings.categoryMaxProducts || 20,
            categoryBatchSize: settings.categoryBatchSize || 5,
            targetMarketplace: 'walmart' // Set default target marketplace
          }, 
          () => resolve()
        );
      });
      
      console.log('Sending INIT_CATEGORY_MODE message to content script');
      
      // Send message to content script to activate category mode
      const response = await new Promise<any>((resolve) => {
        chrome.tabs.sendMessage(
          tabs[0].id!, 
          { action: 'INIT_CATEGORY_MODE' }, 
          (response) => {
            if (chrome.runtime.lastError) {
              console.error('Error sending message:', chrome.runtime.lastError);
              resolve({ 
                success: false, 
                error: chrome.runtime.lastError.message 
              });
              return;
            }
            console.log('Received response from content script:', response);
            resolve(response);
          }
        );
      });
      
      if (response && response.success) {
        setStatus('Category mode activated. Products are being extracted from the page.');
        
        // Wait a bit for the category processing to complete and store the results
        setTimeout(() => {
          chrome.storage.local.get(['categoryPageResult'], (result) => {
            if (result.categoryPageResult) {
              console.log('Category page result loaded from storage:', result.categoryPageResult);
              setCategoryPageInfo(result.categoryPageResult);
            } else {
              console.warn('No category page result found in storage');
            }
          });
        }, 1500); // Increased timeout to give more time for processing
      } else {
        throw new Error(response?.error || 'Failed to activate category mode on the current page.');
      }
    } catch (error) {
      console.error('Error in handleActivateCategoryMode:', error);
      setError(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Render a simple table of products scraped from the category page
  const renderScrapedProducts = () => {
    if (!categoryPageInfo || !categoryPageInfo.products || categoryPageInfo.products.length === 0) {
      return <p>No products found on the page.</p>;
    }

    return (
      <div className="scraped-products-list">
        <h4>Scraped Products</h4>
        <div className="scraped-products-table">
          <table>
            <thead>
              <tr>
                <th>Image</th>
                <th>Title</th>
                <th>Price</th>
                <th>Brand</th>
              </tr>
            </thead>
            <tbody>
              {categoryPageInfo.products.slice(0, 10).map((product: ProductData, index: number) => (
                <tr key={index}>
                  <td>
                    {product.imageUrl && 
                      <img 
                        src={product.imageUrl} 
                        alt={product.title} 
                        className="product-thumbnail" 
                      />
                    }
                  </td>
                  <td>{product.title}</td>
                  <td>${product.price?.toFixed(2)}</td>
                  <td>{product.brand || 'N/A'}</td>
                </tr>
              ))}
              {categoryPageInfo.products.length > 10 && (
                <tr>
                  <td colSpan={4} className="more-products">
                    ...and {categoryPageInfo.products.length - 10} more products
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="categories-container">
      <h3>Category Products</h3>
      
      {!hasResults ? (
        <div className="category-setup">
          <p className="intro-text">
            This tab allows you to extract multiple products from a category or search results page
            and find matches for them all at once.
          </p>
          
          {categoryPageInfo ? (
            <div className="scraped-page-info">
              <h4>Category Page Scraped</h4>
              <p>Found {categoryPageInfo.products.length} products from {categoryPageInfo.marketplace} category page.</p>
              <p className="page-url">{categoryPageInfo.pageUrl}</p>
              
              {/* Show the scraped products table */}
              {renderScrapedProducts()}
              
              <div className="button-group">
                <button
                  className="find-matches-button browser"
                  onClick={handleFindMatchesBrowser}
                  disabled={isProcessing || loading}
                >
                  {isProcessing ? 'Processing...' : 'Find Matches in Browser'}
                </button>
                
                <button
                  className="find-matches-button api"
                  onClick={handleFindMatchesAPI}
                  disabled={isProcessing || loading}
                >
                  {isProcessing ? 'Processing...' : 'Find Matches via API'}
                </button>
                
                <button
                  className="reset-button"
                  onClick={() => {
                    setCategoryPageInfo(null);
                    chrome.storage.local.remove(['categoryPageResult']);
                  }}
                  disabled={isProcessing || loading}
                >
                  Scan Different Page
                </button>
              </div>
            </div>
          ) : (
            <div className="scraping-controls">
              <p className="instructions">
                To get started, navigate to a category or search results page on Amazon or Walmart,
                then click the button below to extract products.
              </p>
              
              <button
                className="activate-category-mode-button"
                onClick={handleActivateCategoryMode}
                disabled={isProcessing || loading}
              >
                {isProcessing ? 'Activating...' : 'Activate on Current Page'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="category-results-wrapper">
          <div className="results-header">
            <div className="info">
              <h4>Category Results</h4>
              <p>Found {categoryResults.length} products from category page</p>
            </div>
            
            <div className="controls">
              <button 
                className="clear-results-button"
                onClick={handleClearResults}
              >
                Clear Results
              </button>
            </div>
          </div>
          
          {/* Display results in card view - we've removed the table view option */}
          <div className="category-cards">
            {categoryResults.map((comparison, index) => {
              const sourceProduct = comparison.sourceProduct;
              const targetProducts = comparison.matchedProducts?.[targetMarketplace as keyof typeof comparison.matchedProducts] || [];
              const bestMatch = targetProducts[0]; // Get the first match as the best match
              
              return (
                <div key={index} className="category-card">
                  <div className="source-product">
                    <h4>{sourceProduct.title}</h4>
                    <div className="product-details">
                      <img 
                        src={sourceProduct.imageUrl || 'placeholder.png'} 
                        alt={sourceProduct.title}
                        className="product-image"
                      />
                      <div className="product-info">
                        <p className="price">${sourceProduct.price?.toFixed(2)}</p>
                        <p className="marketplace">{formatMarketplace(sourceProduct.marketplace)}</p>
                        {sourceProduct.brand && <p className="brand">Brand: {sourceProduct.brand}</p>}
                        <a 
                          href={sourceProduct.pageUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="view-link"
                        >
                          View Product
                        </a>
                      </div>
                    </div>
                  </div>
                  
                  {bestMatch ? (
                    <div className="match-product">
                      <h4>Best Match</h4>
                      <div className="product-details">
                        <img 
                          src={bestMatch.image || 'placeholder.png'} 
                          alt={bestMatch.title}
                          className="product-image"
                        />
                        <div className="product-info">
                          <p className="title">{bestMatch.title}</p>
                          <p className="price">${bestMatch.price?.toFixed(2)}</p>
                          <p className="marketplace">{formatMarketplace(bestMatch.marketplace)}</p>
                          {bestMatch?.profit && (
                            <p className={`profit ${bestMatch.profit.amount > 0 ? 'positive' : 'negative'}`}>
                              Profit: ${bestMatch.profit.amount.toFixed(2)}
                            </p>
                          )}
                          <a 
                            href={bestMatch.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="view-link"
                          >
                            View Match
                          </a>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="no-match">
                      <p>No matches found for this product</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          <div className="results-footer">
            <p className="timestamp">
              Last updated: {formatDate(categoryResults[0]?.timestamp || Date.now())}
            </p>
          </div>
        </div>
      )}
      
      <StatusMessage />
    </div>
  );
};

export default CategoriesView;