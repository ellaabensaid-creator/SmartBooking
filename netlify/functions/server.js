const serverless = require('serverless-http');
const { app } = require('../../backend/src/app');

// Export handler for Netlify serverless functions
module.exports.handler = serverless(app, {
  requestId: 'x-nf-request-id'
});
