/**
 * Authentication Controller
 * Register, Login, Refresh Token, Logout, Password Reset
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { query, withTransaction } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Generate access and refresh tokens
 */
function generateTokens(userId) {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );
  return { accessToken, refreshToken };
}

/**
 * Register new user
 * POST /api/v1/auth/register
 */
async function register(req, res, next) {
  try {
    const { name, email, password, role = 'client', phone, barCouncilNumber } = req.body;

    // Check existing user
    const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows[0]) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 12);

    // Create user and subscription in transaction
    const result = await withTransaction(async (client) => {
      const { rows: [user] } = await client.query(
        `INSERT INTO users (name, email, password_hash, role, phone, bar_council_number)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, email, role`,
        [name, email.toLowerCase(), passwordHash, role, phone || null, barCouncilNumber || null]
      );

      // Create free subscription
      await client.query(
        `INSERT INTO subscriptions (user_id, plan, tokens_limit) VALUES ($1, 'free', 50000)`,
        [user.id]
      );

      return user;
    });

    const { accessToken, refreshToken } = generateTokens(result.id);

    // Log audit
    await query(
      'INSERT INTO audit_logs (user_id, action, ip_address) VALUES ($1, $2, $3)',
      [result.id, 'user_registered', req.ip]
    );

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: process.env.COOKIE_SAME_SITE || 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful.',
      data: {
        user: result,
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Login
 * POST /api/v1/auth/login
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const { rows } = await query(
      `SELECT id, name, email, password_hash, role, status FROM users WHERE email = $1`,
      [email.toLowerCase()]
    );

    const user = rows[0];
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ success: false, message: 'Account is inactive or suspended.' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Update last login
    await query(
      'UPDATE users SET last_login = NOW(), login_count = login_count + 1 WHERE id = $1',
      [user.id]
    );

    const { accessToken, refreshToken } = generateTokens(user.id);

    await query(
      'INSERT INTO audit_logs (user_id, action, ip_address) VALUES ($1, $2, $3)',
      [user.id, 'user_login', req.ip]
    );

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: process.env.COOKIE_SAME_SITE || 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    const { password_hash, ...userSafe } = user;

    res.json({
      success: true,
      message: 'Login successful.',
      data: { user: userSafe, accessToken, refreshToken }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Refresh Token
 * POST /api/v1/auth/refresh
 */
async function refreshToken(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ success: false, message: 'Refresh token required.' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const { rows } = await query('SELECT id, status FROM users WHERE id = $1', [decoded.userId]);

    if (!rows[0] || rows[0].status !== 'active') {
      return res.status(401).json({ success: false, message: 'Invalid refresh token.' });
    }

    const tokens = generateTokens(decoded.userId);

    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: process.env.COOKIE_SAME_SITE || 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({ success: true, data: tokens });
  } catch (error) {
    next(error);
  }
}

/**
 * Logout
 * POST /api/v1/auth/logout
 */
async function logout(req, res) {
  res.clearCookie('accessToken');
  if (req.user) {
    await query(
      'INSERT INTO audit_logs (user_id, action, ip_address) VALUES ($1, $2, $3)',
      [req.user.id, 'user_logout', req.ip]
    ).catch(() => {});
  }
  res.json({ success: true, message: 'Logged out successfully.' });
}

/**
 * Get current user profile
 * GET /api/v1/auth/me
 */
async function getMe(req, res, next) {
  try {
    const { rows } = await query(
      `SELECT u.*, s.plan, s.tokens_used, s.tokens_limit, s.documents_used, s.documents_limit, s.expires_at
       FROM users u
       LEFT JOIN subscriptions s ON s.user_id = u.id
       WHERE u.id = $1`,
      [req.user.id]
    );

    if (!rows[0]) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const { password_hash, ...user } = rows[0];
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
}

module.exports = { register, login, refreshToken, logout, getMe };
