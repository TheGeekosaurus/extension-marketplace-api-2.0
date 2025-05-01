// src/types/settings.ts - Settings type definitions

import { MarketplaceType, MarketplaceFees, ResellableMarketplaceType } from './marketplace';

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
   * Selected marketplace to search (only Amazon and Walmart as resellable marketplaces)
   */
  selectedMarketplace?: ResellableMarketplaceType | null;
  
  /**
   * Additional fees (shipping, packaging, etc.)
   */
  additionalFees: number;

  /**
   * Home Depot store ID for store-specific inventory checking
   */
  homeDepotStoreId?: string | null;
  
  /**
   * ZIP code for location-specific pricing and inventory
   */
  locationZipCode?: string | null;
}

/**
 * Default settings
 */
export const DEFAULT_SETTINGS: Settings = {
  apiBaseUrl: 'https://extension-marketplace-api-2-0.onrender.com',
  cacheExpiration: 24,
  minimumProfitPercentage: 10,
  includeFees: true,
  estimatedFees: {
    amazon: 0.15,
    walmart: 0.12,
    target: 0.10,
    homedepot: 0.10
  },
  selectedMarketplace: null,
  additionalFees: 0,
  homeDepotStoreId: null,
  locationZipCode: null
};
