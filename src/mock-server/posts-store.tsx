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
  deletePost: (id: string) => void;
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
  const deletePost = (id: string) => {
    // Delete from the platform too (so it doesn't reappear on the next refresh).
    setPosts((prev) => {
      const target = prev.find((x) => x.id === id);
      const refs = target?.remoteRefs ?? [];
      if (refs.length) {
        fetch('/api/posts/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refs }),
        }).catch(() => {});
      }
      return prev.filter((x) => x.id !== id);
    });
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
