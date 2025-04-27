// src/popup/views/ComparisonView.tsx - Comparison tab content

import React from 'react';
import { 
  useCurrentProduct, 
  useComparison, 
  useLoading, 
  useTotalPotentialProfit
} from '../state/selectors';
import { usePopupStore } from '../state/store';
import { formatDate } from '../../common/formatting';
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
  
  // Get actions from store
  const loadProductData = usePopupStore(state => state.loadProductData);
  const fetchPriceComparison = usePopupStore(state => state.fetchPriceComparison);
  
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
            disabled={loading || !currentProduct}
          >
            {loading ? 'Loading...' : 'Find Arbitrage Opportunities'}
          </button>
        </div>
        
        <StatusMessage />
      </div>
      
      {comparison && (
        <div className="matched-products">
          <h3>Arbitrage Opportunities</h3>
          
          {/* Summary of opportunities */}
          {totalProfit.amount > 0 && (
            <div className="profit-summary">
              <p>Total potential profit: <span className="profit positive">${totalProfit.amount.toFixed(2)}</span></p>
            </div>
          )}
          
          {/* Amazon matches */}
          <MarketplaceSection 
            marketplace="amazon" 
            products={comparison.matchedProducts.amazon} 
          />
          
          {/* Walmart matches */}
          <MarketplaceSection 
            marketplace="walmart" 
            products={comparison.matchedProducts.walmart} 
          />
          
          {/* Target matches */}
          <MarketplaceSection 
            marketplace="target" 
            products={comparison.matchedProducts.target} 
          />
          
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
