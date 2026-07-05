/**
 * Notification Routes
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { query } = require('../config/database');

// GET /api/v1/notifications
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { unreadOnly } = req.query;
    let sql = 'SELECT * FROM notifications WHERE user_id = $1';
    const params = [req.user.id];
    if (unreadOnly === 'true') sql += ' AND is_read = FALSE';
    sql += ' ORDER BY created_at DESC LIMIT 50';
    const { rows } = await query(sql, params);
    res.json({ success: true, data: rows });
  } catch (e) { next(e); }
});

// GET /api/v1/notifications/unread-count
router.get('/unread-count', authenticate, async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE',
      [req.user.id]
    );
    res.json({ success: true, data: { count: parseInt(rows[0].count) } });
  } catch (e) { next(e); }
});

// PUT /api/v1/notifications/:id/read
router.put('/:id/read', authenticate, async (req, res, next) => {
  try {
    await query(
      'UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (e) { next(e); }
});

// PUT /api/v1/notifications/read-all
router.put('/read-all', authenticate, async (req, res, next) => {
  try {
    await query(
      'UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE user_id = $1 AND is_read = FALSE',
      [req.user.id]
    );
    res.json({ success: true });
  } catch (e) { next(e); }
});

// DELETE /api/v1/notifications/:id
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    await query('DELETE FROM notifications WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (e) { next(e); }
});

module.exports = router;
