// src/types/settings.ts - Settings type definitions

import { MarketplaceType } from './marketplace';

/**
 * Marketplace fee structure
 */
export interface MarketplaceFees {
  amazon: number;
  walmart: number;
  target: number;
}

/**
 * User settings for the extension
 */
export interface Settings {
  /**
   * Base URL for API endpoints
   */
  apiBaseUrl: string;
  
  /**
   * How long to cache results (in hours)
   */
  cacheExpiration: number;
  
  /**
   * Minimum profit percentage to show in results
   */
  minimumProfitPercentage: number;
  
  /**
   * Whether to include marketplace fees in profit calculations
   */
  includeFees: boolean;
  
  /**
   * Estimated fee percentages for each marketplace
   */
  estimatedFees: MarketplaceFees;
  
  /**
   * Enable debug mode with additional logging
   */
  debugMode?: boolean;

  /**
   * Whether to use mock data instead of real API data
   */
  useMockData?: boolean;
  
  /**
   * Selected marketplace to search (if null, search all marketplaces)
   */
  selectedMarketplace?: MarketplaceType | null;
}

/**
 * Default settings
 */
export const DEFAULT_SETTINGS: Settings = {
  apiBaseUrl: 'https://extension-marketplace-api-2-0-1.onrender.com/api',
  cacheExpiration: 24,
  minimumProfitPercentage: 10,
  includeFees: true,
  estimatedFees: {
    amazon: 0.15,
    walmart: 0.12,
    target: 0.10
  },
  debugMode: false,
  useMockData: true,
  selectedMarketplace: null
};
