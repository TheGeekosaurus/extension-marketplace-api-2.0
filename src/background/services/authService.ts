// src/background/services/authService.ts - Authentication service

import { createLogger } from '../utils/logger';

// Configure the API base URL
const API_BASE_URL = 'https://ftliettyjscrejxhdnuj.functions.supabase.co';

// Initialize logger
const logger = createLogger('AuthService');

// Define auth state interface
interface AuthState {
  isAuthenticated: boolean;
  user: {
    id: string;
    email: string;
  } | null;
  token: string | null;
  credits: number;
}

// Define credit check response interface
interface CreditCheckResponse {
  sufficient: boolean;
  balance: number;
}

/**
 * Service for handling authentication and user-related functionality
 */
export class AuthService {
  private static state: AuthState = {
    isAuthenticated: false,
    user: null,
    token: null,
    credits: 0
  };

  /**
   * Initialize the auth service by loading saved API key
   * and verifying if it's still valid
   */
  static async initialize(): Promise<void> {
    try {
      // Load API key from storage
      const apiKey = await this.getApiKey();
      
      if (apiKey) {
        logger.info('Found stored API key, verifying...');
        
        // Verify the API key
        const result = await this.verifyApiKey(apiKey);
        
        if (result.valid) {
          logger.info('API key verified successfully');
          
          this.state = {
            isAuthenticated: true,
            user: result.user,
            token: apiKey,
            credits: result.user.credits
          };
        } else {
          logger.warn('Stored API key is no longer valid');
          await this.clearApiKey();
        }
      } else {
        logger.info('No API key found in storage');
      }
    } catch (error) {
      logger.error('Error initializing auth service:', error);
    }
  }

  /**
   * Get the API key from storage
   */
  static async getApiKey(): Promise<string | null> {
    return new Promise((resolve) => {
      chrome.storage.local.get(['apiKey'], (result) => {
        logger.debug('Getting API key from storage:', result.apiKey ? 'Found API key' : 'No API key found');
        resolve(result.apiKey || null);
      });
    });
  }

  /**
   * Save the API key to storage
   */
  static async saveApiKey(apiKey: string): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ apiKey }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Clear the API key from storage
   */
  static async clearApiKey(): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.remove(['apiKey', 'user'], () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Verify if an API key is valid
   */
  static async verifyApiKey(apiKey: string): Promise<{valid: boolean, user?: any}> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth-verify-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ api_key: apiKey })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        logger.error('API key verification failed:', data.error);
        return { valid: false };
      }
      
      return data;
    } catch (error) {
      logger.error('Error verifying API key:', error);
      return { valid: false };
    }
  }

  /**
   * Verify and save an API key, updating the auth state
   */
  static async verifyAndSaveApiKey(apiKey: string): Promise<{valid: boolean, user?: any}> {
    try {
      const result = await this.verifyApiKey(apiKey);
      
      if (result.valid) {
        // Save the API key if valid
        await this.saveApiKey(apiKey);
        
        // Update auth state
        this.state = {
          isAuthenticated: true,
          user: result.user,
          token: apiKey,
          credits: result.user.credits
        };
      }
      
      return result;
    } catch (error) {
      logger.error('Error verifying and saving API key:', error);
      return { valid: false };
    }
  }

  /**
   * Check if the user is authenticated
   */
  static async isAuthenticated(): Promise<boolean> {
    if (this.state.isAuthenticated) {
      return true;
    }
    
    // If not authenticated in memory, check if we have a stored API key
    const apiKey = await this.getApiKey();
    if (!apiKey) {
      return false;
    }
    
    // Verify the API key
    const result = await this.verifyApiKey(apiKey);
    
    if (result.valid) {
      this.state = {
        isAuthenticated: true,
        user: result.user,
        token: apiKey,
        credits: result.user.credits
      };
      return true;
    }
    
    return false;
  }

  /**
   * Get the user's current credit balance
   */
  static async getCreditsBalance(): Promise<number> {
    try {
      const apiKey = await this.getApiKey();
      
      if (!apiKey) {
        return 0;
      }
      
      const response = await fetch(`${API_BASE_URL}/credits-balance`, {
        headers: {
          'x-api-key': apiKey
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to get credit balance');
      }
      
      const data = await response.json();
      
      // Update the cached balance
      this.state.credits = data.balance;
      
      return data.balance;
    } catch (error) {
      logger.error('Error getting credit balance:', error);
      return 0;
    }
  }

  /**
   * Check if the user has enough credits for an operation
   */
  static async checkCredits(amount: number): Promise<CreditCheckResponse> {
    try {
      const apiKey = await this.getApiKey();
      
      if (!apiKey) {
        return { sufficient: false, balance: 0 };
      }
      
      const response = await fetch(`${API_BASE_URL}/credits-check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        },
        body: JSON.stringify({ amount })
      });
      
      if (!response.ok) {
        throw new Error('Failed to check credits');
      }
      
      const data = await response.json();
      
      // Update the cached balance
      this.state.credits = data.balance;
      
      return {
        sufficient: data.sufficient,
        balance: data.balance
      };
    } catch (error) {
      logger.error('Error checking credits:', error);
      return { sufficient: false, balance: 0 };
    }
  }

  /**
   * Use credits for an operation
   */
  static async useCredits(amount: number, description: string, requestInfo: any): Promise<boolean> {
    try {
      const apiKey = await this.getApiKey();
      
      if (!apiKey) {
        return false;
      }
      
      const response = await fetch(`${API_BASE_URL}/credits-use`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        },
        body: JSON.stringify({
          amount,
          description,
          request_info: requestInfo
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to use credits');
      }
      
      const data = await response.json();
      
      // Update the cached balance
      if (data.success) {
        this.state.credits = data.new_balance;
      }
      
      return data.success;
    } catch (error) {
      logger.error('Error using credits:', error);
      return false;
    }
  }

  /**
   * Log out the user by clearing auth state and storage
   */
  static async logout(): Promise<void> {
    // Clear auth state
    this.state = {
      isAuthenticated: false,
      user: null,
      token: null,
      credits: 0
    };
    
    // Clear storage
    await this.clearApiKey();
    
    logger.info('User logged out');
  }

  /**
   * Get the current auth state
   */
  static getAuthState(): AuthState {
    return this.state;
  }
}
