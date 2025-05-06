// src/matchFinder/utils/logger.ts - Dedicated logger for match finder

/**
 * Log levels for the logger
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

/**
 * Logger interface
 */
export interface Logger {
  debug(message: string, data?: any): void;
  info(message: string, data?: any): void;
  warn(message: string, data?: any): void;
  error(message: string, data?: any): void;
}

/**
 * Configuration for the logger
 */
export interface LoggerConfig {
  /**
   * Minimum log level to output
   */
  minLevel?: LogLevel;
  
  /**
   * Whether to include timestamps
   */
  includeTimestamps?: boolean;
  
  /**
   * Whether to log to console
   */
  console?: boolean;
}

/**
 * Default logger configuration
 */
const DEFAULT_CONFIG: LoggerConfig = {
  minLevel: LogLevel.DEBUG,
  includeTimestamps: true,
  console: true
};

/**
 * Create a new logger instance
 * 
 * @param module - Module name for the logger
 * @param config - Logger configuration
 * @returns Logger instance
 */
export function createLogger(module: string, config: LoggerConfig = {}): Logger {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  return {
    debug(message: string, data?: any): void {
      logMessage(LogLevel.DEBUG, module, message, data, finalConfig);
    },
    
    info(message: string, data?: any): void {
      logMessage(LogLevel.INFO, module, message, data, finalConfig);
    },
    
    warn(message: string, data?: any): void {
      logMessage(LogLevel.WARN, module, message, data, finalConfig);
    },
    
    error(message: string, data?: any): void {
      logMessage(LogLevel.ERROR, module, message, data, finalConfig);
    }
  };
}

/**
 * Log a message with the specified level
 * 
 * @param level - Log level
 * @param module - Module name
 * @param message - Message to log
 * @param data - Optional data to log
 * @param config - Logger configuration
 */
function logMessage(
  level: LogLevel,
  module: string,
  message: string,
  data?: any,
  config: LoggerConfig = DEFAULT_CONFIG
): void {
  // Check if we should log this message
  if (level < (config.minLevel ?? LogLevel.DEBUG)) {
    return;
  }
  
  // Create the log prefix
  let prefix = `[MatchFinder][${module}]`;
  
  // Add level indicator
  switch (level) {
    case LogLevel.DEBUG:
      prefix += '[DEBUG]';
      break;
    case LogLevel.INFO:
      prefix += '[INFO]';
      break;
    case LogLevel.WARN:
      prefix += '[WARN]';
      break;
    case LogLevel.ERROR:
      prefix += '[ERROR]';
      break;
  }
  
  // Add timestamp if configured
  if (config.includeTimestamps) {
    const timestamp = new Date().toISOString();
    prefix = `${timestamp} ${prefix}`;
  }
  
  // Log to console if configured
  if (config.console) {
    switch (level) {
      case LogLevel.DEBUG:
        if (data !== undefined) {
          console.debug(prefix, message, data);
        } else {
          console.debug(prefix, message);
        }
        break;
      case LogLevel.INFO:
        if (data !== undefined) {
          console.log(prefix, message, data);
        } else {
          console.log(prefix, message);
        }
        break;
      case LogLevel.WARN:
        if (data !== undefined) {
          console.warn(prefix, message, data);
        } else {
          console.warn(prefix, message);
        }
        break;
      case LogLevel.ERROR:
        if (data !== undefined) {
          console.error(prefix, message, data);
        } else {
          console.error(prefix, message);
        }
        break;
    }
  }
}
