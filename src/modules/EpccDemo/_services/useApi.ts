'use client';

import { useCallback, useEffect, useState } from 'react';

// Tiny client-side cache (SWR-style). Navigating back to a page shows the last
// data instantly (no loading flash) and revalidates quietly in the background.
// The server already caches in Neon, so revalidation is cheap and rarely hits Meta.
const cache = new Map<string, any>();

export function useApi<T = any>(url: string | null) {
  const [data, setData] = useState<T | undefined>(() => (url ? cache.get(url) : undefined));
  // Only show the loading state on the very first fetch (nothing cached yet).
  const [loading, setLoading] = useState<boolean>(() => (url ? !cache.has(url) : false));
  const [error, setError] = useState<string | null>(null);

  const run = useCallback((target: string, force: boolean) => {
    const fetchUrl = force ? `${target}${target.includes('?') ? '&' : '?'}refresh=1` : target;
    if (!cache.has(target) || force) setLoading(true);
    return fetch(fetchUrl, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => { cache.set(target, d); setData(d); setError(null); })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!url) return;
    if (cache.has(url)) { setData(cache.get(url)); setLoading(false); } // instant from cache
    run(url, false); // revalidate quietly
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  // Force a fresh pull from the platform (Refresh button).
  const refresh = useCallback(() => (url ? run(url, true) : Promise.resolve()), [url, run]);

  return { data, loading, error, refresh };
}

// Drop a cached entry (e.g. after publishing) so the next view refetches.
export function invalidateApi(prefix: string) {
  for (const k of [...cache.keys()]) if (k.startsWith(prefix)) cache.delete(k);
}
