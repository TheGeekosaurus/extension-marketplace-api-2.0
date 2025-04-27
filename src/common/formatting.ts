// src/common/formatting.ts - Text and number formatting helpers

import { ProfitInfo } from '../types';

/**
 * Format a price for display
 * 
 * @param price - Price to format
 * @param currency - Currency symbol
 * @returns Formatted price string or 'N/A' if price is null
 */
export function formatPrice(price: number | null, currency: string = '$'): string {
  if (price === null || price === undefined) return 'N/A';
  return `${currency}${price.toFixed(2)}`;
}

/**
 * Format a profit amount and percentage for display
 * 
 * @param profit - Profit information
 * @returns Formatted profit string or 'N/A' if profit is undefined
 */
export function formatProfit(profit: ProfitInfo | undefined): string {
  if (!profit) return 'N/A';
  return `${formatPrice(profit.amount)} (${profit.percentage.toFixed(2)}%)`;
}

/**
 * Format a date for display
 * 
 * @param timestamp - Timestamp in milliseconds
 * @returns Formatted date string
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

/**
 * Truncate a string to a maximum length
 * 
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @returns Truncated string with ellipsis if needed
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Format a number with commas for thousands
 * 
 * @param num - Number to format
 * @returns Formatted number string
 */
export function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return 'N/A';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Format a marketplace name for display
 * 
 * @param marketplace - Marketplace name
 * @returns Formatted marketplace name
 */
export function formatMarketplace(marketplace: string): string {
  return marketplace.charAt(0).toUpperCase() + marketplace.slice(1);
}

/**
 * Calculate time difference from now in a human-readable format
 * 
 * @param timestamp - Timestamp in milliseconds
 * @returns Human-readable time difference
 */
export function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  let interval = Math.floor(seconds / 31536000);
  if (interval >= 1) {
    return interval === 1 ? '1 year ago' : `${interval} years ago`;
  }
  
  interval = Math.floor(seconds / 2592000);
  if (interval >= 1) {
    return interval === 1 ? '1 month ago' : `${interval} months ago`;
  }
  
  interval = Math.floor(seconds / 86400);
  if (interval >= 1) {
    return interval === 1 ? '1 day ago' : `${interval} days ago`;
  }
  
  interval = Math.floor(seconds / 3600);
  if (interval >= 1) {
    return interval === 1 ? '1 hour ago' : `${interval} hours ago`;
  }
  
  interval = Math.floor(seconds / 60);
  if (interval >= 1) {
    return interval === 1 ? '1 minute ago' : `${interval} minutes ago`;
  }
  
  return seconds < 5 ? 'just now' : `${Math.floor(seconds)} seconds ago`;
}
