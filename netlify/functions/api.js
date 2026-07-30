// Netlify Functions entry point. netlify.toml redirects all non-static
// traffic here. Same idempotent-connect pattern as api/index.js (Vercel) —
// see that file's comment for why.
require('dotenv').config();

const serverless = require('serverless-http');
const app = require('../../app');
const connectDB = require('../../config/database');

const handler = serverless(app, { basePath: '/.netlify/functions/api' });

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  await connectDB();
  return handler(event, context);
};
