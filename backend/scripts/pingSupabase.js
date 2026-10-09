const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { Client } = require('pg');

async function pingSupabase() {
  console.log('--- Supabase Database Keep-Alive Ping ---');
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('❌ Error: DATABASE_URL is not set in environment.');
    process.exit(1);
  }

  // Hide password in logs
  const maskedUrl = connectionString.replace(/:([^:@]+)@/, ':****@');
  console.log('Connecting to:', maskedUrl);

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });

  try {
    const startTime = Date.now();
    await client.connect();
    const res = await client.query('SELECT NOW() as current_time, current_database() as database, version() as version;');
    const latency = Date.now() - startTime;

    console.log('✅ Connection Successful!');
    console.log(`⏱️ Latency: ${latency}ms`);
    console.log(`🕒 Server Time: ${res.rows[0].current_time}`);
    console.log(`🗄️ Database: ${res.rows[0].database}`);
    console.log('🎉 Supabase project is ACTIVE and inactivity timer has been reset.');

    await client.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to connect to Supabase:');
    if (err.message.includes('not found') || err.message.includes('ENOTFOUND')) {
      console.error('\n⚠️ ATTENTION: Your Supabase project is currently PAUSED.');
      console.error('👉 Please go to https://supabase.com/dashboard/project/dfageuffqcwqaweqwwwf and click "Restore project".');
      console.error('Once unpaused (takes ~1-2 min), rerun this script.\n');
    } else {
      console.error(err.message);
    }
    try { await client.end(); } catch (_) {}
    process.exit(1);
  }
}

pingSupabase();
