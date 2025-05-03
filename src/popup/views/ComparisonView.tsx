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
import { formatDate, formatMarketplace, formatPrice } from '../../common/formatting';
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
  const totalProfit = useTotalPotentialProfit();
  const settings = useSettings();
  const { isAuthenticated } = useAuth();
  
  // Get actions from store
  const loadProductData = usePopupStore(state => state.loadProductData);
  const fetchPriceComparison = usePopupStore(state => state.fetchPriceComparison);
  const findMatchManually = usePopupStore(state => state.findMatchManually);
  const viewSearchResults = usePopupStore(state => state.viewSearchResults);
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
                  : 'Find matching products on other marketplaces (uses API credits)'
            }
          >
            {loading ? 'Loading...' : 'Find Matching Products'}
          </button>
          
          <button 
            className="match-manually-button"
            onClick={findMatchManually}
            disabled={loading || !currentProduct}
            title="Find matches without using API credits"
          >
            Find Match Manually
          </button>
        </div>
        
        {!isAuthenticated && (
          <div className="auth-required">
            <p className="text-sm text-amber-600 p-2 bg-amber-50 rounded-md mt-2">
              You need to log in to use API-based matching. 
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
          
          {/* Display manual match info if this is a manual match */}
          {comparison.manualMatch && comparison.similarity !== undefined && (
            <div className="manual-match-info bg-muted p-4 rounded-lg mb-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold text-lg">Manual Match Results</h4>
                <span className="bg-primary text-white px-2 py-1 rounded text-sm">
                  {(comparison.similarity * 100).toFixed(1)}% Match
                </span>
              </div>
              
              <p className="text-sm mb-3">
                Match found without using API credits. The similarity score indicates how closely the titles match.
              </p>
              
              {comparison.searchUrl && (
                <button 
                  className="view-search-button w-full"
                  onClick={viewSearchResults}
                >
                  View Search Results
                </button>
              )}
            </div>
          )}
          
          {/* Show which marketplace we're showing results for */}
          {settings.selectedMarketplace && (
            <div className="status-message">
              Showing results for {formatMarketplace(settings.selectedMarketplace)} only based on your settings.
            </div>
          )}
          
          {/* Summary of opportunities with positive profit */}
          {totalProfit.amount > 0 && (
            <div className="profit-summary">
              <p>Total potential profit: <span className="profit positive">${totalProfit.amount.toFixed(2)}</span></p>
              <p><small>Note: This summary includes only positive profit opportunities</small></p>
            </div>
          )}
          
          {/* Amazon matches - only show if there's no selected marketplace or if amazon is selected */}
          {(!settings.selectedMarketplace || settings.selectedMarketplace === 'amazon') && comparison.matchedProducts.amazon && (
            <MarketplaceSection 
              marketplace="amazon" 
              products={comparison.matchedProducts.amazon} 
              similarity={comparison.manualMatch ? comparison.similarity : undefined}
            />
          )}
          
          {/* Walmart matches - only show if there's no selected marketplace or if walmart is selected */}
          {(!settings.selectedMarketplace || settings.selectedMarketplace === 'walmart') && comparison.matchedProducts.walmart && (
            <MarketplaceSection 
              marketplace="walmart" 
              products={comparison.matchedProducts.walmart}
              similarity={comparison.manualMatch ? comparison.similarity : undefined}
            />
          )}
          
          {/* No matches found */}
          {Object.keys(comparison.matchedProducts).length === 0 || 
           ((!comparison.matchedProducts.amazon || comparison.matchedProducts.amazon.length === 0) && 
            (!comparison.matchedProducts.walmart || comparison.matchedProducts.walmart.length === 0)) && (
            <p>No matching products found on other marketplaces.</p>
          )}
          
          <div className="comparison-footer">
            <p className="timestamp">
              Last updated: {formatDate(comparison.timestamp)}
            </p>
          </div>
        </div>
      )}
      
      {/* Show credit purchase CTA if authenticated but not showing comparison */}
      {isAuthenticated && !comparison && !loading && (
        <div className="bg-muted p-4 rounded-md mt-4">
          <h3 className="text-lg font-medium mb-2">Need Credits?</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Purchase credits to find profitable arbitrage opportunities across marketplaces.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              className="button"
              onClick={() => window.open('https://ext.nanotomlogistics.com/purchase', '_blank')}
            >
              Purchase Credits
            </button>
            <button
              className="button outline"
              onClick={() => window.open('https://ext.nanotomlogistics.com/dashboard', '_blank')}
            >
              Account Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComparisonView;
