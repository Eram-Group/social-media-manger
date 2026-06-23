'use client';
import { Suspense } from 'react';
import Accounts from '@/modules/EpccDemo/screens/Accounts';
export default function Page() {
  return (
    <Suspense fallback={null}>
      <Accounts />
    </Suspense>
  );
}
