/**
 * Cases Routes
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { query } = require('../config/database');

router.get('/', authenticate, async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    let sql = 'SELECT * FROM cases WHERE user_id = $1';
    const params = [req.user.id];
    if (status) { params.push(status); sql += ` AND status = $${params.length}`; }
    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), (page - 1) * parseInt(limit));
    const { rows } = await query(sql, params);
    res.json({ success: true, data: rows });
  } catch (e) { next(e); }
});

router.post('/', authenticate, async (req, res, next) => {
  try {
    const { title, description, caseNumber, courtName, judgeName, opposingParty, opposingAdvocate, hearingDate, tags } = req.body;
    const { rows: [c] } = await query(
      `INSERT INTO cases (user_id, title, description, case_number, court_name, judge_name, opposing_party, opposing_advocate, hearing_date, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [req.user.id, title, description, caseNumber, courtName, judgeName, opposingParty, opposingAdvocate, hearingDate, tags]
    );
    res.status(201).json({ success: true, data: c });
  } catch (e) { next(e); }
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM cases WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Case not found.' });
    
    // Get related docs and drafts
    const { rows: docs } = await query('SELECT id, original_name, file_type, uploaded_at FROM documents WHERE case_id = $1', [req.params.id]);
    const { rows: drafts } = await query('SELECT id, title, draft_type, created_at FROM drafts WHERE case_id = $1', [req.params.id]);
    
    res.json({ success: true, data: { ...rows[0], documents: docs, drafts } });
  } catch (e) { next(e); }
});

router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const { title, description, status, courtName, hearingDate, nextAction } = req.body;
    const { rows: [c] } = await query(
      `UPDATE cases SET title = COALESCE($1, title), description = COALESCE($2, description),
       status = COALESCE($3, status), court_name = COALESCE($4, court_name),
       hearing_date = COALESCE($5, hearing_date), next_action = COALESCE($6, next_action)
       WHERE id = $7 AND user_id = $8 RETURNING *`,
      [title, description, status, courtName, hearingDate, nextAction, req.params.id, req.user.id]
    );
    if (!c) return res.status(404).json({ success: false, message: 'Case not found.' });
    res.json({ success: true, data: c });
  } catch (e) { next(e); }
});

router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const { rows } = await query('DELETE FROM cases WHERE id = $1 AND user_id = $2 RETURNING id', [req.params.id, req.user.id]);
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Case not found.' });
    res.json({ success: true, message: 'Case deleted.' });
  } catch (e) { next(e); }
});

module.exports = router;
