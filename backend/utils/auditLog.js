/**
 * Audit Log Helper
 *
 * Writes a structured "who did what, when" entry using the existing winston
 * logger (so it lands in logs/combined.log on Railway — no new database
 * table or migration required). Useful for legal-data apps like this one,
 * where being able to answer "who viewed this FIR/document, and when" matters.
 *
 * Usage:
 *   const { audit } = require('../utils/auditLog');
 *   audit(req, 'document.view', { documentId: doc.id });
 */
function audit(req, action, details = {}) {
  logger().info(`AUDIT ${JSON.stringify({
    action,
    userId: req.user?.id || null,
    ip: req.ip,
    ...details,
    at: new Date().toISOString()
  })}`);
}

// lazy require to avoid circular-require issues if logger ever imports this file
function logger() {
  return require('./logger');
}

module.exports = { audit };
