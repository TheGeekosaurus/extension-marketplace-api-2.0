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
  
  // Get actions from store
  const loadProductData = usePopupStore(state => state.loadProductData);
  const fetchPriceComparison = usePopupStore(state => state.fetchPriceComparison);
  const findMatchManually = usePopupStore(state => state.findMatchManually);
  const setActiveTab = usePopupStore(state => state.setActiveTab);

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
            Refresh Product Data
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
                  : 'Find matching products on other marketplaces'
            }
          >
            {loading ? 'Loading...' : 'Find Matching Products'}
          </button>
          
          <button 
            className="match-manually-button"
            onClick={findMatchManually}
            disabled={loading || !currentProduct || !isAuthenticated}
            title="Search for matches in the background"
          >
            Find Match In Background
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
          
          {/* Show which marketplace we're showing results for */}
          {settings.selectedMarketplace && (
            <div className="status-message">
              Showing results for {formatMarketplace(settings.selectedMarketplace)} only based on your settings.
            </div>
          )}
          
          {/* FIX 2: Removed total profit summary box */}
          
          {/* Amazon matches - only show if there's no selected marketplace or if amazon is selected */}
          {(!settings.selectedMarketplace || settings.selectedMarketplace === 'amazon') && (
            <MarketplaceSection 
              marketplace="amazon" 
              products={comparison.matchedProducts.amazon}
              similarity={comparison.similarity}
              searchUrl={comparison.searchUrl}
            />
          )}
          
          {/* Walmart matches - only show if there's no selected marketplace or if walmart is selected */}
          {(!settings.selectedMarketplace || settings.selectedMarketplace === 'walmart') && (
            <MarketplaceSection 
              marketplace="walmart" 
              products={comparison.matchedProducts.walmart}
              similarity={comparison.similarity}
              searchUrl={comparison.searchUrl}
            />
          )}
          
          {/* No matches found */}
          {Object.keys(comparison.matchedProducts).length === 0 || 
           (comparison.matchedProducts.amazon?.length === 0 && 
            comparison.matchedProducts.walmart?.length === 0) && (
            <p>No matching products found on other marketplaces.</p>
          )}
          
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
