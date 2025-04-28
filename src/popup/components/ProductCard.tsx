// src/popup/components/ProductCard.tsx - Product card component

import React from 'react';
import { ProductData, ProductMatchResult } from '../../types';
import { formatPrice, formatProfit, formatMarketplace } from '../../common/formatting';

interface SourceProductCardProps {
  product: ProductData;
}

interface MatchedProductCardProps {
  product: ProductMatchResult;
}

/**
 * Card displaying source product information
 */
export const SourceProductCard: React.FC<SourceProductCardProps> = ({ product }) => {
  return (
    <div className="product-card">
      {product.imageUrl && (
        <img 
          src={product.imageUrl} 
          alt={product.title} 
          className="product-image" 
        />
      )}
      <div className="product-info">
        <h4>{product.title}</h4>
        <p>Price: {formatPrice(product.price)}</p>
        <p>Platform: {formatMarketplace(product.marketplace)}</p>
        {product.brand && <p>Brand: {product.brand}</p>}
        {product.upc && <p>UPC: {product.upc}</p>}
        {product.asin && <p>ASIN: {product.asin}</p>}
      </div>
    </div>
  );
};

/**
 * Card displaying matched product information with profit calculations
 */
export const MatchedProductCard: React.FC<MatchedProductCardProps> = ({ product }) => {
  const isProfitable = product.profit && product.profit.amount > 0;
  const priceDiff = product.profit ? Math.abs(product.profit.amount) : 0;
  
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
        
        {product.profit && (
          <>
            <p className={isProfitable ? 'profit positive' : 'profit negative'}>
              Profit: {formatProfit(product.profit)}
            </p>
            <p className="price-diff">
              {isProfitable 
                ? `${formatPrice(priceDiff)} cheaper to buy from source and sell here` 
                : `${formatPrice(priceDiff)} cheaper to buy here and sell at source`}
            </p>
            
            {/* Fee breakdown section */}
            {product.fee_breakdown && (
              <div className="fee-breakdown">
                <p className="fee-breakdown-title">Fee breakdown:</p>
                <p>Marketplace fee ({(product.fee_breakdown.marketplace_fee_percentage * 100).toFixed(1)}%): 
                  {formatPrice(product.fee_breakdown.marketplace_fee_amount)}
                </p>
                <p>Additional fees: {formatPrice(product.fee_breakdown.additional_fees)}</p>
                <p className="fee-total">Total fees: {formatPrice(product.fee_breakdown.total_fees)}</p>
              </div>
            )}
          </>
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
