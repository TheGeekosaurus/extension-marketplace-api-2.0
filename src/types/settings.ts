// src/types/settings.ts - Settings type definitions

import { MarketplaceType, MarketplaceFees, ResellableMarketplaceType } from './marketplace';
import { WalmartApiConfig } from './walmartApi';

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
  
  /**
   * Whether category mode is enabled
   * When enabled, the extension will process category pages to find multiple products at once
   */
  categoryModeEnabled: boolean;
  
  /**
   * Maximum number of products to process from a category page
   */
  categoryMaxProducts: number;
  
  /**
   * Batch size for processing category products
   */
  categoryBatchSize: number;
  
  /**
   * Whether to use direct marketplace APIs instead of third-party services
   */
  useDirectApis: boolean;
  
  /**
   * Walmart API configuration for direct access
   */
  walmartApiConfig?: WalmartApiConfig;
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
    walmart: 0.10,  // Updated: We ARE reselling on Walmart now
    target: 0.00,   // We're not reselling on Target
    homedepot: 0.00 // We're not reselling on Home Depot
  },
  selectedMarketplace: null,
  additionalFees: 0,
  homeDepotStoreId: null,
  locationZipCode: null,
  categoryModeEnabled: false,
  categoryMaxProducts: 20,
  categoryBatchSize: 5,
  useDirectApis: true,
  walmartApiConfig: {
    consumerId: '5db78bfa-5954-4960-bc39-4d6cad42e426',
    privateKey: '-----BEGIN PRIVATE KEY-----MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCQxTI4B05Ct8G9v2sCZ6tLP9kauCwW5tDYR3PhClAFI6cJz3j7yqAFNtHJxHuJQpOq88yTzLNaqTa6L2ux7rHGpUskTEnCKAF9qJPOnOIGLipx5uFVub20tm1WIYNyGM0QYvXQgh0W2NzvTSZetA/CKrh95pfl99tSwBtStdiqqAncjdoxat7x8dRozizS3exLv9Kp8w6nzuIA8pjBWJsaXAgq7+4HLbmMKR2x6s7UMLOzbH2jfvI2sO/B+pksZomQx79oPIKNyiYnz8izx3F0acuPxOrTvCoi6ARwuEGwoQbMO1wGX0PmyB+2ZxSju0PTIcJQ0ow3NUXICLFWN7VbAgMBAAECggEARa79vLVbiMa9lXGBdy9iZr6taGyVIFLq3OgL0ZsuqEKggRriH8TJIKlh8q5GTmwC+0sNwmjKPg3sP1NbEdMUtErU7/xelnu+N/eAaffe3d2z5Y6eES7uLwGOgGJyTGW+szAHJV2z1c7+DZvDp9shKLN6iXOI0xNqeRrqK/ZG++FcIjmNKxB1hUkEjv6miRk3dh1sBWA0Y68k5dzgUanmo1MqMaqEsww4890lEvqSFPnLc3+z13EMJfFs4AUIUOusy2LKrpiLz8LDxwGyKjae0op8w5siGzh8JBA5YZvcJkIQ9GUeKr/Mce9SBtOwb15vEStHILuh/LKdVdIOLBZCZQKBgQDIC9xJS374J7uhyQgF6H+IFy4MqhT7WBgUBsykvVxdvUdmESVU7pSMXx449KE4QlBfK1C5QSdfGpeSsMaCog7HeqdXIOcHlhjzUmouzHG4UyaekUSeJwwlQSeEuS22W9t1USpbo8v3YIV0eDrrUYtWL+deRE+XS7fZZiOMM8XkVQKBgQC5Q1gznLytmYL/b987Y2bY1+PYlcdlKrhrOwcNh5WtM8aIIh63xnoBeHLjFTgdkiYu02aPBWUT5R4Zq58Vxh2nukHPKB/z7Ew4VWIFXd9GzQHagXyEHXsZvuwebruwLXKPQej36e8mYofkdVSHVfx5VkKY1JhkMp6P0G0E2dNi7wKBgDyJ4lNIBpegppayWLw4/Qc5RJVOj2T05uyAlkOwjphLpKTNwYdvYAMO8f14gqWc4+e5GwfFIN4WFRKubpSv6FsT0jp62Y+hK9HO+hVJh4yplUFdYu+dj35itkvjImNSbxqUwoXTDvHBAwIZNHNsTQd7HcCYWaHGp0+iKlXOgS+1AoGAD26Ho0zz/nXiDorwCk9eWsOo6/qV8Fxdnjj9fmgD1LiSWfaVnnM+6G5zC21SDkyFN7NOQK2PXNfh6Pt9td+ZysXeA3ZxKu1M8AhUsOO/3HLpK51LlOmrvlpD6skIg0VV3I796+CllgnxDdukHd3QuP6xb2+N/hKlWI9g9V17mSsCgYEAxfMecud2HuHb9mKF3MvklspKR9Q3+fC7eH2WYRluB4laoCarfUrw9uATOKpK84UIrXxxYQuc5xVKhy92khSOUrQjzAHYTbckaPEo6mPOAMLA0Xhoj/i3tPJ2gYcN4eGnoWEl8QNoUvonjfQsr1zbON0XB68es0xzHm/RZ0avxas=-----END PRIVATE KEY-----', // To be provided by the user
    privateKeyVersion: '1',
    publisherId: '', // To be provided by the user
    baseUrl: 'https://developer.api.walmart.com'
  }
};
