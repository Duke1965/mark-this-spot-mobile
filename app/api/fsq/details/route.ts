// app/api/fsq/details/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { assembleFsqPhotoUrl } from '@/lib/fsq';

const FSQ_BASE = 'https://api.foursquare.com/v3/places';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fsq_id = searchParams.get('fsq_id');
  if (!fsq_id) {
    return NextResponse.json({ error: 'Missing fsq_id' }, { status: 400 });
  }

  // Try FOURSQUARE_API_KEY first (server-side only), fallback to NEXT_PUBLIC version
  let apiKey = process.env.FOURSQUARE_API_KEY;
  if (!apiKey) {
    console.warn('⚠️ FOURSQUARE_API_KEY not found, trying NEXT_PUBLIC_FOURSQUARE_API_KEY');
    apiKey = process.env.NEXT_PUBLIC_FOURSQUARE_API_KEY;
    if (apiKey) {
      console.warn('⚠️ Using NEXT_PUBLIC_FOURSQUARE_API_KEY - consider using FOURSQUARE_API_KEY for better security');
    }
  }
  
  if (!apiKey) {
    console.error('❌ Missing FOURSQUARE_API_KEY env var');
    console.error('❌ Available env vars with FOURSQUARE:', Object.keys(process.env).filter(k => k.includes('FOURSQUARE')));
    return NextResponse.json({ error: 'Missing FOURSQUARE_API_KEY env var' }, { status: 500 });
  }

  try {
    // Request full place details including description
    const r = await fetch(`${FSQ_BASE}/${fsq_id}?fields=photos,website,description,categories,location,rating,name,geocodes`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': apiKey,
      },
      next: { revalidate: 0 },
    });

    const text = await r.text();
    let data: any;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    const limits = {
      limit: r.headers.get('x-ratelimit-limit'),
      remaining: r.headers.get('x-ratelimit-remaining'),
      reset: r.headers.get('x-ratelimit-reset'),
    };

    if (!r.ok) {
      console.error(`❌ FSQ details error: ${r.status}`, data);
      return NextResponse.json({ error: 'FSQ error', status: r.status, body: data, limits }, { status: r.status });
    }

    // Extract photos and assemble URLs
    const photos = Array.isArray(data?.photos) ? data.photos : [];
    const urls = photos
      .map((p: any) => assembleFsqPhotoUrl(p?.prefix, p?.suffix, 'original'))
      .filter(Boolean);

    // Return full place details including description, not just photos
    return NextResponse.json({ 
      name: data.name,
      description: data.description,
      rating: data.rating,
      category: data.categories?.[0]?.name,
      address: data.location?.address || data.location?.formatted_address,
      location: {
        lat: data.geocodes?.main?.latitude,
        lng: data.geocodes?.main?.longitude
      },
      photoUrls: urls,
      photos: photos,
      limits 
    }, { status: 200 });
  } catch (e: any) {
    console.error('❌ Server error in fsq/details:', e?.message);
    return NextResponse.json({ error: 'Server error', message: e?.message }, { status: 500 });
  }
}
