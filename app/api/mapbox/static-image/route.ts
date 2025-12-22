import { type NextRequest, NextResponse } from "next/server"

/**
 * Mapbox Static Images API Route
 * Generates static map images for given coordinates
 * Useful as fallback when Wikimedia doesn't have images for street addresses
 */

const MAPBOX_STATIC_BASE = 'https://api.mapbox.com/styles/v1/mapbox'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get("lat")
  const lng = searchParams.get("lng")
  const width = searchParams.get("width") || "800"
  const height = searchParams.get("height") || "600"
  const zoom = searchParams.get("zoom") || "16"
  const style = searchParams.get("style") || "streets-v12"

  console.log('🖼️ Mapbox Static Image API GET - params:', { lat, lng, width, height, zoom, style })

  if (!lat || !lng) {
    console.error('❌ Missing lat/lng parameters')
    return NextResponse.json({ 
      error: "Missing lat/lng parameters" 
    }, { status: 400 })
  }

  const accessToken = process.env.NEXT_PUBLIC_MAPBOX_API_KEY

  if (!accessToken) {
    console.error('❌ Missing NEXT_PUBLIC_MAPBOX_API_KEY env var')
    return NextResponse.json({ error: 'Missing NEXT_PUBLIC_MAPBOX_API_KEY env var' }, { status: 500 })
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

  try {
    // Mapbox Static Images API format: /styles/v1/{style_id}/static/{overlay}/{lon},{lat},{zoom},{bearing},{pitch}|{width}x{height}
    // For simple static image: /styles/v1/{style_id}/static/{lon},{lat},{zoom}/{width}x{height}
    const staticImageUrl = new URL(`${MAPBOX_STATIC_BASE}/${style}/static/${lngNum},${latNum},${zoom}/${width}x${height}`)
    staticImageUrl.searchParams.set('access_token', accessToken)
    
    // Add optional marker at center point
    staticImageUrl.searchParams.set('marker', `color:ff0000|${lngNum},${latNum}`)
    
    console.log('🔗 Mapbox Static Image URL:', staticImageUrl.toString().replace(accessToken, 'TOKEN_HIDDEN'))

    const response = await fetch(staticImageUrl.toString(), {
      next: { revalidate: 3600 } // Cache for 1 hour
    })

    console.log('📡 Mapbox Static Image response status:', response.status, response.statusText)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Mapbox Static Image API error: ${response.status}`, errorText.substring(0, 500))

      return NextResponse.json({
        error: 'Mapbox Static Image API error',
        status: response.status,
        message: response.status === 401
          ? 'Mapbox authentication failed. Check API key.'
          : 'Mapbox Static Image API error'
      }, { status: response.status })
    }

    // Return the image URL (Mapbox returns the image directly, so we return the URL)
    const imageUrl = staticImageUrl.toString()

    console.log(`✅ Mapbox Static Image URL generated: ${imageUrl.substring(0, 80)}...`)

    return NextResponse.json({
      imageUrl,
      source: 'mapbox',
      style,
      width: parseInt(width),
      height: parseInt(height),
      zoom: parseFloat(zoom),
      coordinates: { lat: latNum, lng: lngNum }
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200'
      }
    })
  } catch (error) {
    console.error('❌ Mapbox Static Image API GET error:', error)
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined
    })

    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

