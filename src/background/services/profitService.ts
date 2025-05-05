// src/background/services/profitService.ts - Profit calculation service

import { 
  ProductData, 
  ProductMatchResult, 
  MarketplaceType, 
  ProfitInfo 
} from '../../types';
import { getSettings } from './settingsService';

/**
 * Service for calculating profit margins
 */
export class ProfitService {
  /**
   * Calculate profit margins for matched products
   * 
   * @param sourceProduct - Original product
   * @param matchedProducts - Products matched across marketplaces
   * @returns Updated matched products with profit calculations
   */
  static calculateProfitMargins(
    sourceProduct: ProductData,
    matchedProducts: Record<string, ProductMatchResult[]>
  ): Record<string, ProductMatchResult[]> {
    console.log('[E-commerce Arbitrage Profit] Calculating profit margins');
    
    // Skip if source product has no price
    if (sourceProduct.price === null) {
      console.log('[E-commerce Arbitrage Profit] Source product has no price, skipping profit calculation');
      return matchedProducts;
    }
    
    // Get settings for fee calculations
    const settings = getSettings();
    const includeFees = settings.includeFees !== false; // Default to true
    const estimatedFees = settings.estimatedFees;
    const additionalFees = settings.additionalFees || 0;
    
    console.log('[E-commerce Arbitrage Profit] Using fee settings:', 
      { includeFees, estimatedFees, additionalFees });
    
    // Clone the matched products to avoid modifying the original
    const result = JSON.parse(JSON.stringify(matchedProducts));
    
    // Calculate for each marketplace
    Object.keys(result).forEach(marketplace => {
      const products = result[marketplace as keyof typeof result];
      
      if (!products) return;
      
      products.forEach((product: ProductMatchResult) => {
        if (product.price === null) {
          product.profit = {
            amount: 0,
            percentage: 0
          };
          return;
        }
        
        // Include shipping price in calculations if available
        const shippingPrice = product.shippingPrice || 0;
        const totalProductPrice = product.price + shippingPrice;
        
        const feePercentage = estimatedFees[marketplace as keyof typeof estimatedFees] || 0;
        
        // Calculate marketplace fees based on total price (including shipping)
        const marketplaceFeeAmount = includeFees ? (totalProductPrice * feePercentage) : 0;
        
        // Apply additional fees
        const totalFees = marketplaceFeeAmount + additionalFees;
        
        // Calculate net profit
        const profitAmount = totalProductPrice - sourceProduct.price! - totalFees;
        const profitPercentage = (profitAmount / sourceProduct.price!) * 100;
        
        product.profit = {
          amount: parseFloat(profitAmount.toFixed(2)),
          percentage: parseFloat(profitPercentage.toFixed(2))
        };
        
        // Add fee breakdown
        product.fee_breakdown = {
          marketplace_fee_percentage: feePercentage,
          marketplace_fee_amount: parseFloat(marketplaceFeeAmount.toFixed(2)),
          additional_fees: parseFloat(additionalFees.toFixed(2)), 
          total_fees: parseFloat(totalFees.toFixed(2))
        };
        
        console.log(`[E-commerce Arbitrage Profit] Calculated profit for ${marketplace} product:`, 
          { price: product.price, shipping: shippingPrice, totalPrice: totalProductPrice,
            profit: product.profit, fees: product.fee_breakdown });
      });
    });
    
    return result;
  }
  
  /**
   * Calculate total potential profit across all matched products
   * 
   * @param matchedProducts - Products with profit calculations
   * @returns Sum of all potential profits
   */
  static calculateTotalPotentialProfit(
    matchedProducts: Record<string, ProductMatchResult[]>
  ): ProfitInfo {
    let totalAmount = 0;
    let count = 0;
    
    Object.values(matchedProducts).forEach(products => {
      products.forEach(product => {
        if (product.profit) {
          // Only count positive profits for the total
          if (product.profit.amount > 0) {
            totalAmount += product.profit.amount;
            count++;
          }
        }
      });
    });
    
    // Calculate average percentage
    const averagePercentage = count > 0 ? (totalAmount / count) * 100 : 0;
    
    return {
      amount: parseFloat(totalAmount.toFixed(2)),
      percentage: parseFloat(averagePercentage.toFixed(2))
    };
  }
}
