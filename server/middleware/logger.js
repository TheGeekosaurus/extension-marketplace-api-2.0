// server/middleware/logger.js - Request logging middleware

/**
 * Middleware for logging API requests
 */
const logger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} - ${req.method} ${req.url}`);
  
  // Log headers for debugging
  if (process.env.NODE_ENV === 'development') {
    console.log('Request headers:', req.headers);
  }
  
  // Log request body for debugging (but not for GET requests since they don't have a body)
  if (req.method !== 'GET' && req.body && Object.keys(req.body).length > 0) {
    console.log('Request body:', req.body);
  }
  
  // Add response logging
  const originalSend = res.send;
  res.send = function (body) {
    // Only log response in development mode to avoid cluttering logs
    if (process.env.NODE_ENV === 'development') {
      try {
        const responseData = JSON.parse(body);
        console.log(`${timestamp} - Response to ${req.method} ${req.url}:`, 
          responseData.source ? { source: responseData.source } : 'Response sent');
      } catch (e) {
        // If not JSON or too large, just log completion
        console.log(`${timestamp} - Response sent for ${req.method} ${req.url}`);
      }
    }
    return originalSend.call(this, body);
  };
  
  next();
};

module.exports = logger;
