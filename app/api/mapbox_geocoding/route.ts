import { type NextRequest, NextResponse } from "next/server"

/**
 * Mapbox Geocoding API Route
 * Fetches place names and addresses for given coordinates (reverse geocoding)
 * Also supports forward geocoding (address to coordinates)
 */

const MAPBOX_GEOCODING_BASE = 'https://api.mapbox.com/geocoding/v5/mapbox.places'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get("lat")
  const lng = searchParams.get("lng")
  const query = searchParams.get("query") // For forward geocoding
  const types = searchParams.get("types") || "place" // Default to 'place' for reliable results

  console.log('📍 Mapbox Geocoding API GET - params:', { lat, lng, query, types })

  // Validate that we have either coordinates OR a query
  if (!lat && !lng && !query) {
    console.error('❌ Missing parameters: need either lat/lng OR query')
    return NextResponse.json({ 
      error: "Missing parameters: provide either lat/lng for reverse geocoding or query for forward geocoding" 
    }, { status: 400 })
  }

  const accessToken = process.env.NEXT_PUBLIC_MAPBOX_API_KEY

  if (!accessToken) {
    console.error('❌ Missing NEXT_PUBLIC_MAPBOX_API_KEY env var')
    return NextResponse.json({ error: 'Missing NEXT_PUBLIC_MAPBOX_API_KEY env var' }, { status: 500 })
  }

  try {
    let geocodingUrl: URL

    if (query) {
      // Forward geocoding: search for a place by name
      console.log('🔍 Forward geocoding query:', query)
      geocodingUrl = new URL(`${MAPBOX_GEOCODING_BASE}/${encodeURIComponent(query)}.json`)
    } else {
      // Reverse geocoding: get place name from coordinates
      const latNum = parseFloat(lat!)
      const lngNum = parseFloat(lng!)

      if (isNaN(latNum) || isNaN(lngNum)) {
        console.error('❌ Invalid coordinate values:', { lat, lng })
        return NextResponse.json({ error: "Invalid lat/lng values" }, { status: 400 })
      }

      if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
        console.error('❌ Coordinates out of valid range:', { latNum, lngNum })
        return NextResponse.json({ error: "Coordinates out of valid range" }, { status: 400 })
      }

      console.log('📍 Reverse geocoding coordinates:', { lat: latNum, lng: lngNum })
      geocodingUrl = new URL(`${MAPBOX_GEOCODING_BASE}/${lngNum},${latNum}.json`)
    }

    // Add query parameters
    geocodingUrl.searchParams.set('access_token', accessToken)
    
    // For reverse geocoding, handle multiple types by making separate calls if needed
    // For forward geocoding, we can use both 'types' and 'limit'
    let features: any[] = []
    
    if (query) {
      // Forward geocoding: can use multiple types and limit
      geocodingUrl.searchParams.set('types', types)
      geocodingUrl.searchParams.set('limit', '10')
      
      console.log('🔗 Mapbox Geocoding URL:', geocodingUrl.toString().replace(accessToken, 'TOKEN_HIDDEN'))

      const response = await fetch(geocodingUrl.toString(), {
        next: { revalidate: 3600 } // Cache for 1 hour
      })

      console.log('📡 Mapbox Geocoding response status:', response.status, response.statusText)

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`❌ Mapbox Geocoding API error: ${response.status}`, errorText.substring(0, 500))

        return NextResponse.json({
          error: 'Mapbox Geocoding API error',
          status: response.status,
          message: response.status === 401
            ? 'Mapbox authentication failed. Check API key.'
            : 'Mapbox Geocoding API error'
        }, { status: response.status })
      }

      const data = await response.json()
      console.log('📦 Mapbox Geocoding response data keys:', Object.keys(data))
      features = Array.isArray(data?.features) ? data.features : []
    } else {
      // Reverse geocoding: handle multiple types by making separate calls
      // Mapbox requires: "limit must be combined with a single type parameter when reverse geocoding"
      const typeList = types.split(',').map(t => t.trim())
      const allFeatures: any[] = []
      const seenIds = new Set<string>()
      
      // Make separate calls for each type and combine results
      for (const type of typeList) {
        const typeUrl = new URL(geocodingUrl.toString())
        typeUrl.searchParams.set('types', type)
        
        console.log(`🔗 Mapbox Geocoding URL (${type}):`, typeUrl.toString().replace(accessToken, 'TOKEN_HIDDEN'))

        try {
          const response = await fetch(typeUrl.toString(), {
            next: { revalidate: 3600 } // Cache for 1 hour
          })

          console.log(`📡 Mapbox Geocoding response status (${type}):`, response.status, response.statusText)

          if (response.ok) {
            const data = await response.json()
            const typeFeatures = Array.isArray(data?.features) ? data.features : []
            
            // Add features, avoiding duplicates by ID
            for (const feature of typeFeatures) {
              if (feature.id && !seenIds.has(feature.id)) {
                allFeatures.push(feature)
                seenIds.add(feature.id)
              }
            }
            
            console.log(`📦 Found ${typeFeatures.length} features for type ${type} (${allFeatures.length} total unique)`)
          } else {
            const errorText = await response.text()
            console.warn(`⚠️ Mapbox Geocoding API error for type ${type}: ${response.status}`, errorText.substring(0, 200))
          }
        } catch (error) {
          console.warn(`⚠️ Error fetching type ${type}:`, error)
        }
      }
      
      features = allFeatures
    }

    console.log('📦 Total features count:', features.length)

    if (features.length === 0) {
      console.log('📍 No places found for this location')
      return NextResponse.json({
        places: [],
        status: "OK",
        source: "mapbox",
        message: "No places found for this location"
      })
    }

    // Transform Mapbox response to our standard format
    const places = features.map((feature: any) => {
      const coordinates = feature.geometry?.coordinates || []
      const properties = feature.properties || {}
      const context = feature.context || []

      // Extract place type and category
      const placeType = feature.place_type?.[0] || 'place'
      
      // Extract address components from context
      let street = ''
      let neighborhood = ''
      let city = ''
      let region = ''
      let country = ''

      context.forEach((ctx: any) => {
        if (ctx.id.startsWith('address')) street = ctx.text
        if (ctx.id.startsWith('neighborhood')) neighborhood = ctx.text
        if (ctx.id.startsWith('place')) city = ctx.text
        if (ctx.id.startsWith('region')) region = ctx.text
        if (ctx.id.startsWith('country')) country = ctx.text
      })
      
      // If no street from context, try to extract from place_name or address property
      if (!street && properties.address) {
        street = properties.address
      }

      return {
        id: feature.id,
        name: feature.text || feature.place_name || 'Unknown Place',
        place_name: feature.place_name,
        place_type: placeType,
        address: properties.address || '',
        category: properties.category || placeType,
        location: {
          lat: coordinates[1],
          lng: coordinates[0]
        },
        context: {
          street,
          neighborhood,
          city,
          region,
          country
        },
        relevance: feature.relevance || 1,
        source: 'mapbox'
      }
    })

    console.log(`✅ Mapbox Geocoding: Returning ${places.length} places`)
    console.log(`✅ First place:`, places[0]?.name)

    return NextResponse.json({
      places: places,
      status: "OK",
      source: "mapbox",
      query: query || `${lng},${lat}`
    })
  } catch (error) {
    console.error('❌ Mapbox Geocoding API GET error:', error)
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined
    })

    return NextResponse.json({
      places: [],
      status: "ERROR",
      source: "mapbox",
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

