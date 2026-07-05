/**
 * User Routes - Profile management
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { authenticate } = require('../middleware/auth.middleware');
const { query } = require('../config/database');

// GET /api/v1/users/profile
router.get('/profile', authenticate, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT id, name, email, role, phone, bar_council_number, specialization,
              profile_image_url, bio, language_preference, created_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    res.json({ success: true, data: rows[0] });
  } catch (e) { next(e); }
});

// PUT /api/v1/users/profile
router.put('/profile', authenticate, async (req, res, next) => {
  try {
    const { name, phone, barCouncilNumber, specialization, bio, languagePreference } = req.body;
    const { rows: [u] } = await query(
      `UPDATE users SET 
        name = COALESCE($1, name),
        phone = COALESCE($2, phone),
        bar_council_number = COALESCE($3, bar_council_number),
        specialization = COALESCE($4, specialization),
        bio = COALESCE($5, bio),
        language_preference = COALESCE($6, language_preference)
       WHERE id = $7
       RETURNING id, name, email, role, phone, bar_council_number, specialization, bio, language_preference`,
      [name, phone, barCouncilNumber, specialization, bio, languagePreference, req.user.id]
    );
    res.json({ success: true, data: u });
  } catch (e) { next(e); }
});

// PUT /api/v1/users/password
router.put('/password', authenticate, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'Valid current and new password (min 8 chars) required.' });
    }

    const { rows } = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const match = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!match) return res.status(401).json({ success: false, message: 'Current password is incorrect.' });

    const newHash = await bcrypt.hash(newPassword, parseInt(process.env.BCRYPT_ROUNDS) || 12);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, req.user.id]);

    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (e) { next(e); }
});

// GET /api/v1/users/dashboard-stats
router.get('/dashboard-stats', authenticate, async (req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM user_dashboard_stats WHERE id = $1', [req.user.id]);
    res.json({ success: true, data: rows[0] || {} });
  } catch (e) { next(e); }
});

// GET /api/v1/users/usage
router.get('/usage', authenticate, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT feature, COUNT(*) as request_count, SUM(tokens_input) as total_input_tokens, 
              SUM(tokens_output) as total_output_tokens
       FROM api_usage WHERE user_id = $1 
       GROUP BY feature ORDER BY request_count DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: rows });
  } catch (e) { next(e); }
});

module.exports = router;
