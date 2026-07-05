/**
 * Admin Routes - Admin Panel
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { query } = require('../config/database');

// All admin routes require admin role
router.use(authenticate, authorize('admin'));

// GET /api/v1/admin/stats - Platform overview
router.get('/stats', async (req, res, next) => {
  try {
    const [users, cases, documents, drafts, chats] = await Promise.all([
      query('SELECT COUNT(*) FROM users'),
      query('SELECT COUNT(*) FROM cases'),
      query('SELECT COUNT(*) FROM documents'),
      query('SELECT COUNT(*) FROM drafts'),
      query("SELECT COUNT(*) FROM chat_history WHERE role = 'user'"),
    ]);

    const { rows: byRole } = await query('SELECT role, COUNT(*) as count FROM users GROUP BY role');
    const { rows: recentSignups } = await query(
      `SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC LIMIT 10`
    );
    const { rows: tokenUsage } = await query(
      `SELECT feature, SUM(tokens_input) as input, SUM(tokens_output) as output 
       FROM api_usage GROUP BY feature ORDER BY output DESC`
    );

    res.json({
      success: true,
      data: {
        totals: {
          users: parseInt(users.rows[0].count),
          cases: parseInt(cases.rows[0].count),
          documents: parseInt(documents.rows[0].count),
          drafts: parseInt(drafts.rows[0].count),
          chatMessages: parseInt(chats.rows[0].count),
        },
        usersByRole: byRole,
        recentSignups,
        tokenUsage
      }
    });
  } catch (e) { next(e); }
});

// GET /api/v1/admin/users - List all users
router.get('/users', async (req, res, next) => {
  try {
    const { role, status, search, page = 1, limit = 25 } = req.query;
    let sql = `SELECT id, name, email, role, status, last_login, created_at FROM users WHERE 1=1`;
    const params = [];
    if (role) { params.push(role); sql += ` AND role = $${params.length}`; }
    if (status) { params.push(status); sql += ` AND status = $${params.length}`; }
    if (search) { params.push(`%${search}%`); sql += ` AND (name ILIKE $${params.length} OR email ILIKE $${params.length})`; }
    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), (page - 1) * parseInt(limit));
    const { rows } = await query(sql, params);
    res.json({ success: true, data: rows });
  } catch (e) { next(e); }
});

// PUT /api/v1/admin/users/:id/status
router.put('/users/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['active', 'inactive', 'suspended', 'pending'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    }
    const { rows: [u] } = await query(
      'UPDATE users SET status = $1 WHERE id = $2 RETURNING id, name, email, status',
      [status, req.params.id]
    );
    if (!u) return res.status(404).json({ success: false, message: 'User not found.' });
    
    await query(
      'INSERT INTO audit_logs (user_id, action, resource_type, resource_id) VALUES ($1, $2, $3, $4)',
      [req.user.id, `admin_set_user_status_${status}`, 'user', req.params.id]
    );
    
    res.json({ success: true, data: u });
  } catch (e) { next(e); }
});

// PUT /api/v1/admin/users/:id/role
router.put('/users/:id/role', async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['admin', 'advocate', 'student', 'client', 'researcher'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role.' });
    }
    const { rows: [u] } = await query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, name, email, role',
      [role, req.params.id]
    );
    if (!u) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, data: u });
  } catch (e) { next(e); }
});

// DELETE /api/v1/admin/users/:id
router.delete('/users/:id', async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ success: false, message: 'Cannot delete your own account.' });
    }
    await query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'User deleted.' });
  } catch (e) { next(e); }
});

// GET /api/v1/admin/audit-logs
router.get('/audit-logs', async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const { rows } = await query(
      `SELECT al.*, u.name as user_name, u.email as user_email 
       FROM audit_logs al LEFT JOIN users u ON u.id = al.user_id
       ORDER BY al.created_at DESC LIMIT $1 OFFSET $2`,
      [parseInt(limit), (page - 1) * parseInt(limit)]
    );
    res.json({ success: true, data: rows });
  } catch (e) { next(e); }
});

// GET /api/v1/admin/subscriptions
router.get('/subscriptions', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT s.*, u.name, u.email FROM subscriptions s 
       JOIN users u ON u.id = s.user_id ORDER BY s.created_at DESC LIMIT 50`
    );
    res.json({ success: true, data: rows });
  } catch (e) { next(e); }
});

// PUT /api/v1/admin/subscriptions/:userId
router.put('/subscriptions/:userId', async (req, res, next) => {
  try {
    const { plan, tokensLimit, documentsLimit, expiresAt } = req.body;
    const { rows: [s] } = await query(
      `UPDATE subscriptions SET 
        plan = COALESCE($1, plan), 
        tokens_limit = COALESCE($2, tokens_limit),
        documents_limit = COALESCE($3, documents_limit),
        expires_at = COALESCE($4, expires_at)
       WHERE user_id = $5 RETURNING *`,
      [plan, tokensLimit, documentsLimit, expiresAt, req.params.userId]
    );
    res.json({ success: true, data: s });
  } catch (e) { next(e); }
});

module.exports = router;
