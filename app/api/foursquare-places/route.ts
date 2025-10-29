import { type NextRequest, NextResponse } from "next/server"

const FSQ_BASE = 'https://api.foursquare.com/v3/places';

/**
 * Foursquare Places API Route
 * Server-side proxy to avoid exposing API key
 * Updated: Enhanced error logging and fallback support
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get("lat")
  const lng = searchParams.get("lng")
  const radius = searchParams.get("radius") || "5000"
  const limit = searchParams.get("limit") || "10"

  if (!lat || !lng) {
    return NextResponse.json({ error: "Missing lat/lng parameters" }, { status: 400 })
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
    console.log('🔍 Foursquare Places API GET request:', { lat, lng, radius, limit })
    console.log('🔑 API Key present:', !!apiKey, 'Length:', apiKey.length);

    const url = `${FSQ_BASE}/search?ll=${lat},${lng}&radius=${radius}&limit=${limit}&fields=fsq_id,name,geocodes,categories,description,rating,photos`
    console.log('🔗 Foursquare URL:', url);
    
    const r = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Authorization': apiKey,
      },
      next: { revalidate: 0 },
    })

    console.log('📡 Foursquare response status:', r.status, r.statusText);

    if (!r.ok) {
      const text = await r.text();
      console.error(`❌ FSQ search error: ${r.status}`);
      console.error(`❌ FSQ error body:`, text.substring(0, 500));
      return NextResponse.json({ error: 'FSQ error', status: r.status, body: text }, { status: r.status });
    }

    const data = await r.json();
    console.log('📦 Foursquare response data keys:', Object.keys(data));
    console.log('📦 Results count:', data?.results?.length || 0);
    const results = Array.isArray(data?.results) ? data.results : [];

    const items = results.map((p: any) => ({
      id: p.fsq_id,
      fsq_id: p.fsq_id,
      title: p.name,
      description: p.description || undefined,
      category: p.categories?.[0]?.name || undefined,
      rating: p.rating || undefined,
      location: {
        lat: p.geocodes?.main?.latitude,
        lng: p.geocodes?.main?.longitude
      },
      photoUrl: Array.isArray(p.photos) && p.photos[0] ? `${p.photos[0].prefix}original${p.photos[0].suffix}` : undefined
    }))

    console.log(`✅ Foursquare API: Returning ${items.length} places`)

    return NextResponse.json({
      items,
      status: "OK",
      source: "foursquare"
    })
  } catch (error) {
    console.error('❌ Foursquare Places API GET error:', error)
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined,
      apiKeyPresent: !!process.env.FOURSQUARE_API_KEY,
      apiKeyLength: process.env.FOURSQUARE_API_KEY?.length || 0
    })
    
    return NextResponse.json({
      items: [],
      status: "ERROR",
      source: "foursquare",
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { lat, lng, radius = 5000, limit = 10 } = body

    console.log('🔍 Foursquare Places API POST request:', { lat, lng, radius, limit })

    if (!lat || !lng) {
      return NextResponse.json({ error: "Missing lat/lng parameters" }, { status: 400 })
    }

    const apiKey = process.env.FOURSQUARE_API_KEY;
    if (!apiKey) {
      console.error('❌ Missing FOURSQUARE_API_KEY env var');
      console.error('❌ Available env vars with FOURSQUARE:', Object.keys(process.env).filter(k => k.includes('FOURSQUARE')));
      return NextResponse.json({ error: 'Missing FOURSQUARE_API_KEY env var' }, { status: 500 });
    }

    const url = `${FSQ_BASE}/search?ll=${lat},${lng}&radius=${radius}&limit=${limit}&fields=fsq_id,name,geocodes,categories,description,rating,photos`
    console.log('🔗 Foursquare URL:', url);
    console.log('🔑 API Key present:', !!apiKey, 'Length:', apiKey.length);
    
    const r = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Authorization': apiKey,
      },
      next: { revalidate: 0 },
    })

    console.log('📡 Foursquare response status:', r.status, r.statusText);

    if (!r.ok) {
      const text = await r.text();
      console.error(`❌ FSQ search error: ${r.status}`);
      console.error(`❌ FSQ error body:`, text.substring(0, 500));
      return NextResponse.json({ error: 'FSQ error', status: r.status, body: text }, { status: r.status });
    }

    const data = await r.json();
    console.log('📦 Foursquare response data keys:', Object.keys(data));
    console.log('📦 Results count:', data?.results?.length || 0);
    const results = Array.isArray(data?.results) ? data.results : [];

    const items = results.map((p: any) => ({
      id: p.fsq_id,
      fsq_id: p.fsq_id,
      title: p.name,
      description: p.description || undefined,
      category: p.categories?.[0]?.name || undefined,
      rating: p.rating || undefined,
      location: {
        lat: p.geocodes?.main?.latitude,
        lng: p.geocodes?.main?.longitude
      },
      photoUrl: Array.isArray(p.photos) && p.photos[0] ? `${p.photos[0].prefix}original${p.photos[0].suffix}` : undefined
    }))

    console.log(`✅ Foursquare API: Returning ${items.length} places`)

    return NextResponse.json({
      items,
      status: "OK",
      source: "foursquare"
    })
  } catch (error) {
    console.error('❌ Foursquare Places API POST error:', error)
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined,
      apiKeyPresent: !!process.env.FOURSQUARE_API_KEY,
      apiKeyLength: process.env.FOURSQUARE_API_KEY?.length || 0
    })
    
    return NextResponse.json({
      items: [],
      status: "ERROR",
      source: "foursquare",
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
