import { type NextRequest, NextResponse } from "next/server"

/**
 * Overpass API Route (OpenStreetMap)
 * Advanced POI queries with detailed metadata
 * More powerful than Nominatim for complex queries
 * 
 * Rate limiting: Use public instance responsibly (or self-host)
 */

const OVERPASS_BASE = 'https://overpass-api.de/api/interpreter'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get("lat")
  const lng = searchParams.get("lng")
  const radius = searchParams.get("radius") || "100" // Default 100m
  const limit = searchParams.get("limit") || "10"

  console.log('🔍 Overpass API GET - params:', { lat, lng, radius, limit })

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
    // Overpass QL query to find nearby POIs
    // Search for: restaurants, cafes, shops, tourism, leisure facilities
    const radiusMeters = parseInt(radius)
    const query = `
      [out:json][timeout:25];
      (
        node["amenity"~"^(restaurant|cafe|bar|fast_food|pub|food_court|ice_cream)$"](around:${radiusMeters},${latNum},${lngNum});
        node["shop"](around:${radiusMeters},${latNum},${lngNum});
        node["tourism"~"^(attraction|museum|gallery|hotel|hostel|information)$"](around:${radiusMeters},${latNum},${lngNum});
        node["leisure"](around:${radiusMeters},${latNum},${lngNum});
        way["amenity"~"^(restaurant|cafe|bar|fast_food|pub|food_court|ice_cream)$"](around:${radiusMeters},${latNum},${lngNum});
        way["shop"](around:${radiusMeters},${latNum},${lngNum});
        way["tourism"~"^(attraction|museum|gallery|hotel|hostel|information)$"](around:${radiusMeters},${latNum},${lngNum});
        way["leisure"](around:${radiusMeters},${latNum},${lngNum});
        relation["amenity"~"^(restaurant|cafe|bar|fast_food|pub|food_court|ice_cream)$"](around:${radiusMeters},${latNum},${lngNum});
        relation["shop"](around:${radiusMeters},${latNum},${lngNum});
        relation["tourism"~"^(attraction|museum|gallery|hotel|hostel|information)$"](around:${radiusMeters},${latNum},${lngNum});
        relation["leisure"](around:${radiusMeters},${latNum},${lngNum});
      );
      out center meta;
    `.trim()

    console.log('🔍 Overpass query:', query.substring(0, 200) + '...')

    const response = await fetch(OVERPASS_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: `data=${encodeURIComponent(query)}`,
      next: { revalidate: 3600 } // Cache for 1 hour
    })

    console.log('📡 Overpass API response status:', response.status, response.statusText)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Overpass API error: ${response.status}`, errorText.substring(0, 500))
      return NextResponse.json({ 
        error: 'Overpass API error', 
        status: response.status,
        message: 'Failed to query OSM data'
      }, { status: response.status })
    }

    const data = await response.json()
    const elements = Array.isArray(data?.elements) ? data.elements : []
    console.log(`📦 Overpass returned ${elements.length} OSM elements`)

    // Process OSM elements into POI format
    const pois = elements
      .map((element: any) => {
        // Get coordinates (center for ways/relations, lat/lon for nodes)
        const coords = element.center || { lat: element.lat, lon: element.lon }
        const poiLat = coords.lat
        const poiLng = coords.lon

        if (!poiLat || !poiLng || isNaN(poiLat) || isNaN(poiLng)) {
          return null
        }

        // Calculate distance
        const distance = calculateDistance(latNum, lngNum, poiLat, poiLng)
        if (isNaN(distance) || distance < 0) return null

        // Extract place information from tags
        const tags = element.tags || {}
        const name = tags.name || tags['name:en'] || tags['name:af'] || 'Unknown Place'
        const category = tags.amenity || tags.shop || tags.tourism || tags.leisure || 'place'
        const description = tags.description || tags['description:en'] || undefined
        const cuisine = tags.cuisine || undefined
        const website = tags.website || undefined
        const phone = tags.phone || tags['contact:phone'] || undefined

        // Build rich description
        const descriptionParts = []
        if (description) descriptionParts.push(description)
        if (cuisine) descriptionParts.push(`Cuisine: ${cuisine}`)
        if (category) descriptionParts.push(category)
        const fullDescription = descriptionParts.length > 0 ? descriptionParts.join(' • ') : undefined

        return {
          id: element.id,
          osm_type: element.type,
          osm_id: element.id,
          name: name,
          category: category,
          description: fullDescription,
          cuisine: cuisine,
          website: website,
          phone: phone,
          tags: tags,
          location: {
            lat: poiLat,
            lng: poiLng
          },
          distance: distance,
          source: 'overpass'
        }
      })
      .filter((poi: any) => poi !== null)
      .sort((a: any, b: any) => a.distance - b.distance)
      .slice(0, parseInt(limit))

    console.log(`✅ Overpass: Returning ${pois.length} POIs`)

    return NextResponse.json({
      pois: pois,
      status: "OK",
      source: "overpass",
      count: pois.length
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
      }
    })

  } catch (error) {
    console.error('❌ Overpass API GET error:', error)
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined
    })
    
    return NextResponse.json({
      pois: [],
      status: "ERROR",
      source: "overpass",
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

