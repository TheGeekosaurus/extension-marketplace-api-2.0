// src/background/utils/logger.ts - Enhanced logging utility

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

/**
 * Enhanced logger with support for different log levels
 */
export class Logger {
  /**
   * Module name for this logger instance
   */
  private module: string;
  
  /**
   * Create a new logger instance
   * 
   * @param module - Module name for this logger
   */
  constructor(module: string) {
    this.module = module;
  }
  
  /**
   * Log a debug message
   * 
   * @param message - Message to log
   * @param data - Optional data to include
   */
  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }
  
  /**
   * Log an info message
   * 
   * @param message - Message to log
   * @param data - Optional data to include
   */
  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }
  
  /**
   * Log a warning message
   * 
   * @param message - Message to log
   * @param data - Optional data to include
   */
  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }
  
  /**
   * Log an error message
   * 
   * @param message - Message to log
   * @param error - Error object or message
   */
  error(message: string, error?: any): void {
    this.log(LogLevel.ERROR, message, error);
  }
  
  /**
   * Generic logging method
   * 
   * @param level - Log level
   * @param message - Message to log
   * @param data - Optional data to include
   */
  private log(level: LogLevel, message: string, data?: any): void {
    const prefix = `[E-commerce Arbitrage][${this.module}]`;
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp} ${prefix} ${message}`;
    
    switch (level) {
      case LogLevel.DEBUG:
        if (data !== undefined) {
          console.debug(logMessage, data);
        } else {
          console.debug(logMessage);
        }
        break;
      case LogLevel.INFO:
        if (data !== undefined) {
          console.log(logMessage, data);
        } else {
          console.log(logMessage);
        }
        break;
      case LogLevel.WARN:
        if (data !== undefined) {
          console.warn(logMessage, data);
        } else {
          console.warn(logMessage);
        }
        break;
      case LogLevel.ERROR:
        if (data !== undefined) {
          console.error(logMessage, data);
        } else {
          console.error(logMessage);
        }
        break;
    }
  }
  
  /**
   * Create a child logger with additional module context
   * 
   * @param childModule - Child module name
   * @returns A new logger instance
   */
  child(childModule: string): Logger {
    return new Logger(`${this.module}:${childModule}`);
  }
}

/**
 * Create a new logger instance
 * 
 * @param module - Module name
 * @returns A new logger instance
 */
export function createLogger(module: string): Logger {
  return new Logger(module);
}
