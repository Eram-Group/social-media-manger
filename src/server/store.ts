// Persistence for connected accounts.
//   - With DATABASE_URL set  -> Neon/Postgres (works on Vercel, survives deploys).
//   - Otherwise              -> a local JSON file under .data/ (dev fallback).
//
// NOTE: tokens are stored as-is for now. A follow-up should encrypt them at rest.
import { promises as fs } from 'fs';
import path from 'path';
import { ConnectedAccount } from './connectors/types';

const keyOf = (a: Pick<ConnectedAccount, 'platform' | 'accountId'>) => `${a.platform}:${a.accountId}`;
const usingDb = () => Boolean(process.env.DATABASE_URL);

// ---- Postgres (Neon) ----
let sqlClient: ReturnType<typeof import('@neondatabase/serverless').neon> | null = null;
let schemaReady: Promise<void> | null = null;

async function sql() {
  if (!sqlClient) {
    const { neon } = await import('@neondatabase/serverless');
    sqlClient = neon(process.env.DATABASE_URL!);
  }
  if (!schemaReady) {
    schemaReady = (async () => {
      await sqlClient!`
        CREATE TABLE IF NOT EXISTS connected_accounts (
          platform       text NOT NULL,
          account_id     text NOT NULL,
          name           text,
          access_token   text NOT NULL,
          token_expires  bigint,
          followers      integer,
          connected_at   bigint,
          meta           jsonb,
          PRIMARY KEY (platform, account_id)
        )`;
    })();
  }
  await schemaReady;
  return sqlClient!;
}

const rowToAccount = (r: any): ConnectedAccount => ({
  platform: r.platform,
  accountId: r.account_id,
  name: r.name ?? undefined,
  accessToken: r.access_token,
  tokenExpiresAt: r.token_expires ?? null,
  followers: r.followers ?? undefined,
  connectedAt: r.connected_at ?? undefined,
  meta: r.meta ?? undefined,
});

// ---- File fallback ----
const DATA_DIR = path.join(process.cwd(), '.data');
const FILE = path.join(DATA_DIR, 'connected-accounts.json');

async function fileReadAll(): Promise<ConnectedAccount[]> {
  try {
    const parsed = JSON.parse(await fs.readFile(FILE, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
async function fileWriteAll(accounts: ConnectedAccount[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(accounts, null, 2), 'utf8');
}

// ---- Public API ----
export async function listAccounts(): Promise<ConnectedAccount[]> {
  if (usingDb()) {
    const db = await sql();
    const rows = await db`SELECT * FROM connected_accounts ORDER BY connected_at DESC NULLS LAST`;
    return (rows as any[]).map(rowToAccount);
  }
  return fileReadAll();
}

// Upsert by platform+accountId so reconnecting refreshes the token instead of duplicating.
export async function upsertAccounts(incoming: ConnectedAccount[]): Promise<void> {
  if (usingDb()) {
    const db = await sql();
    for (const a of incoming) {
      await db`
        INSERT INTO connected_accounts
          (platform, account_id, name, access_token, token_expires, followers, connected_at, meta)
        VALUES
          (${a.platform}, ${a.accountId}, ${a.name ?? null}, ${a.accessToken},
           ${a.tokenExpiresAt ?? null}, ${a.followers ?? null}, ${a.connectedAt ?? null},
           ${a.meta ? JSON.stringify(a.meta) : null})
        ON CONFLICT (platform, account_id) DO UPDATE SET
          name = EXCLUDED.name,
          access_token = EXCLUDED.access_token,
          token_expires = EXCLUDED.token_expires,
          followers = EXCLUDED.followers,
          connected_at = EXCLUDED.connected_at,
          meta = EXCLUDED.meta`;
    }
    return;
  }
  const existing = await fileReadAll();
  const map = new Map(existing.map((a) => [keyOf(a), a]));
  for (const a of incoming) map.set(keyOf(a), a);
  await fileWriteAll([...map.values()]);
}

export async function findAccount(platform: string, accountId: string): Promise<ConnectedAccount | undefined> {
  if (usingDb()) {
    const db = await sql();
    const rows = await db`SELECT * FROM connected_accounts WHERE platform = ${platform} AND account_id = ${accountId} LIMIT 1`;
    const r = (rows as any[])[0];
    return r ? rowToAccount(r) : undefined;
  }
  const all = await fileReadAll();
  return all.find((a) => a.platform === platform && a.accountId === accountId);
}

export async function removeAccount(platform: string, accountId: string): Promise<void> {
  if (usingDb()) {
    const db = await sql();
    await db`DELETE FROM connected_accounts WHERE platform = ${platform} AND account_id = ${accountId}`;
    return;
  }
  const all = await fileReadAll();
  await fileWriteAll(all.filter((a) => !(a.platform === platform && a.accountId === accountId)));
}

// Strip secrets before returning to the browser.
export function toPublic(a: ConnectedAccount) {
  const { accessToken, ...safe } = a;
  return safe;
}

// ---- Hidden posts ----
// Posts the user removed from the dashboard but that still exist on the platform
// (e.g. Instagram, which can't be deleted via API). Persisted so they stay hidden.
const HIDDEN_FILE = path.join(DATA_DIR, 'hidden-posts.json');

async function hiddenSchema(db: any) {
  await db`CREATE TABLE IF NOT EXISTS hidden_posts (remote_id text PRIMARY KEY)`;
}

export async function hidePosts(remoteIds: string[]): Promise<void> {
  if (!remoteIds.length) return;
  if (usingDb()) {
    const db = await sql();
    await hiddenSchema(db);
    for (const id of remoteIds) await db`INSERT INTO hidden_posts (remote_id) VALUES (${id}) ON CONFLICT DO NOTHING`;
    return;
  }
  const cur = await readHiddenFile();
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(HIDDEN_FILE, JSON.stringify([...new Set([...cur, ...remoteIds])]), 'utf8');
}

export async function listHidden(): Promise<Set<string>> {
  if (usingDb()) {
    const db = await sql();
    await hiddenSchema(db);
    const rows = await db`SELECT remote_id FROM hidden_posts`;
    return new Set((rows as any[]).map((r) => r.remote_id));
  }
  return new Set(await readHiddenFile());
}

async function readHiddenFile(): Promise<string[]> {
  try {
    const p = JSON.parse(await fs.readFile(HIDDEN_FILE, 'utf8'));
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}
