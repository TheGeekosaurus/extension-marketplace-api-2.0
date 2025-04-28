// server/routes/index.js - Route definitions

const root = require('./root');
const health = require('./health');
const amazon = require('./amazon');
const walmart = require('./walmart');
const target = require('./target');
const multi = require('./multi');

// Export all routes
module.exports = {
  root,
  health,
  amazon,
  walmart,
  target,
  multi
};
