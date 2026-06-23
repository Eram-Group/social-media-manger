'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { IPost, TPostStatus } from './posts';

// Shared posts store. Posts are the REAL posts published on the connected
// accounts (loaded from /api/posts/list) plus any created live in this session.

interface IPostsCtx {
  posts: IPost[];
  loading: boolean;
  addPost: (p: IPost) => void;
  updatePost: (p: IPost) => void;
  deletePost: (id: string) => Promise<{ ok: boolean; hiddenOnly: boolean; errors: string[] }>;
  refresh: () => void;
  clearAll: () => void;
}

const Ctx = createContext<IPostsCtx | null>(null);

let seq = 1000;
export const newPostId = () => `p_${seq++}`;

export function PostsProvider({ children }: { children: ReactNode }) {
  const [posts, setPosts] = useState<IPost[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = () => {
    setLoading(true);
    fetch('/api/posts/list', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        const live: IPost[] = d.posts ?? [];
        setPosts((prev) => {
          // Keep local drafts/scheduled and any post created in-app that has
          // remoteRefs (a real published post — possibly multi-platform, which we
          // want to show as ONE row rather than split per platform).
          const keepLocal = prev.filter((p) => p.status !== 'published' || (p.remoteRefs?.length ?? 0) > 0);
          // remoteIds already represented by a kept local post — so we don't show
          // the same post twice (once as the in-app row, once from the live feed).
          const localRemoteIds = new Set(keepLocal.flatMap((p) => p.remoteRefs?.map((r) => r.remoteId) ?? []));
          const liveOnly = live.filter((p) => !(p.remoteRefs ?? []).some((r) => localRemoteIds.has(r.remoteId)));
          return [...keepLocal, ...liveOnly];
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { refresh(); }, []);

  const addPost = (p: IPost) => setPosts((prev) => [p, ...prev]);
  const updatePost = (p: IPost) => setPosts((prev) => prev.map((x) => (x.id === p.id ? p : x)));

  // Delete from the platform, then drop locally. Returns per-ref errors (e.g.
  // Instagram, which doesn't support deletion) so the UI can inform the user.
  const deletePost = async (id: string): Promise<{ ok: boolean; hiddenOnly: boolean; errors: string[] }> => {
    const target = posts.find((x) => x.id === id);
    const refs = target?.remoteRefs ?? [];
    let ok = true; let hiddenOnly = false; const errors: string[] = [];
    if (refs.length) {
      try {
        const res = await fetch('/api/posts/delete', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refs }),
        });
        const j = await res.json();
        ok = j.ok;
        hiddenOnly = Boolean(j.hiddenOnly);
      } catch (e) {
        ok = false; errors.push((e as Error).message);
      }
    }
    if (ok) setPosts((prev) => prev.filter((x) => x.id !== id));
    return { ok, hiddenOnly, errors };
  };
  const clearAll = () => setPosts([]);

  return (
    <Ctx.Provider value={{ posts, loading, addPost, updatePost, deletePost, refresh, clearAll }}>
      {children}
    </Ctx.Provider>
  );
}

export function usePosts(): IPostsCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('usePosts must be used within PostsProvider');
  return c;
}

export type { TPostStatus };
