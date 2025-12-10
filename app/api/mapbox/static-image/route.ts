import { type NextRequest, NextResponse } from "next/server"

/**
 * Mapbox Static Images API Route
 * Generates static map images with satellite/building views
 * Replaces Mapillary/KartaView for place photos
 */

const MAPBOX_STATIC_BASE = 'https://api.mapbox.com/styles/v1/mapbox'

// In-memory cache to prevent duplicate requests
const imageCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 86400000 // 24 hours (images don't change often)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get("lat")
  const lng = searchParams.get("lng")
  const width = searchParams.get("width") || "800"
  const height = searchParams.get("height") || "600"
  const zoom = searchParams.get("zoom") || "18"
  const style = searchParams.get("style") || "satellite-v9" // satellite-v9 shows buildings well

  console.log('📸 Mapbox Static Image API GET - params:', { lat, lng, width, height, zoom, style })

  if (!lat || !lng) {
    console.error('❌ Missing lat/lng parameters')
    return NextResponse.json({ 
      error: "Missing lat/lng parameters" 
    }, { status: 400 })
  }

  const latNum = parseFloat(lat)
  const lngNum = parseFloat(lng)
  
  if (isNaN(latNum) || isNaN(lngNum)) {
    console.error('❌ Invalid coordinate values:', { lat, lng })
    return NextResponse.json({ 
      error: "Invalid lat/lng values" 
    }, { status: 400 })
  }

  if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
    console.error('❌ Coordinates out of valid range:', { latNum, lngNum })
    return NextResponse.json({ 
      error: "Coordinates out of valid range" 
    }, { status: 400 })
  }

  const accessToken = process.env.NEXT_PUBLIC_MAPBOX_API_KEY
  if (!accessToken) {
    console.error('❌ Missing NEXT_PUBLIC_MAPBOX_API_KEY env var')
    return NextResponse.json({ error: 'Missing NEXT_PUBLIC_MAPBOX_API_KEY env var' }, { status: 500 })
  }

  // Check cache first (prevent duplicate requests)
  const cacheKey = `${latNum.toFixed(6)},${lngNum.toFixed(6)},${width},${height},${zoom},${style}`
  const cached = imageCache.get(cacheKey)
  const now = Date.now()
  
  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    console.log('✅ Using cached Mapbox Static Image result')
    return NextResponse.json(cached.data, {
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
        'X-Cache': 'HIT'
      }
    })
  }

  try {
    // Mapbox Static Images API
    // Format: /styles/v1/{username}/{style_id}/static/{overlay}/{lon},{lat},{zoom},{bearing},{pitch}|{width}x{height}{@2x}
    const imageUrl = new URL(`${MAPBOX_STATIC_BASE}/${style}/static/${lngNum},${latNum},${zoom}/${width}x${height}@2x`)
    imageUrl.searchParams.set('access_token', accessToken)

    console.log('🔗 Mapbox Static Image URL:', imageUrl.toString().replace(accessToken, 'TOKEN_HIDDEN'))

    // Return the image URL (client will fetch it)
    // We don't proxy the image to avoid bandwidth costs
    const result = {
      imageUrl: imageUrl.toString(),
      location: {
        lat: latNum,
        lng: lngNum
      },
      style: style,
      zoom: parseInt(zoom),
      status: "OK",
      source: "mapbox"
    }

    // Cache the result
    imageCache.set(cacheKey, { data: result, timestamp: now })
    
    // Clean up old cache entries (keep last 100)
    if (imageCache.size > 100) {
      const entries = Array.from(imageCache.entries())
      entries.sort((a, b) => b[1].timestamp - a[1].timestamp)
      imageCache.clear()
      entries.slice(0, 100).forEach(([key, value]) => imageCache.set(key, value))
    }

    console.log(`✅ Mapbox Static Image: Generated image URL`)

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
        'X-Cache': 'MISS'
      }
    })
  } catch (error) {
    console.error('❌ Mapbox Static Image API GET error:', error)
    return NextResponse.json({
      imageUrl: null,
      status: "ERROR",
      source: "mapbox",
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

