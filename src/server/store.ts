// Dev-only persistence for connected accounts. Stored as JSON under .data/ so the
// connect flow survives a page reload during development.
//
// PRODUCTION NOTE: the filesystem is read-only on serverless (Vercel). This is a
// stop-gap until the Neon Postgres + encrypted token vault lands (see GO-LIVE-PLAN).
// Tokens here are NOT encrypted yet — do not use this store in production.
import { promises as fs } from 'fs';
import path from 'path';
import { ConnectedAccount } from './connectors/types';

const DATA_DIR = path.join(process.cwd(), '.data');
const FILE = path.join(DATA_DIR, 'connected-accounts.json');

const keyOf = (a: Pick<ConnectedAccount, 'platform' | 'accountId'>) => `${a.platform}:${a.accountId}`;

async function readAll(): Promise<ConnectedAccount[]> {
  try {
    const raw = await fs.readFile(FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAll(accounts: ConnectedAccount[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(accounts, null, 2), 'utf8');
}

export async function listAccounts(): Promise<ConnectedAccount[]> {
  return readAll();
}

// Upsert by platform+accountId so reconnecting refreshes the token instead of duplicating.
export async function upsertAccounts(incoming: ConnectedAccount[]): Promise<void> {
  const existing = await readAll();
  const map = new Map(existing.map((a) => [keyOf(a), a]));
  for (const a of incoming) map.set(keyOf(a), a);
  await writeAll([...map.values()]);
}

export async function findAccount(platform: string, accountId: string): Promise<ConnectedAccount | undefined> {
  const all = await readAll();
  return all.find((a) => a.platform === platform && a.accountId === accountId);
}

export async function removeAccount(platform: string, accountId: string): Promise<void> {
  const all = await readAll();
  await writeAll(all.filter((a) => !(a.platform === platform && a.accountId === accountId)));
}

// Strip secrets before returning to the browser.
export function toPublic(a: ConnectedAccount) {
  const { accessToken, ...safe } = a;
  return safe;
}
