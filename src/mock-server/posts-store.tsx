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
        // Published posts are the platform's source of truth; keep only local
        // drafts/scheduled (which don't exist on the platform yet) alongside them.
        setPosts((prev) => {
          const localUnpublished = prev.filter((p) => p.status !== 'published' && !p.remoteRefs?.length);
          return [...localUnpublished, ...live];
        });
      })
      .catch(() => setPosts((prev) => prev.filter((p) => p.status !== 'published')))
      .finally(() => setLoading(false));
  };

  useEffect(() => { refresh(); }, []);

  const addPost = (p: IPost) => setPosts((prev) => [p, ...prev]);
  const updatePost = (p: IPost) => setPosts((prev) => prev.map((x) => (x.id === p.id ? p : x)));
  const deletePost = (id: string) => setPosts((prev) => prev.filter((x) => x.id !== id));
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
