// src/matchFinder/utils/messaging.ts - Communication utilities

import { createLogger } from './logger';

const logger = createLogger('Messaging');

/**
 * Open a search tab in the background
 * 
 * @param url - URL to open
 * @param active - Whether to make the tab active (default: false)
 * @returns Promise that resolves with the created tab
 */
export async function openSearchTab(url: string, active: boolean = false): Promise<chrome.tabs.Tab> {
  logger.info(`Opening search tab: ${url}`);
  
  return new Promise((resolve, reject) => {
    chrome.tabs.create({ url, active }, (tab) => {
      if (chrome.runtime.lastError) {
        const error = chrome.runtime.lastError;
        logger.error(`Error opening tab: ${error.message}`);
        reject(error);
        return;
      }
      
      logger.info(`Tab created with ID: ${tab.id}`);
      resolve(tab);
    });
  });
}

/**
 * Close a tab
 * 
 * @param tabId - ID of the tab to close
 * @returns Promise that resolves when the tab is closed
 */
export async function closeTab(tabId: number): Promise<void> {
  logger.info(`Closing tab: ${tabId}`);
  
  return new Promise((resolve, reject) => {
    chrome.tabs.remove(tabId, () => {
      if (chrome.runtime.lastError) {
        const error = chrome.runtime.lastError;
        logger.error(`Error closing tab: ${error.message}`);
        reject(error);
        return;
      }
      
      logger.info(`Tab ${tabId} closed`);
      resolve();
    });
  });
}

/**
 * Send a message to a tab
 * 
 * @param tabId - ID of the tab to send the message to
 * @param message - Message to send
 * @returns Promise that resolves with the response
 */
export async function sendMessageToTab<T = any>(tabId: number, message: any): Promise<T> {
  logger.info(`Sending message to tab ${tabId}:`, message);
  
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        const error = chrome.runtime.lastError;
        logger.error(`Error sending message to tab: ${error.message}`);
        reject(error);
        return;
      }
      
      logger.info(`Received response from tab ${tabId}:`, response);
      resolve(response);
    });
  });
}

/**
 * Send a message to the background script
 * 
 * @param message - Message to send
 * @returns Promise that resolves with the response
 */
export async function sendMessageToBackground<T = any>(message: any): Promise<T> {
  logger.info('Sending message to background script:', message);
  
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        const error = chrome.runtime.lastError;
        logger.error(`Error sending message to background: ${error.message}`);
        reject(error);
        return;
      }
      
      logger.info('Received response from background:', response);
      resolve(response);
    });
  });
}

/**
 * Add a message listener for a specific action
 * 
 * @param action - Action to listen for
 * @param callback - Callback to execute when the action is received
 * @returns Function to remove the listener
 */
export function addMessageListener(action: string, callback: (message: any, sender: chrome.runtime.MessageSender) => void): () => void {
  logger.info(`Adding message listener for action: ${action}`);
  
  const listener = (message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
    if (message && message.action === action) {
      logger.info(`Received message with action ${action}:`, message);
      callback(message, sender);
      return true; // Keep the message channel open
    }
    return false;
  };
  
  chrome.runtime.onMessage.addListener(listener);
  
  // Return a function to remove the listener
  return () => {
    logger.info(`Removing message listener for action: ${action}`);
    chrome.runtime.onMessage.removeListener(listener);
  };
}
