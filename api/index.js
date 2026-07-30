// Vercel entry point. Everything is routed here via vercel.json ("routes").
// Vercel's Node runtime keeps warm containers between invocations, so
// config/database.js's connectDB() (idempotent — skips reconnecting if
// already connected) is safe to call on every request.
require('dotenv').config();

const serverless = require('serverless-http');
const app = require('../app');
const connectDB = require('../config/database');

const handler = serverless(app);

module.exports = async (req, res) => {
  await connectDB();
  return handler(req, res);
};
