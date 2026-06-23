'use client';

import { useEffect, useState } from 'react';
import { TPlatformId } from '@/mock-server/platforms';

// Which platforms the user has actually connected (from /api/accounts).
// Used to gate the composer so you can't target a platform you haven't linked.
export function useConnectedPlatforms() {
  const [connected, setConnected] = useState<TPlatformId[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch('/api/accounts', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (!active) return;
        const ids = [...new Set((d.accounts ?? []).map((a: any) => a.platform as TPlatformId))] as TPlatformId[];
        setConnected(ids);
      })
      .catch(() => active && setConnected([]))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  return { connected, loading };
}
