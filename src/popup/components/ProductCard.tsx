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
  const settings = usePopupStore(state => state.settings);
  
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
          <h5 className="product-title-small">{product.title}</h5>
          {showSimilarity && product.similarity !== undefined && (
            <span className="similarity-badge-small">
              {(product.similarity * 100).toFixed(1)}% match
            </span>
          )}
        </div>
        {/* Display brand if available */}
        {product.brand && (
          <p className="detail-item" style={{marginTop: '2px', marginBottom: '6px'}}>
            <span className="detail-label">Brand:</span> <strong>{product.brand}</strong>
          </p>
        )}
        
        {/* Two-column layout for product details */}
        <div className="product-details-grid">
          <div className="details-column">
            <p className="detail-item">
              <span className="detail-label">Price:</span> {formatPrice(product.price)}
            </p>
            
            {product.fee_breakdown && (
              <>
                <p className="detail-item negative">
                  <span className="detail-label">Fees:</span>
                  {formatPrice(product.fee_breakdown.total_fees)}
                </p>
              </>
            )}
            
            {product.profit && (
              <p className={isProfitable ? 'profit positive detail-item' : 'profit negative detail-item'}>
                <span className="detail-label">Profit:</span> {formatProfit(product.profit)}
              </p>
            )}
          </div>
          
          <div className="details-column">
            {product.ratings && (
              <p className="detail-item">
                <span className="detail-label">Rating:</span> {product.ratings.average} ({product.ratings.count} reviews)
              </p>
            )}
            
            {product.asin && (
              <p className="detail-item">
                <span className="detail-label">ASIN:</span> {product.asin}
              </p>
            )}
            
            {product.item_id && (
              <p className="detail-item">
                <span className="detail-label">Item ID:</span> {product.item_id}
              </p>
            )}
          </div>
        </div>
        
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
