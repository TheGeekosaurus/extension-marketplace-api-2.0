// src/types/settings.ts - Settings type definitions

import { MarketplaceType, MarketplaceFees, ResellableMarketplaceType } from './marketplace';

/**
 * User settings for the extension
 */
export interface Settings {
  /**
   * Base URL for API endpoints
   * @deprecated API URL is now hardcoded in the codebase
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
   * @deprecated We're not reselling on Home Depot
   */
  homeDepotStoreId?: string | null;
  
  /**
   * ZIP code for location-specific pricing and inventory
   * @deprecated We're not reselling on Home Depot
   */
  locationZipCode?: string | null;
}

/**
 * Default settings
 */
export const DEFAULT_SETTINGS: Settings = {
  apiBaseUrl: 'https://ftliettyjscrejxhdnuj.functions.supabase.co', // Hardcoded in ApiClient.ts as well
  cacheExpiration: 24,
  minimumProfitPercentage: 10,
  includeFees: true,
  estimatedFees: {
    amazon: 0.15,
    target: 0.10,
    walmart: 0.00,  // We're not reselling on Walmart
    homedepot: 0.00 // We're not reselling on Home Depot
  },
  selectedMarketplace: null,
  additionalFees: 0,
  homeDepotStoreId: null,
  locationZipCode: null
};
