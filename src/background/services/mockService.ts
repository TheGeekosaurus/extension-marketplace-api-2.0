// src/background/services/mockService.ts - Mock data generation service

import { ProductData, ProductMatchResult, MarketplaceType } from '../../types';

/**
 * Service for generating mock product data for testing
 */
export class MockService {
  /**
   * Generate mock product matches for a source product
   * 
   * @param productData - Source product data
   * @returns Mock product matches for different marketplaces
   */
  static generateMockProductMatches(productData: ProductData): Record<string, ProductMatchResult[]> {
    console.log('[E-commerce Arbitrage Mock] Generating mock matches for', productData);
    
    const result: Record<string, ProductMatchResult[]> = {};
    
    // Don't create mock matches for the source marketplace
    if (productData.marketplace !== 'amazon') {
      result.amazon = [{
        title: `${productData.title} - Amazon Version`,
        price: productData.price ? productData.price * 1.2 : 19.99, // 20% higher price for profit
        image: productData.imageUrl,
        url: `https://amazon.com/dp/B07XYZABC`,
        marketplace: 'amazon',
        asin: 'B07XYZABC',
        ratings: {
          average: 4.5,
          count: 128
        }
      }];
    }
    
    if (productData.marketplace !== 'walmart') {
      result.walmart = [{
        title: `${productData.title} - Walmart Version`,
        price: productData.price ? productData.price * 0.9 : 15.99, // 10% lower price
        image: productData.imageUrl,
        url: `https://walmart.com/ip/12345`,
        marketplace: 'walmart',
        item_id: '12345',
        ratings: {
          average: 4.2,
          count: 87
        }
      }];
    }
    
    if (productData.marketplace !== 'target') {
      result.target = [{
        title: `${productData.title} - Target Version`,
        price: productData.price ? productData.price * 1.1 : 17.99, // 10% higher price
        image: productData.imageUrl,
        url: `https://target.com/p/item/-/A-12345`,
        marketplace: 'target',
        ratings: {
          average: 4.0,
          count: 63
        }
      }];
    }
    
    console.log('[E-commerce Arbitrage Mock] Generated mock matches:', result);
    return result;
  }
  
  /**
   * Generate more realistic mock product data based on category
   * 
   * @param productData - Source product data
   * @returns Enhanced mock product matches
   */
  static generateEnhancedMockMatches(productData: ProductData): Record<string, ProductMatchResult[]> {
    // Basic mock data
    const basicMockData = this.generateMockProductMatches(productData);
    
    // Detect product category from title
    const category = this.detectProductCategory(productData.title);
    
    // Adjust prices based on category trends
    return this.adjustPricesByCategory(basicMockData, category, productData.price);
  }
  
  /**
   * Detect likely product category from title
   * 
   * @param title - Product title
   * @returns Detected category
   */
  private static detectProductCategory(title: string): string {
    const lowerTitle = title.toLowerCase();
    
    if (lowerTitle.includes('dog') || lowerTitle.includes('cat') || lowerTitle.includes('pet')) {
      return 'pet-supplies';
    } else if (lowerTitle.includes('vacuum') || lowerTitle.includes('cleaner') || lowerTitle.includes('kitchen')) {
      return 'household';
    } else if (lowerTitle.includes('cream') || lowerTitle.includes('scrub') || lowerTitle.includes('hair')) {
      return 'beauty';
    } else if (lowerTitle.includes('food') || lowerTitle.includes('snack') || lowerTitle.includes('drink')) {
      return 'grocery';
    } else if (lowerTitle.includes('usb') || lowerTitle.includes('cable') || lowerTitle.includes('phone')) {
      return 'electronics';
    }
    
    return 'general';
  }
  
  /**
   * Adjust mock prices based on product category
   * 
   * @param mockData - Basic mock data
   * @param category - Product category
   * @param basePrice - Original product price
   * @returns Adjusted mock data
   */
  private static adjustPricesByCategory(
    mockData: Record<string, ProductMatchResult[]>,
    category: string,
    basePrice: number | null
  ): Record<string, ProductMatchResult[]> {
    if (!basePrice) return mockData;
    
    const categoryMultipliers: Record<string, Record<MarketplaceType, number>> = {
      'pet-supplies': {
        amazon: 1.25,  // Amazon charges premium for pet supplies
        walmart: 0.85, // Walmart often cheaper
        target: 1.05   // Target slightly higher
      },
      'household': {
        amazon: 1.15,
        walmart: 0.80, // Walmart very competitive in household
        target: 0.95
      },
      'beauty': {
        amazon: 1.20,
        walmart: 0.90,
        target: 1.15  // Target often premium in beauty
      },
      'grocery': {
        amazon: 1.30, // Amazon grocery often expensive
        walmart: 0.75, // Walmart very cheap for grocery
        target: 0.85
      },
      'electronics': {
        amazon: 1.05, // Amazon competitive in electronics
        walmart: 1.00, // Walmart less competitive
        target: 1.10
      },
      'general': {
        amazon: 1.20,
        walmart: 0.90,
        target: 1.10
      }
    };
    
    // Use the multipliers for the detected category, or default to general
    const multipliers = categoryMultipliers[category] || categoryMultipliers.general;
    
    // Clone the mock data
    const result = JSON.parse(JSON.stringify(mockData)) as Record<string, ProductMatchResult[]>;
    
    // Adjust prices for each marketplace
    Object.entries(result).forEach(([marketplace, products]) => {
      const marketplaceKey = marketplace as MarketplaceType;
      if (multipliers[marketplaceKey] && products.length > 0) {
        products[0].price = +(basePrice * multipliers[marketplaceKey]).toFixed(2);
      }
    });
    
    return result;
  }
}
