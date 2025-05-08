// src/popup/components/MarketplaceSection.tsx - Marketplace results section

import React from 'react';
import { ProductMatchResult } from '../../types';
import { MatchedProductCard } from './ProductCard';
import { formatMarketplace } from '../../common/formatting';
import { useFilteredProducts } from '../state/selectors';
import { usePopupStore } from '../state/store';

interface MarketplaceSectionProps {
  marketplace: string;
  products: ProductMatchResult[] | undefined;
  similarity?: number;
  searchUrl?: string;
}

/**
 * Section displaying results for a specific marketplace
 */
const MarketplaceSection: React.FC<MarketplaceSectionProps> = ({ 
  marketplace, 
  products,
  similarity,
  searchUrl
}) => {
  // Use the selector to get all products (no filtering by profit)
  const allProducts = useFilteredProducts(products);
  const comparison = usePopupStore(state => state.comparison);
  
  // Determine if this is a manual match
  const isManualMatch = comparison?.manualMatch === true;
  
  // Log for debugging
  console.log(`MarketplaceSection for ${marketplace}:`, { 
    products, 
    allProducts, 
    isManualMatch,
    similarity
  });
  
  // For manual matches with a searchUrl, we want to show the section even with no matches
  // so the user can click "View Search"
  const isManualMatchWithSearchUrl = isManualMatch && (searchUrl || comparison?.searchUrl);
  
  // Add extra debugging data to identify the issue
  console.log(`MarketplaceSection for ${marketplace} - detailed data:`, { 
    productsArray: products,
    productsLength: products?.length || 0,
    isManualMatch,
    hasSearchUrl: Boolean(searchUrl || comparison?.searchUrl),
    isManualMatchWithSearchUrl,
    comparisonObj: comparison
  });
  
  // Don't render the section if there are no products and it's not a manual match with search URL
  if ((!products || products.length === 0) && !isManualMatchWithSearchUrl) {
    console.log(`No products for ${marketplace}, returning null`);
    return null;
  }
  
  return (
    <div className="marketplace-section">
      <div className="marketplace-header">
        <h4>{formatMarketplace(marketplace)}</h4>
        {similarity !== undefined && (
          <span className="similarity-badge">
            {(similarity * 100).toFixed(1)}% Match
          </span>
        )}
        {isManualMatch && !similarity && products && products.length > 0 && products[0]?.similarity !== undefined && (
          <span className="similarity-badge">
            {(products[0].similarity * 100).toFixed(1)}% Match
          </span>
        )}
      </div>
      
      {allProducts && allProducts.length > 0 ? (
        allProducts.map((product, index) => (
          <MatchedProductCard 
            key={`${marketplace}-${index}`} 
            product={product}
            showSimilarity={true}
            searchUrl={searchUrl || (isManualMatch ? comparison?.searchUrl ?? undefined : undefined)}
          />
        ))
      ) : (
        <div className="no-matches-container">
          <p>No matching products found on {formatMarketplace(marketplace)}.</p>
          
          {/* Show "View Search" button if we have a search URL */}
          {(searchUrl || comparison?.searchUrl) && (
            <div className="search-link-container">
              <a 
                href={searchUrl || comparison?.searchUrl || ''} 
                onClick={(e) => {
                  e.preventDefault();
                  chrome.tabs.create({ url: searchUrl || comparison?.searchUrl || '' });
                }}
                className="view-search-button"
              >
                View Search Results
              </a>
              <p><small>Search manually to find matches</small></p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MarketplaceSection;
