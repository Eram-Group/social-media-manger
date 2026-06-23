'use client';
import { Suspense } from 'react';
import PostsAnalytics from '@/modules/EpccDemo/screens/PostsAnalytics';
export default function Page() {
  return (
    <Suspense fallback={null}>
      <PostsAnalytics />
    </Suspense>
  );
}
