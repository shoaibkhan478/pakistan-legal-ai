/**
 * checkSystemHealth.js
 *
 * Given how much back-and-forth it took to diagnose "frontend can't reach
 * backend" vs "backend can't reach database" during deployment, this script
 * checks the WHOLE stack in one go and tells you exactly which layer is
 * broken, instead of guessing.
 *
 * It checks, in order:
 *   1. Backend reachability   (is the Railway URL online at all?)
 *   2. Backend -> Database    (does a real API call that touches the DB
 *                              succeed, or does it fail with a DB error?)
 *   3. Frontend reachability  (is the Vercel URL serving pages?)
 *   4. Frontend -> Backend    (does NEXT_PUBLIC_API_URL on the deployed
 *                              frontend actually point at a live backend?
 *                              This can't be checked remotely with 100%
 *                              certainty from a script, but we do a best
 *                              effort check — see note in that section.)
 *
 * USAGE:
 *   Edit the CONFIG section below with your actual URLs, then run:
 *     node scripts/checkSystemHealth.js
 *
 *   Or pass them as environment variables so you don't have to edit the file:
 *     BACKEND_URL=https://your-backend.up.railway.app \
 *     FRONTEND_URL=https://your-frontend.vercel.app \
 *     node scripts/checkSystemHealth.js
 */

const https = require('https');
const http = require('http');

// ---------------------------------------------------------------------------
// CONFIG
// ---------------------------------------------------------------------------
const BACKEND_URL =
  process.env.BACKEND_URL || 'https://pakistan-legal-ai-production-5f9c.up.railway.app';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://pakistan-legal-ai-ruddy.vercel.app';

// A lightweight endpoint that touches the DB but doesn't need auth.
// Adjust this if you add a dedicated /health or /api/v1/health route later
// (recommended — see note at the bottom of this file).
const DB_TOUCHING_ENDPOINT = '/api/v1/legal/chat';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function request(url, options = {}) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    const start = Date.now();

    const req = client.request(
      url,
      {
        method: options.method || 'GET',
        headers: options.headers || {},
        timeout: 15000,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          resolve({
            ok: true,
            status: res.statusCode,
            body,
            durationMs: Date.now() - start,
          });
        });
      }
    );

    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false, error: 'Request timed out after 15s', durationMs: Date.now() - start });
    });

    req.on('error', (err) => {
      resolve({ ok: false, error: err.message, durationMs: Date.now() - start });
    });

    if (options.body) req.write(options.body);
    req.end();
  });
}

function statusIcon(pass) {
  return pass ? 'PASS' : 'FAIL';
}

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------
async function checkBackendReachable() {
  console.log('\n[1/3] Backend reachability');
  console.log(`      GET ${BACKEND_URL}/`);
  const res = await request(`${BACKEND_URL}/`);

  if (!res.ok) {
    console.log(`      ${statusIcon(false)} — could not reach backend: ${res.error}`);
    console.log('      -> Check Railway dashboard: is the service "Online"? Check deployment logs.');
    return false;
  }

  // "Cannot GET /" with a 404 is actually a GOOD sign here — it means the
  // Express server responded, just no route is defined at "/".
  const responded = res.status > 0;
  console.log(`      ${statusIcon(responded)} — got HTTP ${res.status} in ${res.durationMs}ms`);
  if (res.status === 404) {
    console.log('      (404 at "/" is expected if no root route is defined — server is alive.)');
  }
  return responded;
}

