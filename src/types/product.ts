// src/types/product.ts - Centralized product type definitions

import { MarketplaceType } from './marketplace';

/**
 * Represents product data extracted from a marketplace page
 */
export interface ProductData {
  title: string;
  price: number | null;
  marketplace: MarketplaceType;
  productId: string;
  brand: string | null;
  upc: string | null;
  asin: string | null;
  imageUrl: string | null;
  pageUrl: string;
}

/**
 * Represents a product match result from a marketplace
 */
export interface ProductMatchResult {
  title: string;
  price: number | null;
  image: string | null;
  url: string;
  marketplace: MarketplaceType;
  item_id?: string;
  asin?: string;
  upc?: string;
  profit?: ProfitInfo;
  ratings?: RatingsInfo;
  fee_breakdown?: FeeBreakdown;
}

/**
 * Represents profit information for a product
 */
export interface ProfitInfo {
  amount: number;
  percentage: number;
}

/**
 * Represents ratings information for a product
 */
export interface RatingsInfo {
  average: number | null;
  count: number | null;
}

/**
 * Represents fee breakdown information for profit calculation
 */
export interface FeeBreakdown {
  marketplace_fee_percentage: number;
  marketplace_fee_amount: number;
  additional_fees: number;
  total_fees: number;
}

/**
 * Represents a product comparison between marketplaces
 */
export interface ProductComparison {
  sourceProduct: ProductData;
  matchedProducts: {
    amazon?: ProductMatchResult[];
    walmart?: ProductMatchResult[];
    target?: ProductMatchResult[];
  };
  timestamp: number;
}
