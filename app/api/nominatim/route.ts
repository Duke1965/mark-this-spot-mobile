import { type NextRequest, NextResponse } from "next/server"

/**
 * Nominatim API Route (OpenStreetMap)
 * Reverse geocoding and nearby POI search
 * Free, open-source alternative to commercial APIs
 * 
 * Rate limiting: 1 request per second (be respectful!)
 */

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get("lat")
  const lng = searchParams.get("lng")
  const radius = searchParams.get("radius") || "100" // Default 100m for POI search
  const limit = searchParams.get("limit") || "10"

  console.log('📍 Nominatim API GET - params:', { lat, lng, radius, limit })

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
    // Step 1: Reverse geocoding to get address/place info
    console.log('📍 Step 1: Reverse geocoding for address...')
    const reverseUrl = new URL(`${NOMINATIM_BASE}/reverse`)
    reverseUrl.searchParams.set('lat', lat)
    reverseUrl.searchParams.set('lon', lng)
    reverseUrl.searchParams.set('format', 'json')
    reverseUrl.searchParams.set('addressdetails', '1')
    reverseUrl.searchParams.set('extratags', '1') // Get additional OSM tags for richer descriptions
    reverseUrl.searchParams.set('zoom', '18') // High detail level
    
    // IMPORTANT: Nominatim requires User-Agent header
    const reverseResponse = await fetch(reverseUrl.toString(), {
      headers: {
        'User-Agent': 'PINIT-App/1.0 (Location-based pinning app)', // Required by Nominatim
        'Accept': 'application/json'
      },
      next: { revalidate: 3600 } // Cache for 1 hour
    })

    console.log('📡 Nominatim reverse geocoding response status:', reverseResponse.status)

    if (!reverseResponse.ok) {
      const errorText = await reverseResponse.text()
      console.error(`❌ Nominatim reverse geocoding error: ${reverseResponse.status}`, errorText.substring(0, 500))
      return NextResponse.json({ 
        error: 'Nominatim API error', 
        status: reverseResponse.status,
        message: 'Failed to reverse geocode location'
      }, { status: reverseResponse.status })
    }

    const reverseData = await reverseResponse.json()
    console.log('📦 Nominatim reverse geocoding data:', {
      display_name: reverseData.display_name?.substring(0, 100),
      type: reverseData.type,
      class: reverseData.class
    })

    // Step 2: Search for nearby POIs (restaurants, shops, etc.)
    console.log('📍 Step 2: Searching for nearby POIs...')
    const searchUrl = new URL(`${NOMINATIM_BASE}/search`)
    searchUrl.searchParams.set('q', `[amenity][shop][tourism][leisure]`) // Search for amenities, shops, tourism, leisure
    searchUrl.searchParams.set('format', 'json')
    searchUrl.searchParams.set('limit', limit)
    searchUrl.searchParams.set('bounded', '1')
    searchUrl.searchParams.set('viewbox', `${lngNum - 0.001},${latNum - 0.001},${lngNum + 0.001},${latNum + 0.001}`) // ~100m bounding box
    searchUrl.searchParams.set('addressdetails', '1')
    searchUrl.searchParams.set('extratags', '1') // Get additional OSM tags for richer descriptions
    
    // Wait 1 second between requests (Nominatim rate limiting)
    await new Promise(resolve => setTimeout(resolve, 1000))

    const searchResponse = await fetch(searchUrl.toString(), {
      headers: {
        'User-Agent': 'PINIT-App/1.0 (Location-based pinning app)',
        'Accept': 'application/json'
      },
      next: { revalidate: 3600 }
    })

    console.log('📡 Nominatim POI search response status:', searchResponse.status)

    let nearbyPOIs: any[] = []
    if (searchResponse.ok) {
      const searchData = await searchResponse.json()
      nearbyPOIs = Array.isArray(searchData) ? searchData : []
      console.log(`📍 Found ${nearbyPOIs.length} nearby POIs from Nominatim`)
    } else {
      console.warn('⚠️ Nominatim POI search failed, continuing with reverse geocoding only')
    }

    // Extract address components and extra tags from reverse geocoding
    const address = reverseData.address || {}
    const extratags = reverseData.extratags || {}
    const placeName = reverseData.name || address.amenity || address.shop || address.tourism || address.leisure || address.road || address.suburb || address.city || 'Location'
    const placeType = reverseData.type || reverseData.class || 'place'
    
    // Build richer description from OSM tags and address components
    // IMPORTANT: Never use display_name (address) as description - only use meaningful tags
    const descriptionParts = []
    
    // Priority 1: Use OSM description tag if available (most informative)
    if (extratags.description && extratags.description.trim() && !extratags.description.includes(',')) {
      // Only use if it's not an address-like string (addresses contain commas)
      descriptionParts.push(extratags.description)
    }
    
    // Priority 2: Build description from category and context (but not if it's just "place")
    const category = address.amenity || address.shop || address.tourism || address.leisure
    if (category && category !== 'place' && category !== placeType) {
      // Capitalize first letter and make it readable
      const categoryName = category.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
      descriptionParts.push(categoryName)
    }
    
    // Priority 3: Add brand/operator if available (e.g., "McDonald's", "Woolworths")
    if (extratags.brand && extratags.brand.trim()) {
      descriptionParts.push(extratags.brand)
    } else if (extratags.operator && extratags.operator.trim()) {
      descriptionParts.push(extratags.operator)
    }
    
    // Priority 4: Add cuisine type for restaurants
    if (extratags.cuisine && extratags.cuisine.trim()) {
      descriptionParts.push(`${extratags.cuisine} cuisine`)
    }
    
    // Priority 5: Add opening hours if available
    if (extratags.opening_hours && extratags.opening_hours.trim()) {
      descriptionParts.push(`Open: ${extratags.opening_hours}`)
    }
    
    // DO NOT add location context (suburb/city) - that's address information, not description
    // DO NOT use display_name - that's the full address
    
    // Build final description - only if we have meaningful parts
    let description: string | undefined = undefined
    if (descriptionParts.length > 0) {
      // If we have OSM description tag, use it directly
      if (extratags.description && extratags.description.trim() && !extratags.description.includes(',')) {
        description = extratags.description
      } else {
        // Otherwise, combine meaningful parts
        description = descriptionParts.join(' • ')
      }
    }
    // If no meaningful description parts, leave as undefined (don't use address)

    // Process nearby POIs and calculate distances
    const poisWithDistance = nearbyPOIs
      .map((poi: any) => {
        const poiLat = parseFloat(poi.lat)
        const poiLng = parseFloat(poi.lon)
        
        if (isNaN(poiLat) || isNaN(poiLng)) return null
        
        // Calculate distance in meters
        const distance = calculateDistance(latNum, lngNum, poiLat, poiLng)
        if (isNaN(distance) || distance < 0) return null
        
        const poiAddress = poi.address || {}
        const poiExtratags = poi.extratags || {}
        const poiName = poi.display_name?.split(',')[0] || poi.name || poiAddress.amenity || poiAddress.shop || 'Unknown Place'
        const poiCategory = poiAddress.amenity || poiAddress.shop || poiAddress.tourism || poi.type
        
        // Build description for nearby POI
        const poiDescriptionParts = []
        if (poiExtratags.description) {
          poiDescriptionParts.push(poiExtratags.description)
        } else {
          if (poiCategory && poiCategory !== 'place') {
            const categoryName = poiCategory.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
            poiDescriptionParts.push(categoryName)
          }
          if (poiExtratags.brand) {
            poiDescriptionParts.push(poiExtratags.brand)
          } else if (poiExtratags.operator) {
            poiDescriptionParts.push(poiExtratags.operator)
          }
          if (poiExtratags.cuisine) {
            poiDescriptionParts.push(`${poiExtratags.cuisine} cuisine`)
          }
        }
        const poiDescription = poiDescriptionParts.length > 0 ? poiDescriptionParts.join(' • ') : undefined
        
        return {
          id: poi.place_id || poi.osm_id,
          name: poiName,
          display_name: poi.display_name,
          type: poi.type || poi.class,
          category: poiCategory,
          description: poiDescription,
          address: poiAddress,
          location: {
            lat: poiLat,
            lng: poiLng
          },
          distance: distance,
          source: 'nominatim'
        }
      })
      .filter((poi: any) => poi !== null)
      .sort((a: any, b: any) => a.distance - b.distance)
      .slice(0, parseInt(limit))

    // Return both reverse geocoding result and nearby POIs
    const result = {
      place: {
        id: reverseData.place_id || reverseData.osm_id,
        name: placeName,
        display_name: reverseData.display_name,
        type: placeType,
        category: address.amenity || address.shop || address.tourism || placeType,
        address: address,
        location: {
          lat: latNum,
          lng: lngNum
        },
        description: description,
        source: 'nominatim'
      },
      nearbyPOIs: poisWithDistance,
      status: "OK",
      source: "nominatim"
    }

    console.log(`✅ Nominatim: Found place "${placeName}" and ${poisWithDistance.length} nearby POIs`)

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
      }
    })

  } catch (error) {
    console.error('❌ Nominatim API GET error:', error)
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined
    })
    
    return NextResponse.json({
      place: null,
      nearbyPOIs: [],
      status: "ERROR",
      source: "nominatim",
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

