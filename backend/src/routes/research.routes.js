/**
 * Research Routes
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { aiLimiter } = require('../middleware/rateLimiter');
const { query } = require('../config/database');
const { legalResearch } = require('../services/ai.service');

router.post('/', authenticate, aiLimiter, async (req, res, next) => {
  try {
    const { query: researchQuery, caseId, jurisdiction = 'Pakistan' } = req.body;
    if (!researchQuery?.trim()) return res.status(400).json({ success: false, message: 'Research query required.' });

    const { content, tokens } = await legalResearch(researchQuery, jurisdiction);

    await query(
      'INSERT INTO research_history (user_id, case_id, query, results) VALUES ($1, $2, $3, $4)',
      [req.user.id, caseId || null, researchQuery, JSON.stringify({ content })]
    );

    res.json({ success: true, data: { content, query: researchQuery } });
  } catch (e) { next(e); }
});

router.get('/history', authenticate, async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT id, query, created_at FROM research_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT 30',
      [req.user.id]
    );
    res.json({ success: true, data: rows });
  } catch (e) { next(e); }
});

module.exports = router;
