// src/background/utils/errorHandler.ts - Centralized error handling

import { createLogger } from './logger';

const logger = createLogger('ErrorHandler');

/**
 * Error types for the extension
 */
export enum ErrorType {
  NETWORK = 'NETWORK',
  API = 'API',
  EXTRACTION = 'EXTRACTION',
  CACHE = 'CACHE',
  SETTINGS = 'SETTINGS',
  GENERAL = 'GENERAL'
}

/**
 * Extended error class with type information
 */
export class ExtensionError extends Error {
  type: ErrorType;
  originalError?: any;
  
  constructor(message: string, type: ErrorType, originalError?: any) {
    super(message);
    this.name = 'ExtensionError';
    this.type = type;
    this.originalError = originalError;
    
    // Capturing stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ExtensionError);
    }
  }
}

/**
 * Handle errors in a centralized way
 * 
 * @param error - Error to handle
 * @param context - Additional context about where the error occurred
 * @returns Standardized error response
 */
export function handleError(error: any, context: string): { success: false; error: string; errorDetails?: string } {
  // Format original error
  let errorMessage = 'An unknown error occurred';
  let errorDetails: string | undefined;
  
  if (error instanceof ExtensionError) {
    errorMessage = error.message;
    logger.error(`${error.type} error in ${context}: ${error.message}`, error.originalError);
    
    if (error.originalError) {
      errorDetails = typeof error.originalError === 'string' 
        ? error.originalError 
        : error.originalError.message || JSON.stringify(error.originalError);
    }
  } else if (error instanceof Error) {
    errorMessage = error.message;
    logger.error(`Error in ${context}: ${error.message}`, error);
    errorDetails = error.stack;
  } else if (typeof error === 'string') {
    errorMessage = error;
    logger.error(`Error in ${context}: ${error}`);
  } else {
    try {
      errorDetails = JSON.stringify(error);
      logger.error(`Unknown error in ${context}`, error);
    } catch (e) {
      logger.error(`Unserializable error in ${context}`);
    }
  }
  
  // Return standardized error response
  return {
    success: false,
    error: errorMessage,
    errorDetails
  };
}

/**
 * Create a network error
 * 
 * @param message - Error message
 * @param originalError - Original error
 * @returns Network error
 */
export function createNetworkError(message: string, originalError?: any): ExtensionError {
  return new ExtensionError(message, ErrorType.NETWORK, originalError);
}

/**
 * Create an API error
 * 
 * @param message - Error message
 * @param originalError - Original error
 * @returns API error
 */
export function createApiError(message: string, originalError?: any): ExtensionError {
  return new ExtensionError(message, ErrorType.API, originalError);
}

/**
 * Create an extraction error
 * 
 * @param message - Error message
 * @param originalError - Original error
 * @returns Extraction error
 */
export function createExtractionError(message: string, originalError?: any): ExtensionError {
  return new ExtensionError(message, ErrorType.EXTRACTION, originalError);
}

/**
 * Create a cache error
 * 
 * @param message - Error message
 * @param originalError - Original error
 * @returns Cache error
 */
export function createCacheError(message: string, originalError?: any): ExtensionError {
  return new ExtensionError(message, ErrorType.CACHE, originalError);
}

/**
 * Create a settings error
 * 
 * @param message - Error message
 * @param originalError - Original error
 * @returns Settings error
 */
export function createSettingsError(message: string, originalError?: any): ExtensionError {
  return new ExtensionError(message, ErrorType.SETTINGS, originalError);
}

/**
 * Create a general error
 * 
 * @param message - Error message
 * @param originalError - Original error
 * @returns General error
 */
export function createGeneralError(message: string, originalError?: any): ExtensionError {
  return new ExtensionError(message, ErrorType.GENERAL, originalError);
}
