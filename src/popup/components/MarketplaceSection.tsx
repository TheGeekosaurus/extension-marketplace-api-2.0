// src/popup/components/MarketplaceSection.tsx - Marketplace results section

import React from 'react';
import { ProductMatchResult } from '../../types';
import { MatchedProductCard } from './ProductCard';
import { formatMarketplace } from '../../common/formatting';
import { useFilteredProducts } from '../state/selectors';

interface MarketplaceSectionProps {
  marketplace: string;
  products: ProductMatchResult[] | undefined;
  similarity?: number;
}

/**
 * Section displaying results for a specific marketplace
 */
const MarketplaceSection: React.FC<MarketplaceSectionProps> = ({ 
  marketplace, 
  products,
  similarity
}) => {
  // Use the selector to get all products (no filtering by profit)
  const allProducts = useFilteredProducts(products);
  
  if (!products || products.length === 0) {
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
      </div>
      
      {allProducts.length > 0 ? (
        allProducts.map((product, index) => (
          <MatchedProductCard 
            key={`${marketplace}-${index}`} 
            product={product}
            showSimilarity={similarity !== undefined}
          />
        ))
      ) : (
        <p>No matching products found on {formatMarketplace(marketplace)}.</p>
      )}
    </div>
  );
};

export default MarketplaceSection;
