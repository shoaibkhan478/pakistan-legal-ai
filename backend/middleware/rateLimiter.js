/**
 * Rate Limiter Middleware
 */

const rateLimit = require('express-rate-limit');

const rateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 min
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again later.'
  },
  skip: (req) => req.path === '/health'
});

// Stricter limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: 'Too many login attempts. Try again in 15 minutes.'
  }
});

// AI endpoints limiter — keyed per logged-in user (not per IP), so multiple
// people sharing a network/office WiFi don't end up blocking each other.
// authenticate middleware always runs before aiLimiter on every route that
// uses it, so req.user is guaranteed to be set here.
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 10,
  keyGenerator: (req) => req.user?.id || req.ip,
  message: {
    success: false,
    message: 'AI request limit reached. Please wait before making more requests.'
  }
});

module.exports = rateLimiter;
module.exports.authLimiter = authLimiter;
module.exports.aiLimiter = aiLimiter;
