// Persistence for TRACKED competitors and their dated snapshots.
//
// Meta blocks reading competitor Pages you don't manage (App Review only), so the
// numbers are entered by hand — but instead of a single static value we keep a
// SNAPSHOT every time they're updated. That turns "Riyadh Chamber: 58K" into a
// trend: who is growing fastest, who's stalling, and how the Chamber's gap is
// changing over time.
//
//   - With DATABASE_URL set -> Neon/Postgres (survives deploys, cross-device).
//   - Otherwise             -> a local JSON file under .data/ (dev fallback).
import { promises as fs } from 'fs';
import path from 'path';

export interface TrackedCompetitor {
  id: string;
  name: string;
  category: string;
  pageUrl?: string | null;
  createdAt: number;
}

export interface CompetitorSnapshot {
  competitorId: string;
  followers: number;
  avgEng?: number | null; // avg (likes + comments) per post
  postsPerWeek?: number | null;
  takenAt: number; // unix seconds
}

// A real Page (id/username) the user picked from Pages Search to read LIVE via
// PPCA — distinct from hand-entered TrackedCompetitor rows.
export interface WatchedPage {
  ref: string; // Page id or username
  label?: string | null;
  addedAt: number;
}

const usingDb = () => Boolean(process.env.DATABASE_URL);

// ---- Postgres (Neon) ----
let sqlClient: any = null;
let schemaReady: Promise<void> | null = null;
async function sql() {
  if (!sqlClient) {
    const { neon } = await import('@neondatabase/serverless');
    sqlClient = neon(process.env.DATABASE_URL!);
  }
  if (!schemaReady) {
    schemaReady = (async () => {
      await sqlClient`
        CREATE TABLE IF NOT EXISTS tracked_competitors (
          id          text PRIMARY KEY,
          name        text NOT NULL,
          category    text,
          page_url    text,
          created_at  bigint
        )`;
      await sqlClient`
        CREATE TABLE IF NOT EXISTS competitor_snapshots (
          competitor_id  text NOT NULL,
          followers      integer,
          avg_eng        numeric,
          posts_per_week numeric,
          taken_at       bigint
        )`;
      await sqlClient`
        CREATE TABLE IF NOT EXISTS watched_pages (
          ref       text PRIMARY KEY,
          label     text,
          added_at  bigint
        )`;
    })();
  }
  await schemaReady;
  return sqlClient;
}

// ---- File fallback ----
const DATA_DIR = path.join(process.cwd(), '.data');
const FILE = path.join(DATA_DIR, 'competitors.json');

interface FileShape { competitors: TrackedCompetitor[]; snapshots: CompetitorSnapshot[]; watched: WatchedPage[] }

async function fileRead(): Promise<FileShape> {
  try {
    const p = JSON.parse(await fs.readFile(FILE, 'utf8'));
    return { competitors: p.competitors ?? [], snapshots: p.snapshots ?? [], watched: p.watched ?? [] };
  } catch {
    return { competitors: [], snapshots: [], watched: [] };
  }
}
async function fileWrite(data: FileShape): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(data, null, 2), 'utf8');
}

// ---- Public API ----
export async function listCompetitors(): Promise<TrackedCompetitor[]> {
  if (usingDb()) {
    const db = await sql();
    const rows = await db`SELECT * FROM tracked_competitors ORDER BY created_at ASC NULLS LAST`;
    return (rows as any[]).map((r) => ({
      id: r.id, name: r.name, category: r.category ?? '', pageUrl: r.page_url ?? null, createdAt: Number(r.created_at) || 0,
    }));
  }
  return (await fileRead()).competitors;
}

export async function listSnapshots(): Promise<CompetitorSnapshot[]> {
  if (usingDb()) {
    const db = await sql();
    const rows = await db`SELECT * FROM competitor_snapshots ORDER BY taken_at ASC`;
    return (rows as any[]).map((r) => ({
      competitorId: r.competitor_id,
      followers: Number(r.followers) || 0,
      avgEng: r.avg_eng != null ? Number(r.avg_eng) : null,
      postsPerWeek: r.posts_per_week != null ? Number(r.posts_per_week) : null,
      takenAt: Number(r.taken_at) || 0,
    }));
  }
  return (await fileRead()).snapshots;
}

export async function upsertCompetitor(c: TrackedCompetitor): Promise<void> {
  if (usingDb()) {
    const db = await sql();
    await db`
      INSERT INTO tracked_competitors (id, name, category, page_url, created_at)
      VALUES (${c.id}, ${c.name}, ${c.category}, ${c.pageUrl ?? null}, ${c.createdAt})
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category, page_url = EXCLUDED.page_url`;
    return;
  }
  const data = await fileRead();
  const i = data.competitors.findIndex((x) => x.id === c.id);
  if (i >= 0) data.competitors[i] = { ...data.competitors[i], ...c };
  else data.competitors.push(c);
  await fileWrite(data);
}

export async function addSnapshot(s: CompetitorSnapshot): Promise<void> {
  if (usingDb()) {
    const db = await sql();
    await db`
      INSERT INTO competitor_snapshots (competitor_id, followers, avg_eng, posts_per_week, taken_at)
      VALUES (${s.competitorId}, ${s.followers}, ${s.avgEng ?? null}, ${s.postsPerWeek ?? null}, ${s.takenAt})`;
    return;
  }
  const data = await fileRead();
  data.snapshots.push(s);
  await fileWrite(data);
}

export async function removeCompetitor(id: string): Promise<void> {
  if (usingDb()) {
    const db = await sql();
    await db`DELETE FROM competitor_snapshots WHERE competitor_id = ${id}`;
    await db`DELETE FROM tracked_competitors WHERE id = ${id}`;
    return;
  }
  const data = await fileRead();
  data.competitors = data.competitors.filter((c) => c.id !== id);
  data.snapshots = data.snapshots.filter((s) => s.competitorId !== id);
  await fileWrite(data);
}

// ---- Watched pages (picked from Pages Search, read live via PPCA) ----
export async function listWatchedPages(): Promise<WatchedPage[]> {
  if (usingDb()) {
    const db = await sql();
    const rows = await db`SELECT * FROM watched_pages ORDER BY added_at ASC NULLS LAST`;
    return (rows as any[]).map((r) => ({ ref: r.ref, label: r.label ?? null, addedAt: Number(r.added_at) || 0 }));
  }
  return (await fileRead()).watched;
}

export async function addWatchedPage(p: WatchedPage): Promise<void> {
  if (usingDb()) {
    const db = await sql();
    await db`
      INSERT INTO watched_pages (ref, label, added_at) VALUES (${p.ref}, ${p.label ?? null}, ${p.addedAt})
      ON CONFLICT (ref) DO UPDATE SET label = EXCLUDED.label`;
    return;
  }
  const data = await fileRead();
  if (!data.watched.some((w) => w.ref === p.ref)) data.watched.push(p);
  await fileWrite(data);
}

export async function removeWatchedPage(ref: string): Promise<void> {
  if (usingDb()) {
    const db = await sql();
    await db`DELETE FROM watched_pages WHERE ref = ${ref}`;
    return;
  }
  const data = await fileRead();
  data.watched = data.watched.filter((w) => w.ref !== ref);
  await fileWrite(data);
}
