// src/background/services/settingsService.ts - Settings management service

import { Settings, DEFAULT_SETTINGS } from '../../types';

/**
 * In-memory cache of settings
 */
let cachedSettings: Settings | null = null;

/**
 * Get current settings, with defaults applied if not set
 * 
 * @returns Current settings
 */
export function getSettings(): Settings {
  // Return cached settings if available
  if (cachedSettings) {
    return cachedSettings;
  }
  
  // Return default settings
  return DEFAULT_SETTINGS;
}

/**
 * Get settings from storage
 * 
 * @returns Promise resolving to current settings
 */
export async function loadSettings(): Promise<Settings> {
  return new Promise<Settings>((resolve) => {
    chrome.storage.local.get(['settings'], (result) => {
      if (chrome.runtime.lastError) {
        console.error('Error loading settings:', chrome.runtime.lastError);
        resolve(DEFAULT_SETTINGS);
        return;
      }
      
      // Merge with default settings to ensure all fields exist
      // This is important when adding new settings fields
      const loadedSettings = result.settings || {};
      const mergedSettings = {
        ...DEFAULT_SETTINGS,
        ...loadedSettings
      };
      
      // Update cache
      cachedSettings = mergedSettings;
      
      console.log('[E-commerce Arbitrage Settings] Loaded settings:', mergedSettings);
      resolve(mergedSettings);
    });
  });
}

/**
 * Save settings to storage
 * 
 * @param settings - Settings to save
 * @returns Promise resolving when settings are saved
 */
export async function saveSettings(settings: Settings): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    chrome.storage.local.set({ settings }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error saving settings:', chrome.runtime.lastError);
        reject(chrome.runtime.lastError);
        return;
      }
      
      // Update cache
      cachedSettings = settings;
      
      console.log('[E-commerce Arbitrage Settings] Saved settings:', settings);
      resolve();
    });
  });
}

/**
 * Update settings with partial data
 * 
 * @param partialSettings - Settings to update
 * @returns Promise resolving to updated settings
 */
export async function updateSettings(partialSettings: Partial<Settings>): Promise<Settings> {
  const currentSettings = await loadSettings();
  const updatedSettings = {
    ...currentSettings,
    ...partialSettings
  };
  
  await saveSettings(updatedSettings);
  return updatedSettings;
}

/**
 * Initialize default settings if not already set
 */
export async function initializeSettings(): Promise<void> {
  const settings = await loadSettings();
  
  // Already initialized
  if (Object.keys(settings).length > 0) {
    return;
  }
  
  // Initialize with defaults
  await saveSettings(DEFAULT_SETTINGS);
  console.log('[E-commerce Arbitrage Settings] Initialized default settings');
}
