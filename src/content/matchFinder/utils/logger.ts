// src/content/matchFinder/utils/logger.ts
// Logging utilities for the matchFinder system

// Enum for log levels
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

// Global configuration
const config = {
  enabled: true,
  level: LogLevel.INFO,
  prefix: '[E-commerce Arbitrage]'
};

/**
 * Configure the logger
 * 
 * @param options - Logger configuration options
 */
export function configureLogger(options: {
  enabled?: boolean;
  level?: LogLevel;
  prefix?: string;
}): void {
  if (options.enabled !== undefined) {
    config.enabled = options.enabled;
  }
  
  if (options.level !== undefined) {
    config.level = options.level;
  }
  
  if (options.prefix !== undefined) {
    config.prefix = options.prefix;
  }
}

/**
 * Create a logger with a specific context
 * 
 * @param context - The context for this logger (e.g., 'AmazonMatcher')
 * @returns An object with logging methods
 */
export function createLogger(context: string) {
  const fullPrefix = `${config.prefix} [${context}]`;
  
  return {
    debug: (message: string, ...args: any[]) => {
      if (config.enabled && config.level <= LogLevel.DEBUG) {
        console.debug(`${fullPrefix} ${message}`, ...args);
      }
    },
    
    info: (message: string, ...args: any[]) => {
      if (config.enabled && config.level <= LogLevel.INFO) {
        console.info(`${fullPrefix} ${message}`, ...args);
      }
    },
    
    warn: (message: string, ...args: any[]) => {
      if (config.enabled && config.level <= LogLevel.WARN) {
        console.warn(`${fullPrefix} ${message}`, ...args);
      }
    },
    
    error: (message: string, ...args: any[]) => {
      if (config.enabled && config.level <= LogLevel.ERROR) {
        console.error(`${fullPrefix} ${message}`, ...args);
      }
    },
    
    group: (label: string) => {
      if (config.enabled) {
        console.group(`${fullPrefix} ${label}`);
      }
    },
    
    groupEnd: () => {
      if (config.enabled) {
        console.groupEnd();
      }
    },
    
    // Enable/disable this specific logger
    setEnabled: (enabled: boolean) => {
      config.enabled = enabled;
    },
    
    // Set log level for this specific logger
    setLevel: (level: LogLevel) => {
      config.level = level;
    }
  };
}

// Default logger for quick use
export const logger = createLogger('MatchFinder');