const rateLimit = require('express-rate-limit');

// For auth routes (stricter)
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Too many authentication attempts, please try again after an hour.'
});

module.exports = { authLimiter };