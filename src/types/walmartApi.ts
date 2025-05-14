// src/types/walmartApi.ts
// Types for Walmart Affiliate API

/**
 * Walmart API Configuration
 */
export interface WalmartApiConfig {
  consumerId: string;
  privateKey: string;
  privateKeyVersion: string;
  publisherId: string;
  baseUrl: string;
}

/**
 * Walmart Search API Parameters
 */
export interface WalmartSearchParams {
  query: string;
  categoryId?: string;
  start?: number;
  sort?: 'relevance' | 'price' | 'title' | 'bestseller' | 'customerRating' | 'new';
  order?: 'ascending' | 'descending';
  numItems?: number;
  responseGroup?: 'base' | 'full';
  facet?: 'on' | 'off';
  facetFilter?: string;
  facetRange?: string;
}

/**
 * Walmart Product Lookup Parameters
 */
export interface WalmartProductParams {
  upc?: string;
  itemId?: string;
}

/**
 * Walmart API Item Response
 */
export interface WalmartItem {
  itemId: number;
  parentItemId?: number;
  name: string;
  msrp?: number;
  salePrice: number;
  upc: string;
  categoryPath: string;
  shortDescription?: string;
  longDescription?: string;
  brandName: string;
  thumbnailImage: string;
  mediumImage: string;
  largeImage: string;
  productTrackingUrl: string;
  color?: string;
  marketplace: boolean;
  standardShipRate?: number;
  modelNumber?: string;
  customerRating?: string;
  numReviews?: number;
  customerRatingImage?: string;
  categoryNode?: string;
  bundle?: boolean;
  clearance?: boolean;
  preOrder?: boolean;
  stock?: string;
  attributes?: Record<string, string>;
  imageEntities?: {
    thumbnailImage: string;
    mediumImage: string;
    largeImage: string;
    entityType: string;
  }[];
  offerType?: string;
  isTwoDayShippingEligible?: boolean;
  availableOnline: boolean;
  bestMarketplacePrice?: {
    price: number;
    sellerInfo: string;
    standardShipRate: number;
    availableOnline: boolean;
  };
  affiliateAddToCartUrl?: string;
}

/**
 * Walmart API Search Response
 */
export interface WalmartSearchResponse {
  query: string;
  sort: string;
  responseGroup: string;
  totalResults: number;
  start: number;
  numItems: number;
  items: WalmartItem[];
  facets?: any[];
}

/**
 * Walmart API Error Response
 */
export interface WalmartErrorResponse {
  errors: {
    code: string;
    message: string;
  }[];
}