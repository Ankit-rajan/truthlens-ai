const rateLimit = require('express-rate-limit');

// For API routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});

// For auth routes (stricter)
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Too many authentication attempts, please try again after an hour.'
});

module.exports = { apiLimiter, authLimiter };