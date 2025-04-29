// src/types/marketplace.ts - Marketplace-related type definitions

/**
 * Supported marketplace types
 */
export type MarketplaceType = 'amazon' | 'walmart' | 'target' | 'homedepot';

/**
 * Marketplace fee structure
 */
export interface MarketplaceFees {
  amazon: number;
  walmart: number;
  target: number;
  homedepot: number;
}

/**
 * API service names
 */
export type ApiServiceType = 'bluecart' | 'rainforest' | 'bigbox';

/**
 * Mapping between marketplace and API service
 */
export const marketplaceToApiService: Record<MarketplaceType, ApiServiceType | null> = {
  walmart: 'bluecart',
  amazon: 'rainforest',
  target: 'bigbox',
  homedepot: null  // No API service for HomeDepot yet
};

/**
 * Mapping between API service and marketplace
 */
export const apiServiceToMarketplace: Record<ApiServiceType, MarketplaceType> = {
  bluecart: 'walmart',
  rainforest: 'amazon',
  bigbox: 'target'
};
