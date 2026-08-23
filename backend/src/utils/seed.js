const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const { pool, query } = require('../config/database');
const logger = require('./logger');

async function seedDatabase() {
  console.log('--- Seeding Pakistan Legal AI Initial Data ---');
  try {
    const password = 'Admin@12345';
    const hash = await bcrypt.hash(password, 10);

    const defaultUsers = [
      { name: 'Super Admin', email: 'admin@legalpk.ai', role: 'admin' },
      { name: 'Test Advocate', email: 'advocate@legalpk.ai', role: 'advocate' },
      { name: 'Law Student', email: 'student@legalpk.ai', role: 'student' },
      { name: 'Super Admin', email: 'admin@pakistanlegal.ai', role: 'admin' },
      { name: 'Shoaib Khan', email: 'shoaibkhan3259754@gmail.com', role: 'client' },
      { name: 'Ali', email: 'ali@gmail.com', role: 'client' },
    ];

    for (const u of defaultUsers) {
      const existing = await query('SELECT id FROM users WHERE email = $1', [u.email]);
      if (existing.rows.length === 0) {
        await query(
          'INSERT INTO users (name, email, password_hash, role, status, is_email_verified) ' +
          'VALUES ($1, $2, $3, $4, $5, true)',
          [u.name, u.email, hash, u.role, 'active']
        );
        console.log('[INSERTED] User: ' + u.email + ' (Password: ' + password + ')');
      } else {
        await query(
          'UPDATE users SET password_hash = $1, status = $2, name = $3 WHERE email = $4',
          [hash, 'active', u.name, u.email]
        );
        console.log('[UPDATED] User: ' + u.email + ' password reset to: ' + password);
      }
    }

    console.log('--- Database seeding completed successfully ---');
  } catch (err) {
    console.error('Database seeding error:', err.message);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
