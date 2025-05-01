// src/popup/components/ProductCard.tsx - Product card component

import React from 'react';
import { ProductMatchResult } from '../../types';
import { formatPrice, formatProfit, formatMarketplace } from '../../common/formatting';

interface MatchedProductCardProps {
  product: ProductMatchResult;
}

/**
 * Card displaying matched product information with profit calculations
 */
export const MatchedProductCard: React.FC<MatchedProductCardProps> = ({ product }) => {
  const isProfitable = product.profit && product.profit.amount > 0;
  
  return (
    <div className="product-card matched">
      {product.image && (
        <img 
          src={product.image} 
          alt={product.title} 
          className="product-image" 
        />
      )}
      <div className="product-info">
        <h5>{product.title}</h5>
        <p>Price: {formatPrice(product.price)}</p>
        
        {product.fee_breakdown && (
          <>
            <p className="fee-item negative">
              Marketplace fees ({(product.fee_breakdown.marketplace_fee_percentage * 100).toFixed(1)}%): 
              {formatPrice(product.fee_breakdown.marketplace_fee_amount)}
            </p>
            <p className="fee-item negative">
              Additional fees: {formatPrice(product.fee_breakdown.additional_fees)}
            </p>
          </>
        )}
        
        {product.profit && (
          <p className={isProfitable ? 'profit positive' : 'profit negative'}>
            Profit: {formatProfit(product.profit)}
          </p>
        )}
        
        {product.ratings && (
          <p>Rating: {product.ratings.average} ({product.ratings.count} reviews)</p>
        )}
        <a 
          href={product.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="view-button"
        >
          View Product
        </a>
      </div>
    </div>
  );
};

export default MatchedProductCard;
