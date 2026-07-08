/**
 * Global Error Handler Middleware
 */

const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  logger.error('Unhandled error:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    user: req.user?.id
  });

  // Postgres errors
  if (err.code === '23505') {
    return res.status(409).json({
      success: false,
      message: 'Duplicate entry. Resource already exists.',
      field: err.detail
    });
  }
  if (err.code === '23503') {
    return res.status(400).json({
      success: false,
      message: 'Referenced resource does not exist.'
    });
  }

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      message: 'File size exceeds limit (50MB).'
    });
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      message: 'Unexpected file field.'
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token.' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Token expired.' });
  }

  // Gemini API rate-limit / free-tier quota errors — surface a clear,
  // actionable message instead of Google's raw technical error text.
  // (err.status is set on errors thrown from ai.service.js's generateContent.)
  if (err.status === 429 || /quota|RESOURCE_EXHAUSTED|rate limit/i.test(err.message || '')) {
    const retryMatch = (err.message || '').match(/retry in ([\d.]+)s/i);
    const retrySeconds = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : 60;
    return res.status(429).json({
      success: false,
      message: `The AI service has reached its free-tier request limit for the moment. Please wait about ${retrySeconds} seconds and try again.`,
      retryAfterSeconds: retrySeconds,
    });
  }

  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error.',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

module.exports = errorHandler;
