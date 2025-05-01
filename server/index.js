// server/index.js - Main Express server entry point
const express = require('express');
const cors = require('cors');
const config = require('./config');
const logger = require('./middleware/logger');
const errorHandler = require('./middleware/errorHandler');
const routes = require('./routes');

// Initialize Express app
const app = express();

// Setup middleware
app.use(cors());
app.use(express.json());
app.use(logger);

// Mount API routes
app.use('/', routes.root);
app.use('/api/health', routes.health);
app.use('/api/test', routes.health); // Re-use health routes for /test endpoint
app.use('/api/search/amazon', routes.amazon);
app.use('/api/search/walmart', routes.walmart);
app.use('/api/search/multi', routes.multi);

// Target route removed - no longer used

// Error handling middleware (should be last)
app.use(errorHandler);

// Start the server
const server = app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
  console.log(`API endpoints available at http://localhost:${config.port}/api/*`);
  console.log(`Environment: ${config.nodeEnv}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

module.exports = app;
