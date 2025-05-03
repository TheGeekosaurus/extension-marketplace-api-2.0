// src/background/services/cacheService.ts - Cache service for storing and retrieving data

import { CacheData, CacheOperation } from '../../types';
import { getSettings } from './settingsService';

/**
 * Service for handling caching of data
 */
export class CacheService {
  /**
   * Cache key prefix to avoid collisions
   */
  private static PREFIX = 'ecommerce_arbitrage_';
  
  /**
   * Memory cache for faster access
   */
  private static memoryCache: Record<string, any> = {};
  
  /**
   * Generate a cache key for a given identifier
   * 
   * @param key - Cache key identifier
   * @returns Prefixed cache key
   */
  private static getCacheKey(key: string): string {
    return `${this.PREFIX}${key}`;
  }
  
  /**
   * Get data from cache if valid
   * 
   * @param key - Cache key
   * @returns Cached data or null if not found or expired
   */
  static async get<T>(key: string): Promise<T | null> {
    const cacheKey = this.getCacheKey(key);
    
    // Check memory cache first
    if (this.memoryCache[cacheKey]) {
      console.log(`[E-commerce Arbitrage Cache] Memory cache hit for: ${key}`);
      return this.memoryCache[cacheKey].data;
    }
    
    try {
      console.log(`[E-commerce Arbitrage Cache] Checking storage cache for: ${key}`);
      
      // Get from chrome storage
      return new Promise<T | null>((resolve) => {
        chrome.storage.local.get([cacheKey], (result) => {
          if (chrome.runtime.lastError) {
            console.error('Error retrieving from cache:', chrome.runtime.lastError);
            resolve(null);
            return;
          }
          
          const cacheItem = result[cacheKey] as CacheData<T> | undefined;
          
          if (!cacheItem) {
            console.log(`[E-commerce Arbitrage Cache] No cache found for: ${key}`);
            resolve(null);
            return;
          }
          
          // Check if cache is expired
          const settings = getSettings();
          const now = Date.now();
          const cacheExpiration = settings.cacheExpiration * 60 * 60 * 1000; // hours to ms
          
          if (now - cacheItem.timestamp > cacheExpiration) {
            console.log(`[E-commerce Arbitrage Cache] Cache expired for: ${key}`);
            resolve(null);
            return;
          }
          
          console.log(`[E-commerce Arbitrage Cache] Cache hit for: ${key}`);
          
          // Store in memory cache for faster access next time
          this.memoryCache[cacheKey] = cacheItem;
          
          resolve(cacheItem.data);
        });
      });
    } catch (error) {
      console.error('Error in cache retrieval:', error);
      return null;
    }
  }
  
  /**
   * Store data in cache
   * 
   * @param key - Cache key
   * @param data - Data to cache
   * @returns Promise that resolves when data is cached
   */
  static async set<T>(key: string, data: T): Promise<void> {
    const cacheKey = this.getCacheKey(key);
    
    const cacheItem: CacheData<T> = {
      data,
      timestamp: Date.now()
    };
    
    try {
      console.log(`[E-commerce Arbitrage Cache] Caching data for: ${key}`);
      
      // Store in memory cache
      this.memoryCache[cacheKey] = cacheItem;
      
      // Store in chrome storage
      return new Promise<void>((resolve) => {
        chrome.storage.local.set({ [cacheKey]: cacheItem }, () => {
          if (chrome.runtime.lastError) {
            console.error('Error storing in cache:', chrome.runtime.lastError);
          } else {
            console.log(`[E-commerce Arbitrage Cache] Data cached for: ${key}`);
          }
          resolve();
        });
      });
    } catch (error) {
      console.error('Error in cache storage:', error);
      throw error;
    }
  }
  
  /**
   * Remove item from cache
   * 
   * @param key - Cache key to remove
   * @returns Promise that resolves when the item is removed
   */
  static async remove(key: string): Promise<void> {
    const cacheKey = this.getCacheKey(key);
    
    try {
      console.log(`[E-commerce Arbitrage Cache] Removing cache for: ${key}`);
      
      // Remove from memory cache
      delete this.memoryCache[cacheKey];
      
      // Remove from chrome storage
      return new Promise<void>((resolve) => {
        chrome.storage.local.remove(cacheKey, () => {
          if (chrome.runtime.lastError) {
            console.error('Error removing from cache:', chrome.runtime.lastError);
          } else {
            console.log(`[E-commerce Arbitrage Cache] Cache removed for: ${key}`);
          }
          resolve();
        });
      });
    } catch (error) {
      console.error('Error in cache removal:', error);
      throw error;
    }
  }
  
  /**
   * Clear all cache data
   * 
   * @returns Promise that resolves when cache is cleared
   */
  static async clear(): Promise<void> {
    try {
      console.log('[E-commerce Arbitrage Cache] Clearing all cache');
      
      // Clear memory cache
      this.memoryCache = {};
      
      // Clear all cache keys from storage
      return new Promise<void>((resolve) => {
        chrome.storage.local.get(null, (items) => {
          const keysToRemove = Object.keys(items).filter(
            key => key.startsWith(this.PREFIX)
          );
          
          if (keysToRemove.length === 0) {
            console.log('[E-commerce Arbitrage Cache] No cache items to clear');
            resolve();
            return;
          }
          
          chrome.storage.local.remove(keysToRemove, () => {
            if (chrome.runtime.lastError) {
              console.error('Error clearing cache:', chrome.runtime.lastError);
            } else {
              console.log(`[E-commerce Arbitrage Cache] Cleared ${keysToRemove.length} cache items`);
            }
            resolve();
          });
        });
      });
    } catch (error) {
      console.error('Error in cache clearing:', error);
      throw error;
    }
  }
  
  /**
   * Generate a cache key for a product comparison
   * 
   * @param productData - Product data
   * @returns Cache key for the product
   */
  static generateProductCacheKey(productData: any): string {
    const identifier = productData.upc || productData.asin || productData.productId;
    return `${productData.marketplace}-${identifier}`;
  }
}
