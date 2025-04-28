// src/popup/components/MarketplaceSection.tsx - Marketplace results section

import React from 'react';
import { ProductMatchResult } from '../../types';
import { MatchedProductCard } from './ProductCard';
import { formatMarketplace } from '../../common/formatting';
import { useFilteredProducts } from '../state/selectors';

interface MarketplaceSectionProps {
  marketplace: string;
  products: ProductMatchResult[] | undefined;
}

/**
 * Section displaying results for a specific marketplace
 */
const MarketplaceSection: React.FC<MarketplaceSectionProps> = ({ 
  marketplace, 
  products
}) => {
  // Use the selector to get all products (no filtering by profit)
  const allProducts = useFilteredProducts(products);
  
  if (!products || products.length === 0) {
    return null;
  }
  
  return (
    <div className="marketplace-section">
      <h4>{formatMarketplace(marketplace)}</h4>
      {allProducts.length > 0 ? (
        allProducts.map((product, index) => (
          <MatchedProductCard 
            key={`${marketplace}-${index}`} 
            product={product} 
          />
        ))
      ) : (
        <p>No matching products found on {formatMarketplace(marketplace)}.</p>
      )}
    </div>
  );
};

export default MarketplaceSection;
