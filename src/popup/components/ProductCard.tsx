// src/popup/components/SourceProductCard.tsx - Enhanced source product card with editable price

import React, { useState, useEffect } from 'react';
import { ProductData } from '../../types';
import { formatPrice, formatMarketplace } from '../../common/formatting';
import { usePopupStore } from '../state/store';

interface SourceProductCardProps {
  product: ProductData;
}

/**
 * Enhanced source product card component with editable price
 */
export const SourceProductCard: React.FC<SourceProductCardProps> = ({ product }) => {
  // State for editing the price
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [editablePrice, setEditablePrice] = useState<string>(
    product.price !== null ? product.price.toString() : ''
  );
  
  // Update the current product in the store
  const setCurrentProduct = usePopupStore(state => state.setCurrentProduct);
  
  // Update the editable price when the product changes
  useEffect(() => {
    setEditablePrice(product.price !== null ? product.price.toString() : '');
  }, [product]);
  
  // Handle price editing
  const handlePriceClick = () => {
    setIsEditingPrice(true);
  };
  
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow only numbers and decimal point
    const value = e.target.value.replace(/[^0-9.]/g, '');
    setEditablePrice(value);
  };
  
  const handlePriceBlur = () => {
    setIsEditingPrice(false);
    
    // Parse the price and update the product data if valid
    const newPrice = parseFloat(editablePrice);
    if (!isNaN(newPrice) && newPrice !== product.price) {
      const updatedProduct = {
        ...product,
        price: newPrice
      };
      
      // Update the current product in the store
      setCurrentProduct(updatedProduct);
      
      // Also update in local storage
      chrome.storage.local.set({ currentProduct: updatedProduct });
    } else {
      // Reset to original price if invalid
      setEditablePrice(product.price !== null ? product.price.toString() : '');
    }
  };
  
  const handlePriceKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur(); // Trigger the onBlur event
    }
  };
  
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
        
        {/* Editable price */}
        <p>
          Price: {
            isEditingPrice ? (
              <input
                type="text"
                value={editablePrice}
                onChange={handlePriceChange}
                onBlur={handlePriceBlur}
                onKeyDown={handlePriceKeyDown}
                autoFocus
                className="price-edit-input"
                style={{
                  width: '60px',
                  padding: '2px 4px',
                  border: '1px solid #ccc',
                  borderRadius: '3px',
                  fontSize: '14px'
                }}
                data-testid="price-edit-input"
              />
            ) : (
              <span 
                onClick={handlePriceClick} 
                style={{ cursor: 'pointer', textDecoration: 'underline dotted' }}
                title="Click to edit price"
                data-testid="price-display"
              >
                {formatPrice(product.price)}
              </span>
            )
          }
        </p>
        
        <p>Platform: {formatMarketplace(product.marketplace)}</p>
        {product.brand && <p>Brand: {product.brand}</p>}
        {product.upc && <p>UPC: {product.upc}</p>}
        {product.asin && <p>ASIN: {product.asin}</p>}
        {product.productId && <p>Product ID: {product.productId}</p>}
      </div>
    </div>
  );
};

export default SourceProductCard;
