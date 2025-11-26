import { type NextRequest, NextResponse } from "next/server"
import { assembleFsqPhotoUrl } from '@/lib/fsq'

// New Foursquare Places API configuration
const FSQ_PLACES_BASE = 'https://places-api.foursquare.com'
const FSQ_PLACES_API_VERSION = '2025-06-17' // API version for Places API

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

  // Use new Places API service key (required for new API)
  // Check for FSQ_PLACES_SERVICE_KEY first, then fallback to legacy keys for migration
  let serviceKey = process.env.FSQ_PLACES_SERVICE_KEY;
  if (!serviceKey) {
    // Fallback to old key names for backward compatibility during migration
    serviceKey = process.env.FOURSQUARE_API_KEY || process.env.NEXT_PUBLIC_FOURSQUARE_API_KEY;
    if (serviceKey) {
      console.warn('⚠️ Using legacy FOURSQUARE_API_KEY - please migrate to FSQ_PLACES_SERVICE_KEY for new Places API');
    }
  }
  
  if (!serviceKey) {
    console.error('❌ Missing FSQ_PLACES_SERVICE_KEY env var');
    console.error('❌ Available env vars with FOURSQUARE/FSQ:', Object.keys(process.env).filter(k => k.includes('FOURSQUARE') || k.includes('FSQ')));
    return NextResponse.json({ error: 'Missing FSQ_PLACES_SERVICE_KEY env var' }, { status: 500 });
  }

  try {
    console.log('🔍 Foursquare Places API GET request:', { lat, lng, radius, limit })
    console.log('🔑 Service Key present:', !!serviceKey, 'Length:', serviceKey?.length || 0);
    console.log('🔑 Service Key preview:', serviceKey ? `${serviceKey.substring(0, 10)}...${serviceKey.substring(serviceKey.length - 5)}` : 'MISSING');
    console.log('🔑 Environment check:', {
      hasFSQ_PLACES_SERVICE_KEY: !!process.env.FSQ_PLACES_SERVICE_KEY,
      hasFOURSQUARE_API_KEY: !!process.env.FOURSQUARE_API_KEY,
      hasNEXT_PUBLIC_FOURSQUARE_API_KEY: !!process.env.NEXT_PUBLIC_FOURSQUARE_API_KEY,
      usingKey: process.env.FSQ_PLACES_SERVICE_KEY ? 'FSQ_PLACES_SERVICE_KEY' : 
                process.env.FOURSQUARE_API_KEY ? 'FOURSQUARE_API_KEY' : 'NEXT_PUBLIC_FOURSQUARE_API_KEY'
    });

    // Build URL for new Places API
    const url = new URL(`${FSQ_PLACES_BASE}/places/search`);
    url.searchParams.set('ll', `${lat},${lng}`); // Latitude, longitude
    url.searchParams.set('radius', String(radius)); // Radius in meters
    url.searchParams.set('limit', String(limit)); // Limit results
    
    console.log('🔗 Foursquare Places API URL:', url.toString());
    
    const r = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
        'X-Places-Api-Version': FSQ_PLACES_API_VERSION,
      },
      next: { revalidate: 0 },
    })

    console.log('📡 Foursquare Places API response status:', r.status, r.statusText);

    if (!r.ok) {
      const text = await r.text();
      let errorBody: any;
      try {
        errorBody = JSON.parse(text);
      } catch {
        errorBody = text;
      }
      console.error(`❌ Foursquare Places API error: ${r.status}`);
      console.error(`❌ Error body:`, errorBody);
      console.error(`❌ Full error text:`, text.substring(0, 1000));
      
      // Provide more helpful error messages
      if (r.status === 401) {
        console.error('❌ 401 Unauthorized - Possible issues:');
        console.error('   1. Service key is incorrect or invalid');
        console.error('   2. Service key format is wrong (should be Bearer token)');
        console.error('   3. Service key has expired or been revoked');
        console.error('   4. Using legacy API key instead of Places API service key');
        console.error(`   Current key preview: ${serviceKey ? `${serviceKey.substring(0, 10)}...${serviceKey.substring(serviceKey.length - 5)}` : 'MISSING'}`);
      }
      
      // Don't expose the service key in error response
      return NextResponse.json({ 
        error: 'Foursquare Places API error', 
        status: r.status,
        message: r.status === 401 ? 'Foursquare Places API authentication failed. Check service key and account status.' : 'Foursquare Places API error'
      }, { status: r.status });
    }

    const data = await r.json();
    console.log('📦 Foursquare Places API response data keys:', Object.keys(data));
    
    // New Places API returns results in 'results' array
    const results = Array.isArray(data?.results) ? data.results : [];
    console.log('📦 Results count:', results.length);
    
    if (results.length === 0) {
      console.log('📸 Foursquare Places API returned 0 results');
    }

    // Map new Places API response format to existing internal format
    // New API structure may differ slightly, so we adapt fields as needed
    const items = results.map((p: any) => {
      let photoUrl: string | undefined = undefined
      
      // New Places API may have photos in different structure
      // Try both new format and legacy format for compatibility
      const photos = p.photos || p.photo || [];
      if (Array.isArray(photos) && photos.length > 0) {
        const firstPhoto = photos[0]
        // New API might return full URLs or still use prefix/suffix
        if (firstPhoto?.url) {
          // New format: direct URL
          photoUrl = firstPhoto.url
          console.log(`📸 Using direct photo URL for ${p.name || p.title}:`, photoUrl.substring(0, 50) + '...')
        } else if (firstPhoto?.prefix && firstPhoto?.suffix) {
          // Legacy format: assemble from prefix/suffix
          const assembled = assembleFsqPhotoUrl(firstPhoto.prefix, firstPhoto.suffix, 'original')
          if (assembled) {
            photoUrl = assembled
            console.log(`📸 Assembled photo URL for ${p.name || p.title}:`, photoUrl.substring(0, 50) + '...')
          } else {
            console.log(`⚠️ Failed to assemble photo URL for ${p.name || p.title}`)
          }
        } else {
          console.log(`⚠️ Photo data incomplete for ${p.name || p.title}`)
        }
      }

      // Map fields from new API format to existing internal format
      // New API uses: fsq_id (or id), name (or title), geocodes, categories, etc.
      const fsqId = p.fsq_id || p.id || p.place_id;
      const placeName = p.name || p.title;
      const latitude = p.geocodes?.main?.latitude || p.location?.latitude || p.latitude;
      const longitude = p.geocodes?.main?.longitude || p.location?.longitude || p.longitude;
      const category = p.categories?.[0]?.name || p.primary_category?.name;
      const address = p.location?.address || p.location?.formatted_address || p.address || p.location?.cross_street;

      return {
        id: fsqId,
        fsq_id: fsqId, // Keep both for compatibility
        title: placeName,
        description: p.description || undefined,
        category: category || undefined,
        rating: p.rating || undefined,
        location: {
          lat: latitude,
          lng: longitude
        },
        photoUrl: photoUrl,
        address: address || undefined
      }
    })

    console.log(`✅ Foursquare Places API: Returning ${items.length} places`)

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
      serviceKeyPresent: !!process.env.FSQ_PLACES_SERVICE_KEY,
      serviceKeyLength: process.env.FSQ_PLACES_SERVICE_KEY?.length || 0
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

    // Use new Places API service key (required for new API)
    // Check for FSQ_PLACES_SERVICE_KEY first, then fallback to legacy keys for migration
    let serviceKey = process.env.FSQ_PLACES_SERVICE_KEY;
    if (!serviceKey) {
      // Fallback to old key names for backward compatibility during migration
      serviceKey = process.env.FOURSQUARE_API_KEY || process.env.NEXT_PUBLIC_FOURSQUARE_API_KEY;
      if (serviceKey) {
        console.warn('⚠️ Using legacy FOURSQUARE_API_KEY - please migrate to FSQ_PLACES_SERVICE_KEY for new Places API');
      }
    }
    
    if (!serviceKey) {
      console.error('❌ Missing FSQ_PLACES_SERVICE_KEY env var');
      console.error('❌ Available env vars with FOURSQUARE/FSQ:', Object.keys(process.env).filter(k => k.includes('FOURSQUARE') || k.includes('FSQ')));
      return NextResponse.json({ error: 'Missing FSQ_PLACES_SERVICE_KEY env var' }, { status: 500 });
    }

    // Build URL for new Places API
    const url = new URL(`${FSQ_PLACES_BASE}/places/search`);
    url.searchParams.set('ll', `${lat},${lng}`); // Latitude, longitude
    url.searchParams.set('radius', String(radius)); // Radius in meters
    url.searchParams.set('limit', String(limit)); // Limit results
    
    console.log('🔗 Foursquare Places API URL:', url.toString());
    console.log('🔑 Service Key present:', !!serviceKey, 'Length:', serviceKey?.length || 0);
    console.log('🔑 Service Key preview:', serviceKey ? `${serviceKey.substring(0, 10)}...${serviceKey.substring(serviceKey.length - 5)}` : 'MISSING');
    console.log('🔑 Environment check:', {
      hasFSQ_PLACES_SERVICE_KEY: !!process.env.FSQ_PLACES_SERVICE_KEY,
      hasFOURSQUARE_API_KEY: !!process.env.FOURSQUARE_API_KEY,
      hasNEXT_PUBLIC_FOURSQUARE_API_KEY: !!process.env.NEXT_PUBLIC_FOURSQUARE_API_KEY,
      usingKey: process.env.FSQ_PLACES_SERVICE_KEY ? 'FSQ_PLACES_SERVICE_KEY' : 
                process.env.FOURSQUARE_API_KEY ? 'FOURSQUARE_API_KEY' : 'NEXT_PUBLIC_FOURSQUARE_API_KEY'
    });
    
    const r = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
        'X-Places-Api-Version': FSQ_PLACES_API_VERSION,
      },
      next: { revalidate: 0 },
    })

    console.log('📡 Foursquare Places API response status:', r.status, r.statusText);

    if (!r.ok) {
      const text = await r.text();
      let errorBody: any;
      try {
        errorBody = JSON.parse(text);
      } catch {
        errorBody = text;
      }
      console.error(`❌ Foursquare Places API error: ${r.status}`);
      console.error(`❌ Error body:`, errorBody);
      console.error(`❌ Full error text:`, text.substring(0, 1000));
      
      // Provide more helpful error messages
      if (r.status === 401) {
        console.error('❌ 401 Unauthorized - Possible issues:');
        console.error('   1. Service key is incorrect or invalid');
        console.error('   2. Service key format is wrong (should be Bearer token)');
        console.error('   3. Service key has expired or been revoked');
        console.error('   4. Using legacy API key instead of Places API service key');
        console.error(`   Current key preview: ${serviceKey ? `${serviceKey.substring(0, 10)}...${serviceKey.substring(serviceKey.length - 5)}` : 'MISSING'}`);
      }
      
      // Don't expose the service key in error response
      return NextResponse.json({ 
        error: 'Foursquare Places API error', 
        status: r.status,
        message: r.status === 401 ? 'Foursquare Places API authentication failed. Check service key and account status.' : 'Foursquare Places API error'
      }, { status: r.status });
    }

    const data = await r.json();
    console.log('📦 Foursquare Places API response data keys:', Object.keys(data));
    
    // New Places API returns results in 'results' array
    const results = Array.isArray(data?.results) ? data.results : [];
    console.log('📦 Results count:', results.length);
    
    if (results.length === 0) {
      console.log('📸 Foursquare Places API returned 0 results');
    }

    // Map new Places API response format to existing internal format
    // New API structure may differ slightly, so we adapt fields as needed
    const items = results.map((p: any) => {
      let photoUrl: string | undefined = undefined
      
      // New Places API may have photos in different structure
      // Try both new format and legacy format for compatibility
      const photos = p.photos || p.photo || [];
      if (Array.isArray(photos) && photos.length > 0) {
        const firstPhoto = photos[0]
        // New API might return full URLs or still use prefix/suffix
        if (firstPhoto?.url) {
          // New format: direct URL
          photoUrl = firstPhoto.url
          console.log(`📸 Using direct photo URL for ${p.name || p.title}:`, photoUrl.substring(0, 50) + '...')
        } else if (firstPhoto?.prefix && firstPhoto?.suffix) {
          // Legacy format: assemble from prefix/suffix
          const assembled = assembleFsqPhotoUrl(firstPhoto.prefix, firstPhoto.suffix, 'original')
          if (assembled) {
            photoUrl = assembled
            console.log(`📸 Assembled photo URL for ${p.name || p.title}:`, photoUrl.substring(0, 50) + '...')
          } else {
            console.log(`⚠️ Failed to assemble photo URL for ${p.name || p.title}`)
          }
        } else {
          console.log(`⚠️ Photo data incomplete for ${p.name || p.title}`)
        }
      }

      // Map fields from new API format to existing internal format
      // New API uses: fsq_id (or id), name (or title), geocodes, categories, etc.
      const fsqId = p.fsq_id || p.id || p.place_id;
      const placeName = p.name || p.title;
      const latitude = p.geocodes?.main?.latitude || p.location?.latitude || p.latitude;
      const longitude = p.geocodes?.main?.longitude || p.location?.longitude || p.longitude;
      const category = p.categories?.[0]?.name || p.primary_category?.name;
      const address = p.location?.address || p.location?.formatted_address || p.address || p.location?.cross_street;

      return {
        id: fsqId,
        fsq_id: fsqId, // Keep both for compatibility
        title: placeName,
        description: p.description || undefined,
        category: category || undefined,
        rating: p.rating || undefined,
        location: {
          lat: latitude,
          lng: longitude
        },
        photoUrl: photoUrl,
        address: address || undefined
      }
    })

    console.log(`✅ Foursquare Places API: Returning ${items.length} places`)

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
      serviceKeyPresent: !!process.env.FSQ_PLACES_SERVICE_KEY,
      serviceKeyLength: process.env.FSQ_PLACES_SERVICE_KEY?.length || 0
    })
    
    return NextResponse.json({
      items: [],
      status: "ERROR",
      source: "foursquare",
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
