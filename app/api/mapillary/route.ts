import { type NextRequest, NextResponse } from "next/server"

/**
 * Mapillary API Route
 * Fetches street-level imagery near given coordinates
 * Mapillary provides crowdsourced street-view photos (like Google Street View)
 */

const MAPILLARY_API_BASE = 'https://graph.mapillary.com'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get("lat")
  const lng = searchParams.get("lng")
  const radius = searchParams.get("radius") || "50" // Default 50m radius
  const limit = searchParams.get("limit") || "5" // Default 5 images

  console.log('📸 Mapillary API GET - params:', { lat, lng, radius, limit })

  if (!lat || !lng) {
    console.error('❌ Missing lat/lng parameters')
    return NextResponse.json({ error: "Missing lat/lng parameters" }, { status: 400 })
  }

  // Validate coordinates
  const latNum = parseFloat(lat)
  const lngNum = parseFloat(lng)
  
  if (isNaN(latNum) || isNaN(lngNum)) {
    console.error('❌ Invalid coordinate values:', { lat, lng })
    return NextResponse.json({ error: "Invalid lat/lng values" }, { status: 400 })
  }

  if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
    console.error('❌ Coordinates out of valid range:', { latNum, lngNum })
    return NextResponse.json({ error: "Coordinates out of valid range" }, { status: 400 })
  }

  const accessToken = process.env.MAPILLARY_TOKEN

  if (!accessToken) {
    console.error('❌ Missing MAPILLARY_TOKEN env var')
    return NextResponse.json({ error: 'Missing MAPILLARY_TOKEN env var' }, { status: 500 })
  }

  try {
    console.log('🔍 Mapillary API: Searching for images near:', { lat, lng, radius })

    // Step 1: Search for images near the location
    // Use bbox (bounding box) for geographic search
    const radiusInDegrees = parseFloat(radius) / 111000 // Rough conversion: 1 degree ≈ 111km
    const bbox = [
      lngNum - radiusInDegrees,
      latNum - radiusInDegrees,
      lngNum + radiusInDegrees,
      latNum + radiusInDegrees
    ].join(',')

    const searchUrl = new URL(`${MAPILLARY_API_BASE}/images`)
    searchUrl.searchParams.set('access_token', accessToken)
    searchUrl.searchParams.set('bbox', bbox)
    searchUrl.searchParams.set('limit', String(limit))
    searchUrl.searchParams.set('fields', 'id,thumb_2048_url,captured_at,compass_angle,geometry')

    console.log('🔗 Mapillary search URL:', searchUrl.toString().replace(accessToken, 'TOKEN_HIDDEN'))

    const response = await fetch(searchUrl.toString(), {
      next: { revalidate: 3600 } // Cache for 1 hour
    })

    console.log('📡 Mapillary API response status:', response.status, response.statusText)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Mapillary API error: ${response.status}`, errorText.substring(0, 500))
      
      return NextResponse.json({ 
        error: 'Mapillary API error', 
        status: response.status,
        message: response.status === 401 
          ? 'Mapillary authentication failed. Check access token.' 
          : 'Mapillary API error'
      }, { status: response.status })
    }

    const data = await response.json()
    console.log('📦 Mapillary response data keys:', Object.keys(data))
    
    const images = Array.isArray(data?.data) ? data.data : []
    console.log('📦 Images count:', images.length)

    if (images.length === 0) {
      console.log('📸 No Mapillary images found near this location')
      return NextResponse.json({
        images: [],
        status: "OK",
        source: "mapillary",
        message: "No street-level images available for this location"
      })
    }

    // Map Mapillary response to our format
    const mappedImages = images.map((img: any) => {
      const imageUrl = img.thumb_2048_url || img.thumb_1024_url || img.thumb_256_url
      
      return {
        id: img.id,
        url: imageUrl,
        capturedAt: img.captured_at,
        compassAngle: img.compass_angle,
        geometry: img.geometry,
        source: 'mapillary'
      }
    })

    console.log(`✅ Mapillary API: Returning ${mappedImages.length} street-level images`)

    return NextResponse.json({
      images: mappedImages,
      status: "OK",
      source: "mapillary"
    })
  } catch (error) {
    console.error('❌ Mapillary API GET error:', error)
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined
    })
    
    return NextResponse.json({
      images: [],
      status: "ERROR",
      source: "mapillary",
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

