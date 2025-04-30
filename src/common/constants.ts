// src/common/constants.ts - Shared constants

import { MarketplaceFees, Settings } from '../types';

/**
 * Default API base URL
 * Changed to point to the new backend
 */
export const DEFAULT_API_BASE_URL = 'https://ext.nanotomlogistics.com';

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
  target: 0.10,  // 10%
  homedepot: 0.10 // 10% (default for HomeDepot)
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
  selectedMarketplace: null,
  additionalFees: 0
};

/**
 * Marketplace URL patterns
 */
export const MARKETPLACE_URL_PATTERNS = {
  amazon: ['amazon.com'],
  walmart: ['walmart.com'],
  target: ['target.com'],
  homedepot: ['homedepot.com']
};

/**
 * Extension version
 */
export const VERSION = '1.1.0';

/**
 * Storage keys
 */
export const STORAGE_KEYS = {
  SETTINGS: 'settings',
  CURRENT_PRODUCT: 'currentProduct',
  PRODUCT_CACHE: 'productCache',
  API_KEY: 'apiKey'
};

/**
 * Storage namespace prefix to avoid collisions
 */
export const STORAGE_PREFIX = 'ecommerce_arbitrage_';

/**
 * Credit costs for different operations
 */
export const CREDIT_COSTS = {
  PRICE_COMPARISON: 5,
  SINGLE_MARKETPLACE_SEARCH: 2
};

/**
 * Web app URLs
 */
export const WEB_APP_URLS = {
  DASHBOARD: 'https://ext.nanotomlogistics.com/dashboard',
  PURCHASE: 'https://ext.nanotomlogistics.com/purchase',
  SIGNUP: 'https://ext.nanotomlogistics.com/signup',
  HELP: 'https://ext.nanotomlogistics.com/help'
};
