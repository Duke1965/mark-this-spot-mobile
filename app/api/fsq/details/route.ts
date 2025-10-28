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

  try {
    const r = await fetch(`${FSQ_BASE}/${fsq_id}?fields=photos`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': process.env.NEXT_PUBLIC_FOURSQUARE_API_KEY || '',
      },
      // revalidate frequently in dev; you can tweak:
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
      return NextResponse.json({ error: 'FSQ error', status: r.status, body: data, limits }, { status: r.status });
    }

    // photos shape: array of { id, created_at, prefix, suffix, width, height, ... }
    const photos = Array.isArray(data?.photos) ? data.photos : [];
    const urls = photos
      .map((p: any) => assembleFsqPhotoUrl(p?.prefix, p?.suffix, 'original'))
      .filter(Boolean);

    return NextResponse.json({ urls, raw: photos, limits }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: 'Server error', message: e?.message }, { status: 500 });
  }
}

