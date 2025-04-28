// server/middleware/errorHandler.js - Centralized error handling middleware

/**
 * Standard API error structure
 */
class ApiError extends Error {
  constructor(message, statusCode, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'ApiError';
  }
}

/**
 * Middleware for handling errors
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error processing request:', err);
  
  // Determine status code (default to 500 if not specified)
  const statusCode = err.statusCode || 500;
  
  // Prepare error response
  const errorResponse = {
    error: err.message || 'Internal Server Error',
    status: statusCode
  };
  
  // Include error details in development mode or if explicitly provided
  if (process.env.NODE_ENV === 'development' || err.details) {
    errorResponse.details = err.details || err.stack;
  }
  
  // Send error response
  res.status(statusCode).json(errorResponse);
};

/**
 * Helper function to create a not found error
 */
const notFound = (req, res, next) => {
  const error = new ApiError(`Endpoint not found: ${req.originalUrl}`, 404);
  next(error);
};

module.exports = errorHandler;
module.exports.ApiError = ApiError;
module.exports.notFound = notFound;
