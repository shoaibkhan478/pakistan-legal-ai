/**
 * Research Routes
 */

const express = require('express');
const router = express.Router();
const { optionalAuth } = require('../middleware/auth.middleware');
const { aiLimiter } = require('../middleware/rateLimiter');
const { query } = require('../config/database');
const { legalResearch } = require('../services/ai.service');
const logger = require('../utils/logger');

router.post('/', optionalAuth, aiLimiter, async (req, res, next) => {
  try {
    const { query: researchQuery, caseId, jurisdiction = 'Pakistan' } = req.body;
    if (!researchQuery?.trim()) return res.status(400).json({ success: false, message: 'Research query required.' });

    const { content, tokens } = await legalResearch(researchQuery, jurisdiction);

    if (req.user?.id) {
      try {
        await query(
          'INSERT INTO research_history (user_id, case_id, query, results) VALUES ($1, $2, $3, $4)',
          [req.user.id, caseId || null, researchQuery, JSON.stringify({ content })]
        );
      } catch (dbErr) {
        logger.warn('research.routes: Failed to record research history in DB:', dbErr.message);
      }
    }

    res.json({ success: true, data: { content, query: researchQuery } });
  } catch (e) { next(e); }
});

router.get('/history', optionalAuth, async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return res.json({ success: true, data: [] });
    }
    try {
      const { rows } = await query(
        'SELECT id, query, created_at FROM research_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT 30',
        [req.user.id]
      );
      res.json({ success: true, data: rows });
    } catch (dbErr) {
      logger.warn('research.routes: Failed to fetch history from DB:', dbErr.message);
      res.json({ success: true, data: [] });
    }
  } catch (e) { next(e); }
});

module.exports = router;
