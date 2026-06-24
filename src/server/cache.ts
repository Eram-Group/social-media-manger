// Server-side cache so we don't hit the Meta API on every page load (their free
// tier is rate-limited). Cached results live in Neon (api_cache table) with a
// per-key TTL; pass force=true (e.g. a Refresh button / ?refresh=1) to bypass.
// Falls back to the local .data file when no DATABASE_URL.
import { promises as fs } from 'fs';
import path from 'path';

const usingDb = () => Boolean(process.env.DATABASE_URL);
const DATA_DIR = path.join(process.cwd(), '.data');
const FILE = path.join(DATA_DIR, 'api-cache.json');

let sqlClient: any = null;
let schemaReady: Promise<void> | null = null;
async function sql() {
  if (!sqlClient) {
    const { neon } = await import('@neondatabase/serverless');
    sqlClient = neon(process.env.DATABASE_URL!);
  }
  if (!schemaReady) {
    schemaReady = (async () => {
      await sqlClient`CREATE TABLE IF NOT EXISTS api_cache (key text PRIMARY KEY, data jsonb, updated_at bigint)`;
    })();
  }
  await schemaReady;
  return sqlClient;
}

async function readEntry(key: string): Promise<{ data: any; updatedAt: number } | null> {
  if (usingDb()) {
    const db = await sql();
    const rows = await db`SELECT data, updated_at FROM api_cache WHERE key = ${key} LIMIT 1`;
    const r = (rows as any[])[0];
    return r ? { data: r.data, updatedAt: Number(r.updated_at) } : null;
  }
  try {
    const all = JSON.parse(await fs.readFile(FILE, 'utf8'));
    return all[key] ?? null;
  } catch {
    return null;
  }
}

async function writeEntry(key: string, data: any, updatedAt: number): Promise<void> {
  if (usingDb()) {
    const db = await sql();
    await db`INSERT INTO api_cache (key, data, updated_at) VALUES (${key}, ${JSON.stringify(data)}, ${updatedAt})
             ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at`;
    return;
  }
  let all: Record<string, any> = {};
  try { all = JSON.parse(await fs.readFile(FILE, 'utf8')); } catch { /* */ }
  all[key] = { data, updatedAt };
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(all), 'utf8');
}

export interface Cached<T> { data: T; cachedAt: number; stale: boolean; fromCache: boolean }

// Return cached data if fresh; otherwise run fetcher, store, and return.
// On a fetcher error, fall back to stale cache if we have any.
export async function getCached<T>(key: string, ttlSeconds: number, fetcher: () => Promise<T>, force = false): Promise<Cached<T>> {
  const now = Math.floor(Date.now() / 1000);
  const entry = await readEntry(key);
  const fresh = entry && now - entry.updatedAt < ttlSeconds;

  if (entry && fresh && !force) {
    return { data: entry.data as T, cachedAt: entry.updatedAt, stale: false, fromCache: true };
  }
  try {
    const data = await fetcher();
    await writeEntry(key, data, now);
    return { data, cachedAt: now, stale: false, fromCache: false };
  } catch (e) {
    if (entry) return { data: entry.data as T, cachedAt: entry.updatedAt, stale: true, fromCache: true };
    throw e;
  }
}

export async function invalidate(prefix: string): Promise<void> {
  if (usingDb()) {
    const db = await sql();
    await db`DELETE FROM api_cache WHERE key LIKE ${prefix + '%'}`;
    return;
  }
  try {
    const all = JSON.parse(await fs.readFile(FILE, 'utf8'));
    for (const k of Object.keys(all)) if (k.startsWith(prefix)) delete all[k];
    await fs.writeFile(FILE, JSON.stringify(all), 'utf8');
  } catch { /* */ }
}
