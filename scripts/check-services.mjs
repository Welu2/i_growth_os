import { readFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const tables = ['growth_documents', 'growth_budgets', 'growth_ai_slots'];
const rpcs = ['commit_growth_document', 'reserve_growth_budget', 'claim_growth_ai_slot', 'release_growth_ai_slot'];
export async function readConfig(root) {
  const read = async (name) => { try { return parseEnv(await readFile(resolve(root, name), 'utf8')); } catch (e) { if (e.code === 'ENOENT') return {}; throw new Error(`Could not read ${name}.`); } };
  const [frontend, worker] = await Promise.all([read('.env.local'), read('worker/.dev.vars')]);
  return { frontend, worker };
}
export async function checkServices({ frontend, worker }, fetcher = fetch) {
  const checks = [];
  const add = (name, status, detail) => checks.push({ name, status, detail });
  async function probe(url, headers) {
    try {
      const response = await fetcher(url, { headers, signal: AbortSignal.timeout(12_000), redirect: 'error', cache: 'no-store' });
      if (!response.ok) return { status: response.status, data: null };
      return { status: response.status, data: await response.json() };
    } catch { return { status: 0, data: null }; }
  }
  const http = (status) => status ? `HTTP ${status}` : 'Network, timeout, or invalid JSON response';
  let base;
  try { const url = new URL(worker.SUPABASE_URL || frontend.VITE_SUPABASE_URL); if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/') throw new Error(); base = url.origin; }
  catch { add('Supabase URL', 'blocked', 'Set a valid HTTPS project URL in worker/.dev.vars.'); }
  if (base && frontend.VITE_SUPABASE_URL?.replace(/\/$/, '') !== base) add('Project pairing', 'blocked', 'Frontend and Worker must use the same Supabase project.');
  if (base && frontend.VITE_SUPABASE_ANON_KEY) {
    const result = await probe(`${base}/auth/v1/settings`, { apikey: frontend.VITE_SUPABASE_ANON_KEY });
    add('Public Auth endpoint', result.status === 200 ? 'pass' : 'blocked', `${http(result.status)}; this does not test email delivery or sign-in.`);
  } else add('Public Auth endpoint', 'blocked', 'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.');
  const key = worker.SUPABASE_SERVICE_ROLE_KEY?.trim();
  let serverKey = false;
  if (!key) add('Server credential', 'blocked', 'SUPABASE_SERVICE_ROLE_KEY is empty in worker/.dev.vars. Save the server key there.');
  else if (key.startsWith('sb_secret_')) { serverKey = true; add('Server credential format', 'pass', 'Server-secret key present; network checks determine whether it is accepted.'); }
  else {
    try {
      const payload = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString());
      if (payload.role !== 'service_role') throw new Error();
      serverKey = true; add('Server credential format', 'pass', 'Legacy service-role JWT present; signature and access are not established by decoding.');
    } catch { add('Server credential', 'blocked', 'Expected a server-secret key or legacy service-role JWT, not a public key.'); }
  }
  if (base && serverKey) {
    const headers = { apikey: key, ...(key.startsWith('sb_secret_') ? {} : { Authorization: `Bearer ${key}` }) };
    for (const table of tables) {
      const result = await probe(`${base}/rest/v1/${table}?select=*&limit=0`, headers);
      const detail = result.status === 404 ? 'Table unavailable. Apply supabase/migrations/202610130001_growth.sql, then refresh the API schema cache if needed.' : result.status === 401 || result.status === 403 ? 'Server credential rejected or insufficient permissions.' : 'Read-only table availability; no records requested.';
      add(table, result.status === 200 ? 'pass' : 'blocked', `${http(result.status)}. ${detail}`);
    }
    const result = await probe(`${base}/rest/v1/`, { ...headers, Accept: 'application/openapi+json' });
    if (result.status === 200 && result.data?.paths) for (const rpc of rpcs) add(rpc, result.data.paths[`/rpc/${rpc}`] ? 'pass' : 'blocked', result.data.paths[`/rpc/${rpc}`] ? 'Function advertised in API metadata; execution is not tested.' : 'Required RPC absent from API metadata. Apply the migration.');
    else add('RPC discovery', 'unknown', 'API metadata unavailable. Function execution remains unverified.');
  } else add('Database tables/RPCs', 'blocked', 'Need a valid server credential and project URL before probing database setup.');
  if (worker.GEMINI_API_KEY && /^[a-zA-Z0-9.-]+$/.test(worker.GEMINI_MODEL || '')) {
    const result = await probe(`https://generativelanguage.googleapis.com/v1beta/models/${worker.GEMINI_MODEL}`, { 'x-goog-api-key': worker.GEMINI_API_KEY });
    const generates = result.data?.supportedGenerationMethods?.includes('generateContent');
    add('Gemini model metadata', result.status === 200 && generates ? 'pass' : 'blocked', `${http(result.status)}. ${generates ? 'Generation method advertised; quota and a real draft remain unverified.' : 'Configured model unavailable or lacks generation support.'}`);
  } else add('Gemini model metadata', 'blocked', 'Set GEMINI_API_KEY and GEMINI_MODEL in worker/.dev.vars.');
  if (worker.YOUTUBE_API_KEY) {
    const result = await probe('https://www.googleapis.com/youtube/v3/videos?part=id&id=dQw4w9WgXcQ', { 'x-goog-api-key': worker.YOUTUBE_API_KEY });
    add('YouTube public lookup', result.status === 200 ? 'pass' : 'blocked', `${http(result.status)}. Lookup only; authenticated app search and playback remain unverified.`);
  } else add('YouTube public lookup', 'unknown', 'Optional YOUTUBE_API_KEY is absent; pasted links remain available.');
  return checks;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const checks = await checkServices(await readConfig(resolve(fileURLToPath(new URL('..', import.meta.url)))));
    for (const check of checks) console.log(`${check.status.toUpperCase()} ${check.name}: ${check.detail}`);
    console.log('Read-only checks only: no user creation, email, AI generation, migrations, or deployment.');
    process.exitCode = checks.some((c) => c.status === 'blocked') ? 1 : 0;
  } catch { console.error('Service check could not read configuration. Check file permissions and syntax; secret values are never printed.'); process.exitCode = 1; }
}