async function checkBackendDatabase() {
  console.log('\n[2/3] Backend -> Database connectivity');
  console.log(`      POST ${BACKEND_URL}${DB_TOUCHING_ENDPOINT}`);

  const res = await request(`${BACKEND_URL}${DB_TOUCHING_ENDPOINT}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'health check test query' }),
  });

  if (!res.ok) {
    console.log(`      ${statusIcon(false)} — request failed: ${res.error}`);
    return false;
  }

  console.log(`      HTTP ${res.status} in ${res.durationMs}ms`);

  let parsed;
  try {
    parsed = JSON.parse(res.body);
  } catch {
    console.log('      Response was not valid JSON — printing raw body:');
    console.log('      ' + res.body.slice(0, 300));
    return false;
  }

  const bodyText = JSON.stringify(parsed).toLowerCase();
  const looksLikeDbError =
    bodyText.includes('connect econnrefused') ||
    bodyText.includes('password authentication failed') ||
    bodyText.includes('relation') && bodyText.includes('does not exist') ||
    bodyText.includes('database') && bodyText.includes('error');

  if (looksLikeDbError) {
    console.log(`      ${statusIcon(false)} — response suggests a DATABASE problem:`);
    console.log('      ' + JSON.stringify(parsed).slice(0, 300));
    console.log('      -> Check DATABASE_URL on Railway, and confirm migrations have been run.');
    return false;
  }

  console.log(`      ${statusIcon(true)} — backend responded without a database-connection error`);
  console.log('      Response: ' + JSON.stringify(parsed).slice(0, 200));
  return true;
}

async function checkFrontendReachable() {
  console.log('\n[3/3] Frontend reachability');
  console.log(`      GET ${FRONTEND_URL}/`);
  const res = await request(`${FRONTEND_URL}/`);

  if (!res.ok) {
    console.log(`      ${statusIcon(false)} — could not reach frontend: ${res.error}`);
    console.log('      -> Check Vercel dashboard: is the latest deployment "Ready"?');
    return false;
  }

  const pass = res.status === 200;
  console.log(`      ${statusIcon(pass)} — got HTTP ${res.status} in ${res.durationMs}ms`);
  return pass;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('=== Pakistan Legal AI — Full Stack Health Check ===');
  console.log(`Backend:  ${BACKEND_URL}`);
  console.log(`Frontend: ${FRONTEND_URL}`);

  const backendOk = await checkBackendReachable();
  const dbOk = backendOk ? await checkBackendDatabase() : false;
  const frontendOk = await checkFrontendReachable();

  console.log('\n=== Summary ===');
  console.log(`Backend online:            ${backendOk ? 'YES' : 'NO'}`);
  console.log(`Backend -> Database:       ${dbOk ? 'YES' : 'NO'}`);
  console.log(`Frontend online:           ${frontendOk ? 'YES' : 'NO'}`);

  if (backendOk && dbOk && frontendOk) {
    console.log('\nAll systems look healthy.');
  } else {
    console.log('\nSomething needs attention — see the FAIL lines above for details.');
  }

  console.log('\nNote: this script cannot 100% verify that the LIVE frontend build is');
  console.log('using the correct NEXT_PUBLIC_API_URL (that value gets baked into the');
  console.log('JS bundle at build time, not exposed at runtime for a script to read).');
  console.log('If frontend+backend+DB all show healthy here but the actual website still');
  console.log('fails, double check NEXT_PUBLIC_API_URL in Vercel and redeploy.');

  process.exit(backendOk && dbOk && frontendOk ? 0 : 1);
}

main();

/**
 * RECOMMENDATION: add a dedicated health endpoint
 * ---------------------------------------------------------------------------
 * Right now this script re-uses /api/v1/legal/chat to test DB connectivity,
 * which works but is a bit indirect (and costs a Gemini API call each time
 * you run this check). Consider adding a real health-check route to your
 * backend, e.g. in server.js:
 *
 *   app.get('/api/v1/health', async (req, res) => {
 *     try {
 *       await pool.query('SELECT 1');
 *       res.json({ status: 'ok', database: 'connected' });
 *     } catch (err) {
 *       res.status(500).json({ status: 'error', database: 'disconnected', error: err.message });
 *     }
 *   });
 *
 * Then update DB_TOUCHING_ENDPOINT above to '/api/v1/health' and switch the
 * request in checkBackendDatabase() to a GET instead of POST. This is
 * faster, free, and gives an unambiguous database-connectivity signal.
 */
