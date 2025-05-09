// src/popup/components/CategoryResultsTable.tsx
// Table view for category results

import React, { useState } from 'react';
import { ProductComparison, ProductMatchResult } from '../../types';
import { formatCurrency, formatMarketplace } from '../../common/formatting';

interface CategoryResultsTableProps {
  comparisons: ProductComparison[];
  targetMarketplace: string;
}

/**
 * Component for displaying category results in a table format
 */
const CategoryResultsTable: React.FC<CategoryResultsTableProps> = ({ 
  comparisons, 
  targetMarketplace 
}) => {
  // State for sort order
  const [sortBy, setSortBy] = useState<string>('profit');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Sort comparisons
  const sortComparisons = (comparisons: ProductComparison[]): ProductComparison[] => {
    return [...comparisons].sort((a, b) => {
      // Get target marketplace products
      const aProducts = a.matchedProducts[targetMarketplace as keyof typeof a.matchedProducts] || [];
      const bProducts = b.matchedProducts[targetMarketplace as keyof typeof b.matchedProducts] || [];
      
      // Get first product from each (if exists)
      const aProduct = aProducts.length > 0 ? aProducts[0] : null;
      const bProduct = bProducts.length > 0 ? bProducts[0] : null;
      
      // Handle cases where products don't exist
      if (!aProduct && !bProduct) return 0;
      if (!aProduct) return sortOrder === 'asc' ? -1 : 1;
      if (!bProduct) return sortOrder === 'asc' ? 1 : -1;
      
      // Compare based on sort field
      switch (sortBy) {
        case 'sourceTitle':
          return sortOrder === 'asc'
            ? a.sourceProduct.title.localeCompare(b.sourceProduct.title)
            : b.sourceProduct.title.localeCompare(a.sourceProduct.title);
        
        case 'targetTitle':
          return sortOrder === 'asc'
            ? aProduct.title.localeCompare(bProduct.title)
            : bProduct.title.localeCompare(aProduct.title);
        
        case 'sourcePrice':
          const aPriceSource = a.sourceProduct.price || 0;
          const bPriceSource = b.sourceProduct.price || 0;
          return sortOrder === 'asc'
            ? aPriceSource - bPriceSource
            : bPriceSource - aPriceSource;
        
        case 'targetPrice':
          const aPriceTarget = aProduct.price || 0;
          const bPriceTarget = bProduct.price || 0;
          return sortOrder === 'asc'
            ? aPriceTarget - bPriceTarget
            : bPriceTarget - aPriceTarget;
        
        case 'profit':
          const aProfitAmount = aProduct.profit?.amount || 0;
          const bProfitAmount = bProduct.profit?.amount || 0;
          return sortOrder === 'asc'
            ? aProfitAmount - bProfitAmount
            : bProfitAmount - aProfitAmount;
        
        case 'profitPercent':
          const aProfitPercent = aProduct.profit?.percentage || 0;
          const bProfitPercent = bProduct.profit?.percentage || 0;
          return sortOrder === 'asc'
            ? aProfitPercent - bProfitPercent
            : bProfitPercent - aProfitPercent;
        
        default:
          return 0;
      }
    });
  };
  
  // Sort the comparisons
  const sortedComparisons = sortComparisons(comparisons);
  
  // Handle sort clicks
  const handleSortClick = (column: string) => {
    if (sortBy === column) {
      // Toggle order if already sorting by this column
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new sort column with default desc order
      setSortBy(column);
      setSortOrder('desc');
    }
  };
  
  // Render sort indicator
  const renderSortIndicator = (column: string) => {
    if (sortBy !== column) return null;
    return sortOrder === 'asc' ? '↑' : '↓';
  };
  
  return (
    <div className="category-results-table">
      <div className="table-header">
        <h3>Category Results ({comparisons.length} products)</h3>
        <p className="marketplace-info">
          Comparing source products with {formatMarketplace(targetMarketplace)} prices
        </p>
      </div>
      
      <table>
        <thead>
          <tr>
            <th className={`sortable ${sortBy === 'sourceTitle' ? 'active' : ''}`} onClick={() => handleSortClick('sourceTitle')}>
              Source Product {renderSortIndicator('sourceTitle')}
            </th>
            <th className={`sortable ${sortBy === 'sourcePrice' ? 'active' : ''}`} onClick={() => handleSortClick('sourcePrice')}>
              Source Price {renderSortIndicator('sourcePrice')}
            </th>
            <th className={`sortable ${sortBy === 'targetTitle' ? 'active' : ''}`} onClick={() => handleSortClick('targetTitle')}>
              {formatMarketplace(targetMarketplace)} Product {renderSortIndicator('targetTitle')}
            </th>
            <th className={`sortable ${sortBy === 'targetPrice' ? 'active' : ''}`} onClick={() => handleSortClick('targetPrice')}>
              {formatMarketplace(targetMarketplace)} Price {renderSortIndicator('targetPrice')}
            </th>
            <th className={`sortable ${sortBy === 'profit' ? 'active' : ''}`} onClick={() => handleSortClick('profit')}>
              Profit {renderSortIndicator('profit')}
            </th>
            <th className={`sortable ${sortBy === 'profitPercent' ? 'active' : ''}`} onClick={() => handleSortClick('profitPercent')}>
              % {renderSortIndicator('profitPercent')}
            </th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortedComparisons.map((comparison, index) => {
            const sourceProduct = comparison.sourceProduct;
            const targetProducts = comparison.matchedProducts[targetMarketplace as keyof typeof comparison.matchedProducts] || [];
            const targetProduct = targetProducts.length > 0 ? targetProducts[0] : null;
            
            if (!targetProduct) {
              // No match found for this product
              return (
                <tr key={index} className="no-match-row">
                  <td className="source-title">{sourceProduct.title}</td>
                  <td className="source-price">{formatCurrency(sourceProduct.price)}</td>
                  <td colSpan={4} className="no-match-message">No match found</td>
                  <td className="actions">
                    <button 
                      className="view-button"
                      onClick={() => window.open(sourceProduct.pageUrl, '_blank')}
                    >
                      View Source
                    </button>
                  </td>
                </tr>
              );
            }
            
            // Calculate profit class for highlighting
            const profitAmount = targetProduct.profit?.amount || 0;
            const profitPercentage = targetProduct.profit?.percentage || 0;
            const profitClass = profitAmount > 0 ? 'positive' : (profitAmount < 0 ? 'negative' : '');
            
            return (
              <tr key={index}>
                <td className="source-title">
                  <div className="product-title-wrapper">
                    {sourceProduct.imageUrl && (
                      <div className="thumbnail">
                        <img src={sourceProduct.imageUrl} alt={sourceProduct.title} />
                      </div>
                    )}
                    <div className="title-text">{sourceProduct.title}</div>
                  </div>
                </td>
                <td className="source-price">{formatCurrency(sourceProduct.price)}</td>
                <td className="target-title">
                  <div className="product-title-wrapper">
                    {targetProduct.image && (
                      <div className="thumbnail">
                        <img src={targetProduct.image} alt={targetProduct.title} />
                      </div>
                    )}
                    <div className="title-text">{targetProduct.title}</div>
                  </div>
                </td>
                <td className="target-price">{formatCurrency(targetProduct.price)}</td>
                <td className={`profit-amount ${profitClass}`}>
                  {formatCurrency(profitAmount)}
                </td>
                <td className={`profit-percent ${profitClass}`}>
                  {profitPercentage.toFixed(1)}%
                </td>
                <td className="actions">
                  <button 
                    className="view-button"
                    onClick={() => window.open(sourceProduct.pageUrl, '_blank')}
                  >
                    Source
                  </button>
                  <button 
                    className="view-button"
                    onClick={() => window.open(targetProduct.url, '_blank')}
                  >
                    Target
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      
      {sortedComparisons.length === 0 && (
        <div className="no-results">
          <p>No category results found.</p>
        </div>
      )}

      {/* Toggle button to switch to card view */}
      <div className="view-toggle">
        <button className="toggle-view-button">
          Switch to Card View
        </button>
      </div>
    </div>
  );
};

export default CategoryResultsTable;