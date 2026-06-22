import { createContext, useContext, useState, ReactNode } from 'react';
import { POSTS, IPost, TPostStatus } from './posts';
import { TPlatformId } from './platforms';

// Shared, mutable posts store so the Posts workspace, Calendar and Command Center
// all reflect create / edit / delete in real time (demo state — resets on reload).

interface IPostsCtx {
  posts: IPost[];
  addPost: (p: IPost) => void;
  updatePost: (p: IPost) => void;
  deletePost: (id: string) => void;
  loadSample: () => void;
  clearAll: () => void;
}

const Ctx = createContext<IPostsCtx | null>(null);

let seq = 1000;
export const newPostId = () => `p_${seq++}`;

// Mock analytics applied when a post is published from the composer.
export const mockPublishMetrics = (platforms: TPlatformId[]) => {
  const reach = 40000 + platforms.length * 16000;
  return {
    reach,
    likes: Math.round(reach * 0.035),
    comments: Math.round(reach * 0.002),
    shares: Math.round(reach * 0.004),
  };
};

export function PostsProvider({ children }: { children: ReactNode }) {
  const [posts, setPosts] = useState<IPost[]>(POSTS);
  const addPost = (p: IPost) => setPosts((prev) => [p, ...prev]);
  const updatePost = (p: IPost) => setPosts((prev) => prev.map((x) => (x.id === p.id ? p : x)));
  const deletePost = (id: string) => setPosts((prev) => prev.filter((x) => x.id !== id));
  const loadSample = () => setPosts(POSTS);
  const clearAll = () => setPosts([]);
  return <Ctx.Provider value={{ posts, addPost, updatePost, deletePost, loadSample, clearAll }}>{children}</Ctx.Provider>;
}

export function usePosts(): IPostsCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('usePosts must be used within PostsProvider');
  return c;
}

export type { TPostStatus };
