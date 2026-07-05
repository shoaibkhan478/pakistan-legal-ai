/**
 * Draft Routes
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { aiLimiter } = require('../middleware/rateLimiter');
const { query } = require('../config/database');
const { generateDraft } = require('../services/ai.service');

router.post('/generate', authenticate, aiLimiter, async (req, res, next) => {
  try {
    const { draftType, details, language = 'english', caseId, title } = req.body;
    if (!draftType) return res.status(400).json({ success: false, message: 'Draft type required.' });
    
    const { content, tokens } = await generateDraft(draftType, details || {}, language);
    
    const { rows: [draft] } = await query(
      `INSERT INTO drafts (user_id, case_id, title, draft_type, content, language, ai_model_used, tokens_used)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [req.user.id, caseId || null, title || `${draftType} Draft`, draftType, content, language, 'claude-sonnet-4-6', tokens?.output_tokens || 0]
    );
    
    res.json({ success: true, data: draft });
  } catch (e) { next(e); }
});

router.get('/', authenticate, async (req, res, next) => {
  try {
    const { draftType, caseId, page = 1, limit = 20 } = req.query;
    let sql = 'SELECT * FROM drafts WHERE user_id = $1';
    const params = [req.user.id];
    if (draftType) { params.push(draftType); sql += ` AND draft_type = $${params.length}`; }
    if (caseId) { params.push(caseId); sql += ` AND case_id = $${params.length}`; }
    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), (page - 1) * parseInt(limit));
    const { rows } = await query(sql, params);
    res.json({ success: true, data: rows });
  } catch (e) { next(e); }
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM drafts WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Draft not found.' });
    res.json({ success: true, data: rows[0] });
  } catch (e) { next(e); }
});

router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const { content, title } = req.body;
    const { rows: [d] } = await query(
      'UPDATE drafts SET content = COALESCE($1, content), title = COALESCE($2, title), version = version + 1 WHERE id = $3 AND user_id = $4 RETURNING *',
      [content, title, req.params.id, req.user.id]
    );
    if (!d) return res.status(404).json({ success: false, message: 'Draft not found.' });
    res.json({ success: true, data: d });
  } catch (e) { next(e); }
});

router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    await query('DELETE FROM drafts WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ success: true, message: 'Draft deleted.' });
  } catch (e) { next(e); }
});

module.exports = router;
