// src/popup/views/ComparisonView.tsx - Comparison tab content

import React from 'react';
import { 
  useCurrentProduct, 
  useComparison, 
  useLoading, 
  useTotalPotentialProfit,
  useSettings
} from '../state/selectors';
import { usePopupStore } from '../state/store';
import { formatDate, formatMarketplace } from '../../common/formatting';
import { SourceProductCard } from '../components/ProductCard';
import MarketplaceSection from '../components/MarketplaceSection';
import StatusMessage from '../components/StatusMessage';

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
  
  // Get actions from store
  const loadProductData = usePopupStore(state => state.loadProductData);
  const fetchPriceComparison = usePopupStore(state => state.fetchPriceComparison);

  // Determine if current product is from the selected marketplace
  const isCurrentProductFromSelectedMarketplace = 
    Boolean(settings.selectedMarketplace) && 
    Boolean(currentProduct) && 
    currentProduct?.marketplace === settings.selectedMarketplace;
  
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
            disabled={loading || !currentProduct || isCurrentProductFromSelectedMarketplace}
            title={isCurrentProductFromSelectedMarketplace && settings.selectedMarketplace ? 
              `Cannot search for arbitrage when the current product is from the selected marketplace (${settings.selectedMarketplace})` : 
              'Find arbitrage opportunities'}
          >
            {loading ? 'Loading...' : 'Find Arbitrage Opportunities'}
          </button>
        </div>
        
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
          <h3>Arbitrage Opportunities</h3>
          
          {/* Show which marketplace we're showing results for */}
          {settings.selectedMarketplace && (
            <div className="status-message">
              Showing results for {formatMarketplace(settings.selectedMarketplace)} only based on your settings.
            </div>
          )}
          
          {/* Summary of opportunities */}
          {totalProfit.amount > 0 && (
            <div className="profit-summary">
              <p>Total potential profit: <span className="profit positive">${totalProfit.amount.toFixed(2)}</span></p>
            </div>
          )}
          
          {/* Amazon matches - only show if there's no selected marketplace or if amazon is selected */}
          {(!settings.selectedMarketplace || settings.selectedMarketplace === 'amazon') && (
            <MarketplaceSection 
              marketplace="amazon" 
              products={comparison.matchedProducts.amazon} 
            />
          )}
          
          {/* Walmart matches - only show if there's no selected marketplace or if walmart is selected */}
          {(!settings.selectedMarketplace || settings.selectedMarketplace === 'walmart') && (
            <MarketplaceSection 
              marketplace="walmart" 
              products={comparison.matchedProducts.walmart} 
            />
          )}
          
          {/* Target matches - only show if there's no selected marketplace or if target is selected */}
          {(!settings.selectedMarketplace || settings.selectedMarketplace === 'target') && (
            <MarketplaceSection 
              marketplace="target" 
              products={comparison.matchedProducts.target} 
            />
          )}
          
          {/* No matches found */}
          {Object.keys(comparison.matchedProducts).length === 0 && (
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
