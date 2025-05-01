// server/routes/index.js - Route definitions

const root = require('./root');
const health = require('./health');
const amazon = require('./amazon');
const walmart = require('./walmart');
const multi = require('./multi');

// Export all routes - target route removed
module.exports = {
  root,
  health,
  amazon,
  walmart,
  multi
};
