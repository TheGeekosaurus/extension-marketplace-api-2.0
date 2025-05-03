// src/popup/components/ProductCard.tsx - Product card component

import React from 'react';
import { ProductMatchResult } from '../../types';
import { formatPrice, formatProfit, formatMarketplace } from '../../common/formatting';
import { usePopupStore } from '../state/store';

interface MatchedProductCardProps {
  product: ProductMatchResult;
  showSimilarity?: boolean;
  searchUrl?: string;
}

/**
 * Card displaying matched product information with profit calculations
 */
export const MatchedProductCard: React.FC<MatchedProductCardProps> = ({ 
  product,
  showSimilarity = true,
  searchUrl
}) => {
  const isProfitable = product.profit && product.profit.amount > 0;
  
  // Get the manualMatch searchUrl from store
  const manualMatchSearchUrl = usePopupStore(state => state.manualMatch.searchUrl);
  
  // Use provided searchUrl or fetch from store
  const finalSearchUrl = searchUrl || manualMatchSearchUrl;
  
  // Handle opening the search page
  const handleViewSearchClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    
    if (finalSearchUrl) {
      chrome.tabs.create({ url: finalSearchUrl });
    }
  };
  
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
        <div className="product-title-row">
          <h5>{product.title}</h5>
          {showSimilarity && product.similarity !== undefined && (
            <span className="similarity-badge-small">
              {(product.similarity * 100).toFixed(1)}% match
            </span>
          )}
        </div>
        
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
        
        <div className="product-actions">
          <a 
            href={product.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="view-button"
          >
            View Product
          </a>
          
          {finalSearchUrl && (
            <a 
              href={finalSearchUrl} 
              onClick={handleViewSearchClick}
              className="view-search-button"
            >
              View Search
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default MatchedProductCard;
