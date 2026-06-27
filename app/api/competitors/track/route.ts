import { NextRequest, NextResponse } from 'next/server';
import {
  listCompetitors, listSnapshots, upsertCompetitor, addSnapshot, removeCompetitor,
  TrackedCompetitor, CompetitorSnapshot,
} from '@/server/competitors-store';

// /api/competitors/track — user-tracked competitors with dated snapshots, so the
// hand-entered numbers become a TREND (growth %, engagement rate) instead of a
// static value. GET reads the assembled view; POST adds/updates (records a
// snapshot); DELETE removes a competitor and its history.

const now = () => Math.floor(Date.now() / 1000);

interface CompetitorView extends TrackedCompetitor {
  followers: number | null;
  avgEng: number | null;
  postsPerWeek: number | null;
  engagementRate: number | null; // avg (likes+comments)/post ÷ followers · 100
  snapshotCount: number;
  lastUpdated: number | null;
  history: { takenAt: number; followers: number }[];
  growth: { pct: number; per30: number; days: number; prevFollowers: number } | null;
}

function assemble(competitors: TrackedCompetitor[], snapshots: CompetitorSnapshot[]): CompetitorView[] {
  const byId = new Map<string, CompetitorSnapshot[]>();
  for (const s of snapshots) {
    const list = byId.get(s.competitorId) ?? [];
    list.push(s);
    byId.set(s.competitorId, list);
  }
  return competitors.map((c) => {
    const snaps = (byId.get(c.id) ?? []).sort((a, b) => a.takenAt - b.takenAt);
    const latest = snaps[snaps.length - 1];
    const prev = snaps[snaps.length - 2];
    const followers = latest?.followers ?? null;
    const avgEng = latest?.avgEng ?? null;
    const postsPerWeek = latest?.postsPerWeek ?? null;
    const engagementRate = followers && avgEng ? (avgEng / followers) * 100 : null;

    let growth: CompetitorView['growth'] = null;
    if (latest && prev && prev.followers > 0) {
      const pct = ((latest.followers - prev.followers) / prev.followers) * 100;
      const days = Math.max(1, (latest.takenAt - prev.takenAt) / 86400);
      growth = { pct, per30: pct * (30 / days), days: Math.round(days), prevFollowers: prev.followers };
    }

    return {
      ...c,
      followers,
      avgEng,
      postsPerWeek,
      engagementRate,
      snapshotCount: snaps.length,
      lastUpdated: latest?.takenAt ?? null,
      history: snaps.map((s) => ({ takenAt: s.takenAt, followers: s.followers })),
      growth,
    };
  });
}

export async function GET() {
  const [competitors, snapshots] = await Promise.all([listCompetitors(), listSnapshots()]);
  return NextResponse.json({ ok: true, competitors: assemble(competitors, snapshots) });
}

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'competitor';
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? '').trim();
  const category = String(body.category ?? '').trim();
  const followers = Number(body.followers);
  if (!name || !Number.isFinite(followers)) {
    return NextResponse.json({ ok: false, error: 'name and followers are required' }, { status: 400 });
  }
  const avgEng = body.avgEng != null && body.avgEng !== '' ? Number(body.avgEng) : null;
  const postsPerWeek = body.postsPerWeek != null && body.postsPerWeek !== '' ? Number(body.postsPerWeek) : null;
  const pageUrl = body.pageUrl ? String(body.pageUrl).trim() : null;

  const existing = await listCompetitors();
  let id = body.id ? String(body.id) : '';
  if (!id || !existing.some((c) => c.id === id)) {
    id = `${slug(name)}-${Math.floor(now()).toString(36)}`;
  }

  const competitor: TrackedCompetitor = {
    id, name, category, pageUrl,
    createdAt: existing.find((c) => c.id === id)?.createdAt ?? now(),
  };
  await upsertCompetitor(competitor);

  // Only record a snapshot if something actually changed (avoids duplicate points
  // when the user re-saves without new numbers).
  const snaps = (await listSnapshots()).filter((s) => s.competitorId === id).sort((a, b) => a.takenAt - b.takenAt);
  const last = snaps[snaps.length - 1];
  const changed = !last || last.followers !== followers || (last.avgEng ?? null) !== avgEng || (last.postsPerWeek ?? null) !== postsPerWeek;
  if (changed) {
    await addSnapshot({ competitorId: id, followers, avgEng, postsPerWeek, takenAt: now() });
  }

  return NextResponse.json({ ok: true, id });
}

export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ ok: false, error: 'id required' }, { status: 400 });
  await removeCompetitor(id);
  return NextResponse.json({ ok: true });
}
