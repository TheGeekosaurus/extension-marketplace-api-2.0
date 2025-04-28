// server/config.js - Configuration variables and settings
require('dotenv').config();

const config = {
  // Server settings
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // API keys for marketplace services
  apiKeys: {
    bluecart: process.env.BLUECART_API_KEY,
    rainforest: process.env.RAINFOREST_API_KEY,
    bigbox: process.env.BIGBOX_API_KEY
  },
  
  // Cache settings
  cache: {
    ttl: parseInt(process.env.CACHE_TTL || '3600', 10) // Default: 1 hour
  },
  
  // API endpoints for marketplace services
  endpoints: {
    bluecart: 'https://api.bluecartapi.com/request',
    rainforest: 'https://api.rainforestapi.com/request',
    bigbox: 'https://api.bigboxapi.com/request'
  },
  
  // Marketplace fee percentages (used for calculations)
  marketplaceFees: {
    amazon: 0.15,  // 15%
    walmart: 0.12, // 12%
    target: 0.10   // 10%
  }
};

// Validate required API keys
const validateConfig = () => {
  const missingKeys = [];
  
  if (!config.apiKeys.bluecart) missingKeys.push('BLUECART_API_KEY');
  if (!config.apiKeys.rainforest) missingKeys.push('RAINFOREST_API_KEY');
  
  // BigBox API is optional
  
  if (missingKeys.length > 0) {
    console.warn(`Warning: Missing API keys: ${missingKeys.join(', ')}`);
  }
  
  return config;
};

module.exports = validateConfig();
