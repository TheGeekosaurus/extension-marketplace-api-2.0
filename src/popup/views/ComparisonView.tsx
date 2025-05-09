// src/popup/views/ComparisonView.tsx - Comparison tab content

import React from 'react';
import { 
  useCurrentProduct, 
  useComparison, 
  useLoading, 
  useTotalPotentialProfit,
  useSettings,
  useAuth
} from '../state/selectors';
import { usePopupStore } from '../state/store';
import { formatDate, formatMarketplace } from '../../common/formatting';
import SourceProductCard from '../components/SourceProductCard';
import MarketplaceSection from '../components/MarketplaceSection';
import StatusMessage from '../components/StatusMessage';
import { RESELLABLE_MARKETPLACES } from '../../types';

/**
 * Comparison view for showing product data and arbitrage opportunities
 */
const ComparisonView: React.FC = () => {
  // Get state from store
  const currentProduct = useCurrentProduct();
  const comparison = useComparison();
  const loading = useLoading();
  const settings = useSettings();
  const { isAuthenticated } = useAuth();
  const manualMatch = usePopupStore(state => state.manualMatch);
  
  // We've removed the category results display from this component to simplify the UI
  
  // Get actions from store
  const loadProductData = usePopupStore(state => state.loadProductData);
  const fetchPriceComparison = usePopupStore(state => state.fetchPriceComparison);
  const findMatchManually = usePopupStore(state => state.findMatchManually);
  const setActiveTab = usePopupStore(state => state.setActiveTab);

  // We've removed the category results display and related functionality from this component
  
  // Determine if current product is from the selected marketplace
  const isCurrentProductFromSelectedMarketplace = 
    Boolean(settings.selectedMarketplace) && 
    Boolean(currentProduct) && 
    currentProduct?.marketplace === settings.selectedMarketplace;
  
  // Check if the current product is from a marketplace that isn't resellable on other platforms
  const isProductFromNonResellableMarketplace = 
    Boolean(currentProduct) && 
    (currentProduct?.marketplace !== 'amazon' && currentProduct?.marketplace !== 'walmart' && currentProduct?.marketplace !== 'target');
  
  return (
    <div className="comparison-container">
      {/* Individual product view only */}
      <div className="source-product">
        <h3>Current Product</h3>
        
        {currentProduct ? (
          <SourceProductCard product={currentProduct} />
        ) : (
          <div className="no-product">
            <p>No product detected on this page.</p>
            <p>Please navigate to a product page on Amazon, Walmart, or Target.</p>
          </div>
        )}
        
        <div className="button-container">
          <button 
            className="refresh-button"
            onClick={loadProductData}
            disabled={loading}
          >
            Refresh Current Product Data
          </button>
          
          <button 
            className="compare-button"
            onClick={fetchPriceComparison}
            disabled={loading || !currentProduct || isCurrentProductFromSelectedMarketplace || !isAuthenticated}
            title={
              !isAuthenticated 
                ? 'Please log in first to use this feature' 
                : isCurrentProductFromSelectedMarketplace && settings.selectedMarketplace 
                  ? `Cannot search for arbitrage when the current product is from the selected marketplace (${settings.selectedMarketplace})` 
                  : 'Find Matching Products Via API'
            }
          >
            {loading ? 'Loading...' : 'Find Matching Products Via API'}
          </button>
          
          <button 
            className="match-manually-button"
            onClick={findMatchManually}
            disabled={loading || !currentProduct || !isAuthenticated}
            title="Search for matches in the background"
          >
            Find Match In Browser
          </button>
        </div>
        
        {!isAuthenticated && (
          <div className="auth-required">
            <p className="text-sm text-amber-600 p-2 bg-amber-50 rounded-md mt-2">
              You need to log in to find arbitrage opportunities. 
              <button 
                className="ml-1 underline text-blue-600"
                onClick={() => setActiveTab('account')}
              >
                Enter your API key
              </button>
            </p>
          </div>
        )}
        
        {isCurrentProductFromSelectedMarketplace && settings.selectedMarketplace && (
          <div className="error-message">
            You have selected {formatMarketplace(settings.selectedMarketplace)} in Settings, but the current product is also from {formatMarketplace(settings.selectedMarketplace)}. 
            Please either change the selected marketplace or visit a product on a different marketplace.
          </div>
        )}
        
        <StatusMessage />
      </div>
      
      {comparison && (
        <div className="matched-products">
          <h3>Matching Products</h3>
          
          {/* Debug output - using React.Fragment to suppress TypeScript errors */}
          <React.Fragment>
            {/* Using conditional to ensure these logs happen but don't affect rendering */}
            {(() => {
              console.log('Comparison data:', comparison);
              console.log('Matched products:', comparison.matchedProducts);
              console.log('Marketplace selections:', {
                amazon: !settings.selectedMarketplace || settings.selectedMarketplace === 'amazon',
                walmart: !settings.selectedMarketplace || settings.selectedMarketplace === 'walmart',
                selected: settings.selectedMarketplace
              });
              return null;
            })()}
          </React.Fragment>
          
          {/* Show which marketplace we're showing results for */}
          {settings.selectedMarketplace && (
            <div className="status-message">
              Showing results for {formatMarketplace(settings.selectedMarketplace)} only based on your settings.
            </div>
          )}
          
          {/* Amazon matches - only show if there's no selected marketplace or if amazon is selected */}
          {(!settings.selectedMarketplace || settings.selectedMarketplace === 'amazon') && 
            comparison.matchedProducts && 'amazon' in comparison.matchedProducts && (
            <MarketplaceSection 
              marketplace="amazon" 
              products={comparison.matchedProducts.amazon}
              similarity={comparison.similarity}
              searchUrl={comparison.searchUrl}
            />
          )}
          
          {/* Walmart matches - only show if there's no selected marketplace or if walmart is selected */}
          {(!settings.selectedMarketplace || settings.selectedMarketplace === 'walmart') && 
            comparison.matchedProducts && 'walmart' in comparison.matchedProducts && (
            <MarketplaceSection 
              marketplace="walmart" 
              products={comparison.matchedProducts.walmart}
              similarity={comparison.similarity}
              searchUrl={comparison.searchUrl}
            />
          )}
          
          {/* No matches found - only show if we truly have no matches */}
          {(() => {
            // Check if there are any valid matches across marketplaces
            const hasMatches = Object.entries(comparison.matchedProducts).some(
              ([marketplace, products]) => Array.isArray(products) && products.length > 0
            );
            
            // Log the check result for debugging
            console.log('Has matches check (DETAILED):', { 
              hasMatches, 
              matchedProducts: comparison.matchedProducts,
              isManualMatch: comparison.manualMatch,
              allKeys: Object.keys(comparison.matchedProducts),
              amazonLength: comparison.matchedProducts.amazon?.length || 0,
              walmartLength: comparison.matchedProducts.walmart?.length || 0,
              fullComparison: comparison
            });
            
            // Only show the "no matches" message if we truly have no matches
            // and we've either already rendered the marketplace sections with the View Search button
            // or we don't have a search URL
            const amazonSectionVisible = (!settings.selectedMarketplace || settings.selectedMarketplace === 'amazon');
            const walmartSectionVisible = (!settings.selectedMarketplace || settings.selectedMarketplace === 'walmart');
            
            // If one of the marketplaces is hidden by settings but has matches, we still want to hide the "no matches" message
            const hiddenMarketplaceHasMatches = 
              (settings.selectedMarketplace === 'walmart' && 
                comparison.matchedProducts.amazon && 
                comparison.matchedProducts.amazon.length > 0) ||
              (settings.selectedMarketplace === 'amazon' && 
                comparison.matchedProducts.walmart && 
                comparison.matchedProducts.walmart.length > 0);
            
            return !hasMatches && !hiddenMarketplaceHasMatches && (
              <div className="no-matches-container">
                <p>No matching products found on other marketplaces.</p>
                
                {/* If we have a search URL from background matching, show the search button */}
                {comparison.searchUrl && (
                  <div className="search-link-container">
                    <a 
                      href={comparison.searchUrl} 
                      onClick={(e) => {
                        e.preventDefault();
                        chrome.tabs.create({ url: comparison.searchUrl || '' });
                      }}
                      className="view-search-button"
                    >
                      View Search Results
                    </a>
                    <p><small>Search manually to find matches</small></p>
                  </div>
                )}
              </div>
            );
          })()}
          
          <div className="comparison-footer">
            <p className="timestamp">
              Last updated: {formatDate(comparison.timestamp)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComparisonView;
