const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const { pool, query } = require('../config/database');
const logger = require('./logger');

async function seedDatabase() {
  console.log('--- Seeding Pakistan Legal AI Initial Data ---');
  try {
    // Check if admin already exists
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@pakistanlegal.ai';
    const existing = await query('SELECT id FROM users WHERE email = $1', [adminEmail]);

    if (existing.rows.length === 0) {
      const defaultPassword = process.env.ADMIN_PASSWORD || 'Pakistan@Legal786';
      const hash = await bcrypt.hash(defaultPassword, 10);
      await query(
        'INSERT INTO users (name, email, password_hash, role, status, is_email_verified) ' +
        'VALUES ($1, $2, $3, \'admin\', \'active\', true)',
        ['Super Admin', adminEmail, hash]
      );
      console.log('[SUCCESS] Seeded default admin user (' + adminEmail + ')');
    } else {
      console.log('[SKIP] Admin user (' + adminEmail + ') already exists');
    }

    console.log('--- Database seeding completed ---');
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
