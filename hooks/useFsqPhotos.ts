// hooks/useFsqPhotos.ts
import { useEffect, useState } from 'react';

type Result = { urls: string[]; isLoading: boolean; error?: string };

export function useFsqPhotos(fsqId?: string): Result {
  const [urls, setUrls] = useState<string[]>([]);
  const [isLoading, setLoading] = useState(false);
  const [error, setErr] = useState<string | undefined>();

  useEffect(() => {
    if (!fsqId) return;
    let aborted = false;
    setLoading(true);
    setErr(undefined);

    // Choose details-with-photos OR direct photos route:
    fetch(`/api/fsq/details?fsq_id=${encodeURIComponent(fsqId)}`)
      .then(r => r.json())
      .then(json => {
        if (aborted) return;
        setUrls(Array.isArray(json?.urls) ? json.urls : []);
      })
      .catch(e => !aborted && setErr(e?.message || 'Failed to fetch photos'))
      .finally(() => !aborted && setLoading(false));

    return () => { aborted = true; };
  }, [fsqId]);

  return { urls, isLoading: isLoading, error };
}

