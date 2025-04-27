// src/common/constants.ts - Shared constants

import { MarketplaceFees, Settings } from '../types';

/**
 * Default API base URL
 */
export const DEFAULT_API_BASE_URL = 'https://extension-marketplace-api-2-0.onrender.com/api';

/**
 * Default cache expiration time in hours
 */
export const DEFAULT_CACHE_EXPIRATION = 24;

/**
 * Default minimum profit percentage
 */
export const DEFAULT_MIN_PROFIT_PERCENTAGE = 10;

/**
 * Default marketplace fees
 */
export const DEFAULT_MARKETPLACE_FEES: MarketplaceFees = {
  amazon: 0.15,  // 15%
  walmart: 0.12, // 12%
  target: 0.10   // 10%
};

/**
 * Default settings
 */
export const DEFAULT_SETTINGS: Settings = {
  apiBaseUrl: DEFAULT_API_BASE_URL,
  cacheExpiration: DEFAULT_CACHE_EXPIRATION,
  minimumProfitPercentage: DEFAULT_MIN_PROFIT_PERCENTAGE,
  includeFees: true,
  estimatedFees: DEFAULT_MARKETPLACE_FEES,
  selectedMarketplace: null
};

/**
 * Marketplace URL patterns
 */
export const MARKETPLACE_URL_PATTERNS = {
  amazon: ['amazon.com'],
  walmart: ['walmart.com'],
  target: ['target.com']
};

/**
 * Extension version
 */
export const VERSION = '1.0.0';

/**
 * Storage keys
 */
export const STORAGE_KEYS = {
  SETTINGS: 'settings',
  CURRENT_PRODUCT: 'currentProduct',
  PRODUCT_CACHE: 'productCache'
};

/**
 * Storage namespace prefix to avoid collisions
 */
export const STORAGE_PREFIX = 'ecommerce_arbitrage_';
