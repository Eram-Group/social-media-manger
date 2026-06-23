'use client';
import { Suspense } from 'react';
import Promotion from '@/modules/EpccDemo/screens/Promotion';
export default function Page() {
  return (
    <Suspense fallback={null}>
      <Promotion />
    </Suspense>
  );
}
