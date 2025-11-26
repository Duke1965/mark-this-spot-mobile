// hooks/useFsqPhotos.ts
// Updated to use new Foursquare Places API via /api/foursquare-places
import { useEffect, useState } from 'react';

type Result = { urls: string[]; isLoading: boolean; error?: string };

export function useFsqPhotos(fsqId?: string, lat?: number, lng?: number): Result {
  const [urls, setUrls] = useState<string[]>([]);
  const [isLoading, setLoading] = useState(false);
  const [error, setErr] = useState<string | undefined>();

  useEffect(() => {
    if (!fsqId) return;
    let aborted = false;
    setLoading(true);
    setErr(undefined);

    // Use new Places API - search for the place by fsq_id
    // If we have lat/lng, use them for more accurate search
    const searchUrl = lat && lng 
      ? `/api/foursquare-places?lat=${lat}&lng=${lng}&radius=1000&limit=20`
      : null;

    if (!searchUrl) {
      // Without coordinates, we can't search - set error
      setErr('Coordinates required to fetch photos');
      setLoading(false);
      return;
    }

    fetch(searchUrl)
      .then(r => r.json())
      .then(json => {
        if (aborted) return;
        
        // Find the place with matching fsq_id
        const items = json.items || [];
        const matchingPlace = items.find((item: any) => item.fsq_id === fsqId || item.id === fsqId);
        
        if (matchingPlace?.photoUrl) {
          setUrls([matchingPlace.photoUrl]);
        } else {
          setUrls([]);
        }
      })
      .catch(e => !aborted && setErr(e?.message || 'Failed to fetch photos'))
      .finally(() => !aborted && setLoading(false));

    return () => { aborted = true; };
  }, [fsqId, lat, lng]);

  return { urls, isLoading: isLoading, error };
}

