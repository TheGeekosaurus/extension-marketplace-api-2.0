// src/popup/state/selectors.ts - State selectors

import { ProductMatchResult } from '../../types';
import { usePopupStore } from './store';

/**
 * Get current product from store
 */
export const useCurrentProduct = () => usePopupStore(state => state.currentProduct);

/**
 * Get comparison data from store
 */
export const useComparison = () => usePopupStore(state => state.comparison);

/**
 * Get settings from store
 */
export const useSettings = () => usePopupStore(state => state.settings);

/**
 * Get loading state
 */
export const useLoading = () => usePopupStore(state => state.loading);

/**
 * Get error state
 */
export const useError = () => usePopupStore(state => state.error);

/**
 * Get status message
 */
export const useStatus = () => usePopupStore(state => state.status);

/**
 * Get active tab
 */
export const useActiveTab = () => usePopupStore(state => state.activeTab);

/**
 * Use filtered products based on minimum profit percentage
 * 
 * @param products - Products to filter
 * @returns Filtered products
 */
export const useFilteredProducts = (products: ProductMatchResult[] | undefined): ProductMatchResult[] => {
  const settings = useSettings();
  
  if (!products) return [];
  
  return products.filter(product => 
    product.profit && product.profit.percentage >= settings.minimumProfitPercentage
  );
};

/**
 * Check if we have profitable opportunities in the current comparison
 */
export const useHasProfitableOpportunities = (): boolean => {
  const comparison = useComparison();
  const settings = useSettings();
  
  if (!comparison) return false;
  
  const { matchedProducts } = comparison;
  
  for (const marketplace in matchedProducts) {
    const products = matchedProducts[marketplace as keyof typeof matchedProducts];
    if (!products) continue;
    
    for (const product of products) {
      if (product.profit && product.profit.percentage >= settings.minimumProfitPercentage) {
        return true;
      }
    }
  }
  
  return false;
};

/**
 * Calculate the total potential profit across all opportunities
 */
export const useTotalPotentialProfit = () => {
  const comparison = useComparison();
  const settings = useSettings();
  
  if (!comparison) return { amount: 0, percentage: 0 };
  
  const { matchedProducts } = comparison;
  let totalAmount = 0;
  let count = 0;
  
  for (const marketplace in matchedProducts) {
    const products = matchedProducts[marketplace as keyof typeof matchedProducts];
    if (!products) continue;
    
    for (const product of products) {
      if (product.profit && product.profit.percentage >= settings.minimumProfitPercentage) {
        totalAmount += product.profit.amount;
        count++;
      }
    }
  }
  
  // Calculate average percentage
  const averagePercentage = count > 0 ? (totalAmount / count) * 100 : 0;
  
  return {
    amount: parseFloat(totalAmount.toFixed(2)),
    percentage: parseFloat(averagePercentage.toFixed(2))
  };
};
