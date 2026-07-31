// const rateLimit = require('express-rate-limit');

// // For auth routes (stricter)
// const authLimiter = rateLimit({
//   windowMs: 60 * 60 * 1000,
//   max: 5,
//   message: 'Too many authentication attempts, please try again after an hour.'
// });

// module.exports = { authLimiter };


const rateLimit = require("express-rate-limit");

const authLimiter =
  process.env.NODE_ENV === "test"
    ? (req, res, next) => next()
    : rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 5,
        standardHeaders: true,
        legacyHeaders: false,
      });

module.exports = { authLimiter };