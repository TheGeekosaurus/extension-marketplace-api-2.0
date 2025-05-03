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
 * Get auth state
 */
export const useAuth = () => usePopupStore(state => state.authState);

/**
 * Get manual match state
 */
export const useManualMatch = () => usePopupStore(state => state.manualMatch);

/**
 * Use all products without filtering
 * 
 * @param products - Products to return
 * @returns All matched products
 */
export const useFilteredProducts = (products: ProductMatchResult[] | undefined): ProductMatchResult[] => {
  if (!products) return [];
  
  // Get minimum profit percentage from settings
  const settings = usePopupStore(state => state.settings);
  const minProfitPercentage = settings.minimumProfitPercentage;
  
  // If no minimum profit set, return all products
  if (!minProfitPercentage) return products;
  
  // Filter products by profit percentage
  return products.filter(product => {
    if (!product.profit) return false;
    return product.profit.percentage >= minProfitPercentage;
  });
};

/**
 * Check if we have any matched opportunities in the current comparison
 */
export const useHasMatchedOpportunities = (): boolean => {
  const comparison = useComparison();
  
  if (!comparison) return false;
  
  const { matchedProducts } = comparison;
  
  for (const marketplace in matchedProducts) {
    const products = matchedProducts[marketplace as keyof typeof matchedProducts];
    if (products && products.length > 0) {
      return true;
    }
  }
  
  return false;
};

/**
 * Calculate the total potential profit across all opportunities
 * (Only counts positive profits for the summary)
 */
export const useTotalPotentialProfit = () => {
  const comparison = useComparison();
  
  if (!comparison) return { amount: 0, percentage: 0 };
  
  const { matchedProducts } = comparison;
  let totalAmount = 0;
  let count = 0;
  
  for (const marketplace in matchedProducts) {
    const products = matchedProducts[marketplace as keyof typeof matchedProducts];
    if (!products) continue;
    
    for (const product of products) {
      if (product.profit && product.profit.amount > 0) {
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
