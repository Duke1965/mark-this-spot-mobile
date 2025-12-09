import { type NextRequest, NextResponse } from "next/server"

/**
 * Mapillary API Route
 * Fetches street-level imagery with bearing information
 * Filters images to prefer building-facing over road-facing
 * 
 * Free tier: Yes (requires access token)
 * License: CC BY-SA 4.0
 */

const MAPILLARY_BASE = 'https://graph.mapillary.com'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get("lat")
  const lng = searchParams.get("lng")
  const radius = searchParams.get("radius") || "100" // Default 100m radius
  const limit = searchParams.get("limit") || "10" // Number of images to return

  console.log('📸 Mapillary API GET - params:', { lat, lng, radius, limit })

  if (!lat || !lng) {
    console.error('❌ Missing lat/lng parameters')
    return NextResponse.json({ 
      error: "Missing lat/lng parameters" 
    }, { status: 400 })
  }

  // Validate coordinates
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

  // Check for API token
  const MAPILLARY_TOKEN = process.env.MAPILLARY_TOKEN
  if (!MAPILLARY_TOKEN) {
    console.warn('⚠️ MAPILLARY_TOKEN not configured, returning empty results')
    return NextResponse.json({
      images: [],
      status: "NO_TOKEN",
      source: "mapillary"
    })
  }

  try {
    // Calculate bounding box (roughly radius meters around point)
    // 1 degree latitude ≈ 111km, so radius/111000 gives degrees
    const radiusDegrees = parseFloat(radius) / 111000
    const bbox = `${lngNum - radiusDegrees},${latNum - radiusDegrees},${lngNum + radiusDegrees},${latNum + radiusDegrees}`
    
    // Mapillary API v4: Get images with bearing information
    const url = new URL(`${MAPILLARY_BASE}/images`)
    url.searchParams.set('access_token', MAPILLARY_TOKEN)
    url.searchParams.set('fields', 'id,thumb_2048_url,thumb_256_url,compass_angle,geometry')
    url.searchParams.set('bbox', bbox)
    url.searchParams.set('limit', Math.min(parseInt(limit) * 2, 50).toString()) // Get more images to filter from
    
    console.log('📡 Fetching Mapillary images...')
    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json'
      },
      next: { revalidate: 3600 } // Cache for 1 hour
    })

    console.log('📡 Mapillary API response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Mapillary API error: ${response.status}`, errorText.substring(0, 500))
      return NextResponse.json({ 
        images: [],
        status: "ERROR",
        source: "mapillary",
        error: `Mapillary API error: ${response.status}`
      }, { status: response.status })
    }

    const data = await response.json()
    
    if (!data.data || data.data.length === 0) {
      console.log('📸 No Mapillary images found for this location')
      return NextResponse.json({
        images: [],
        status: "NO_IMAGES",
        source: "mapillary"
      })
    }

    console.log(`📸 Mapillary returned ${data.data.length} images, filtering for building-facing...`)

    // Filter and process images
    // Strategy: Prefer images that are NOT facing directly down the road
    // Road-facing images typically have bearings aligned with road direction (0-360°)
    // Building-facing images are often perpendicular to road direction
    const processedImages = data.data
      .map((image: any) => {
        const imageLat = image.geometry?.coordinates?.[1] || latNum
        const imageLng = image.geometry?.coordinates?.[0] || lngNum
        const bearing = image.compass_angle || 0
        
        // Calculate distance from target location
        const distance = calculateDistance(latNum, lngNum, imageLat, imageLng)
        
        return {
          id: image.id,
          url: image.thumb_2048_url || image.thumb_256_url,
          thumb_url: image.thumb_256_url,
          bearing: bearing, // Compass angle (0-360°)
          location: {
            lat: imageLat,
            lng: imageLng
          },
          distance: distance,
          source: 'mapillary'
        }
      })
      .filter((img: any) => img.distance <= parseFloat(radius)) // Filter by radius
      .sort((a: any, b: any) => {
        // Sort by: 1) Distance (closer is better), 2) Prefer non-road-facing bearings
        // Road-facing images often have bearings that are multiples of 90° (N, E, S, W)
        // We'll prefer images with bearings that are NOT aligned to cardinal directions
        const aIsCardinal = Math.abs(a.bearing % 90) < 10 || Math.abs(a.bearing % 90) > 80
        const bIsCardinal = Math.abs(b.bearing % 90) < 10 || Math.abs(b.bearing % 90) > 80
        
        if (aIsCardinal && !bIsCardinal) return 1 // Prefer b (non-cardinal)
        if (!aIsCardinal && bIsCardinal) return -1 // Prefer a (non-cardinal)
        return a.distance - b.distance // Otherwise sort by distance
      })
      .slice(0, parseInt(limit)) // Limit results

    console.log(`✅ Mapillary: Returning ${processedImages.length} filtered images`)

    return NextResponse.json({
      images: processedImages,
      status: "OK",
      source: "mapillary",
      total_found: data.data.length,
      filtered_count: processedImages.length
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
      }
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

// Helper function to calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000 // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

