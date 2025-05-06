// src/content/utils/walmartJsonExtractor.ts - Utility for extracting data from Walmart's embedded JSON

import { logExtraction } from './extraction';

/**
 * Interface for Walmart JSON data structure
 */
interface WalmartJsonData {
  props?: {
    pageProps?: {
      initialData?: {
        searchResult?: {
          itemStacks?: Array<{
            items?: Array<WalmartJsonItemRaw>;
          }>;
        };
      };
    };
  };
}

/**
 * Raw item structure from Walmart's JSON data
 */
interface WalmartJsonItemRaw {
  usItemId?: string;
  id?: string;
  name?: string;
  title?: string;
  price?: string | number;
  priceInfo?: {
    currentPrice?: {
      price?: number;
    };
    linePrice?: number;
    linePriceDisplay?: string;
  };
  sellPrice?: number;
  canonicalUrl?: string;
  productPageUrl?: string;
  imageInfo?: {
    thumbnailUrl?: string;
  };
  image?: string;
  images?: string[];
  brand?: string;
  brandName?: string;
  rating?: number;
  averageRating?: string | number;
  reviewCount?: number;
  reviewsCount?: number;
  ratingsTotal?: number;
  upc?: string;
  gtin?: string;
}

/**
 * Interface for the normalized Walmart item data
 */
export interface WalmartJsonItem {
  usItemId: string;
  name: string;
  price: number | null;
  canonicalUrl: string;
  thumbnailUrl: string;
  brand: string | null;
  averageRating: number | null;
  numReviews: number | null;
  upc: string | null;
}

/**
 * Extracts product data from Walmart's embedded Next.js data
 * @returns Extracted products or null if extraction fails
 */
export function extractWalmartJsonData(): WalmartJsonItem[] | null {
  try {
    logExtraction('walmart', 'Attempting to extract data from Walmart JSON');
    
    // Find the Next.js data script tag
    const jsonTag = document.querySelector('script#\\__NEXT_DATA__');
    if (!jsonTag || !jsonTag.textContent) {
      logExtraction('walmart', 'No __NEXT_DATA__ found on Walmart page');
      return null;
    }
    
    // Parse the JSON data
    const data = JSON.parse(jsonTag.textContent) as WalmartJsonData;
    
    // Navigate to the items array in the data structure
    const searchResult = data.props?.pageProps?.initialData?.searchResult;
    if (!searchResult || !searchResult.itemStacks || !searchResult.itemStacks.length) {
      logExtraction('walmart', 'No search results found in Walmart JSON data');
      return null;
    }
    
    // Extract items from the first stack (main results)
    const items = searchResult.itemStacks[0].items;
    if (!items || !items.length) {
      logExtraction('walmart', 'No items found in Walmart search results');
      return null;
    }
    
    logExtraction('walmart', `Found ${items.length} items in Walmart JSON data`);
    
    // Transform items into a standardized format
    const normalizedItems = items.map((item: WalmartJsonItemRaw): WalmartJsonItem => {
      // Extract price with fallbacks
      let price: number | null = null;
      if (typeof item.price === 'number') {
        price = item.price;
      } else if (typeof item.price === 'string') {
        price = parseFloat(item.price);
      } else if (item.priceInfo?.currentPrice?.price) {
        price = item.priceInfo.currentPrice.price;
      } else if (item.sellPrice) {
        price = item.sellPrice;
      } else if (item.priceInfo?.linePrice) {
        price = item.priceInfo.linePrice;
      }
      
      // Get url with proper formatting
      let canonicalUrl = item.canonicalUrl || item.productPageUrl || '';
      if (canonicalUrl && !canonicalUrl.startsWith('http')) {
        canonicalUrl = canonicalUrl.startsWith('/') 
          ? `https://www.walmart.com${canonicalUrl}` 
          : `https://www.walmart.com/${canonicalUrl}`;
      }
      
      // Get image URL
      let thumbnailUrl = '';
      if (item.imageInfo?.thumbnailUrl) {
        thumbnailUrl = item.imageInfo.thumbnailUrl;
      } else if (item.image) {
        thumbnailUrl = item.image;
      } else if (item.images && item.images.length > 0) {
        thumbnailUrl = item.images[0];
      }
      
      // Parse ratings
      let averageRating: number | null = null;
      if (typeof item.averageRating === 'number') {
        averageRating = item.averageRating;
      } else if (typeof item.averageRating === 'string') {
        averageRating = parseFloat(item.averageRating);
      } else if (item.rating !== undefined) {
        averageRating = item.rating;
      }
      
      return {
        usItemId: item.usItemId || item.id || '',
        name: item.name || item.title || '',
        price,
        canonicalUrl,
        thumbnailUrl,
        brand: item.brand || item.brandName || null,
        averageRating,
        numReviews: item.reviewCount || item.reviewsCount || item.ratingsTotal || null,
        upc: item.upc || item.gtin || null
      };
    });
    
    logExtraction('walmart', 'Successfully extracted Walmart JSON data');
    return normalizedItems;
  } catch (error) {
    console.error('[E-commerce Arbitrage] Error extracting Walmart JSON data:', error);
    return null;
  }
}

/**
 * Get a specific item from the JSON data by its ID
 * @param usItemId - The Walmart item ID to search for
 * @returns The matching item or null if not found
 */
export function getWalmartItemById(usItemId: string): WalmartJsonItem | null {
  const items = extractWalmartJsonData();
  if (!items) return null;
  
  return items.find(item => item.usItemId === usItemId) || null;
}
