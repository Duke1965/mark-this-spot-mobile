import { type NextRequest, NextResponse } from "next/server"

/**
 * KartaView API Route (formerly OpenStreetCam)
 * Fetches street-level imagery with bearing information
 * Filters images to prefer building-facing over road-facing
 * 
 * Free tier: Yes (open source, CC BY-SA license)
 * Note: KartaView API endpoint may need to be verified/updated based on actual API documentation
 */

// KartaView API base URL - may need adjustment based on actual API
const KARTAVIEW_BASE = 'https://api.kartaview.org' // Placeholder - verify actual endpoint

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get("lat")
  const lng = searchParams.get("lng")
  const radius = searchParams.get("radius") || "100" // Default 100m radius
  const limit = searchParams.get("limit") || "10" // Number of images to return

  console.log('📸 KartaView API GET - params:', { lat, lng, radius, limit })

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

  try {
    // KartaView API query - structure may need adjustment based on actual API
    // Common patterns: /api/v1/images?lat=X&lon=Y&radius=Z or /api/images?bbox=X,Y,X,Y
    const radiusDegrees = parseFloat(radius) / 111000
    const bbox = `${lngNum - radiusDegrees},${latNum - radiusDegrees},${lngNum + radiusDegrees},${latNum + radiusDegrees}`
    
    // Try multiple possible endpoint patterns
    const possibleEndpoints = [
      `${KARTAVIEW_BASE}/api/v1/images?lat=${lat}&lon=${lng}&radius=${radius}&limit=${limit}`,
      `${KARTAVIEW_BASE}/api/images?bbox=${bbox}&limit=${limit}`,
      `${KARTAVIEW_BASE}/images?lat=${lat}&lon=${lng}&radius=${radius}`
    ]
    
    let response: Response | null = null
    let lastError: Error | null = null
    
    // Try each endpoint pattern until one works
    for (const endpoint of possibleEndpoints) {
      try {
        console.log(`📡 Trying KartaView endpoint: ${endpoint}`)
        response = await fetch(endpoint, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'PINIT-App/1.0 (Location-based pinning app)'
          },
          next: { revalidate: 3600 } // Cache for 1 hour
        })
        
        if (response.ok) {
          console.log(`✅ KartaView endpoint successful: ${endpoint}`)
          break
        } else {
          console.warn(`⚠️ KartaView endpoint failed (${response.status}): ${endpoint}`)
          response = null
        }
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))
        console.warn(`⚠️ KartaView endpoint error: ${endpoint}`, lastError.message)
        response = null
      }
    }

    if (!response || !response.ok) {
      console.warn('⚠️ All KartaView API endpoints failed, returning empty results')
      return NextResponse.json({
        images: [],
        status: "NO_ENDPOINT",
        source: "kartaview",
        note: "KartaView API endpoint may need to be configured. Please verify the correct endpoint in KartaView documentation."
      })
    }

    const data = await response.json()
    
    // Handle different possible response formats
    const images = data.data || data.images || data.results || (Array.isArray(data) ? data : [])
    
    if (!images || images.length === 0) {
      console.log('📸 No KartaView images found for this location')
      return NextResponse.json({
        images: [],
        status: "NO_IMAGES",
        source: "kartaview"
      })
    }

    console.log(`📸 KartaView returned ${images.length} images, filtering for building-facing...`)

    // Process and filter images
    // Extract bearing/heading information if available
    const processedImages = images
      .map((image: any) => {
        // Handle different possible field names for coordinates and bearing
        const imageLat = image.lat || image.latitude || image.geometry?.coordinates?.[1] || image.location?.lat || latNum
        const imageLng = image.lng || image.longitude || image.geometry?.coordinates?.[0] || image.location?.lng || lngNum
        const bearing = image.bearing || image.heading || image.compass_angle || image.direction || 0
        
        // Handle different possible field names for image URLs
        const imageUrl = image.url || image.image_url || image.thumb_2048_url || image.photo_url || image.thumbnail_url
        const thumbUrl = image.thumb_url || image.thumb_256_url || image.thumbnail || imageUrl
        
        if (!imageUrl) {
          return null // Skip images without URLs
        }
        
        // Calculate distance from target location
        const distance = calculateDistance(latNum, lngNum, imageLat, imageLng)
        
        return {
          id: image.id || image.image_id || `${imageLat}-${imageLng}-${Date.now()}`,
          url: imageUrl,
          thumb_url: thumbUrl,
          bearing: bearing, // Compass angle (0-360°)
          location: {
            lat: imageLat,
            lng: imageLng
          },
          distance: distance,
          source: 'kartaview'
        }
      })
      .filter((img: any) => img !== null && img.distance <= parseFloat(radius)) // Filter by radius
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

    console.log(`✅ KartaView: Returning ${processedImages.length} filtered images`)

    return NextResponse.json({
      images: processedImages,
      status: "OK",
      source: "kartaview",
      total_found: images.length,
      filtered_count: processedImages.length
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
      }
    })

  } catch (error) {
    console.error('❌ KartaView API GET error:', error)
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined
    })
    
    return NextResponse.json({
      images: [],
      status: "ERROR",
      source: "kartaview",
      error: error instanceof Error ? error.message : "Unknown error",
      note: "KartaView API endpoint may need to be configured. Please verify the correct endpoint in KartaView documentation."
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

