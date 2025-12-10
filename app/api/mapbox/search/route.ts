import { type NextRequest, NextResponse } from "next/server"

/**
 * Mapbox Search API Route
 * Finds nearby POIs (Points of Interest) using Mapbox Search API
 * Replaces Overpass/Nominatim for POI data
 */

const MAPBOX_SEARCH_BASE = 'https://api.mapbox.com/search/searchbox/v1/nearby'

// In-memory cache to prevent duplicate requests
const searchCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 3600000 // 1 hour

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get("lat")
  const lng = searchParams.get("lng")
  const radius = searchParams.get("radius") || "200" // Default 200m
  const limit = searchParams.get("limit") || "20"
  const categories = searchParams.get("categories") || "restaurant,hotel,shop,tourism,leisure"

  console.log('🔍 Mapbox Search API GET - params:', { lat, lng, radius, limit, categories })

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
  const cacheKey = `${latNum.toFixed(6)},${lngNum.toFixed(6)},${radius},${limit}`
  const cached = searchCache.get(cacheKey)
  const now = Date.now()
  
  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    console.log('✅ Using cached Mapbox Search result')
    return NextResponse.json(cached.data, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        'X-Cache': 'HIT'
      }
    })
  }

  try {
    // Mapbox Search API: nearby search
    const searchUrl = new URL(MAPBOX_SEARCH_BASE)
    searchUrl.searchParams.set('proximity', `${lngNum},${latNum}`)
    searchUrl.searchParams.set('radius', radius)
    searchUrl.searchParams.set('limit', limit)
    searchUrl.searchParams.set('categories', categories)
    searchUrl.searchParams.set('access_token', accessToken)

    console.log('🔗 Mapbox Search URL:', searchUrl.toString().replace(accessToken, 'TOKEN_HIDDEN'))

    const response = await fetch(searchUrl.toString(), {
      next: { revalidate: 3600 } // Cache for 1 hour
    })

    console.log('📡 Mapbox Search response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Mapbox Search API error: ${response.status}`, errorText.substring(0, 500))
      
      return NextResponse.json({
        pois: [],
        status: "ERROR",
        source: "mapbox",
        error: `Mapbox Search API error: ${response.status}`
      }, { status: response.status })
    }

    const data = await response.json()
    
    // Transform Mapbox Search response to our POI format
    const features = data.features || []
    const pois = features.map((feature: any) => {
      const coordinates = feature.geometry?.coordinates || []
      const properties = feature.properties || {}
      const context = feature.context || []
      
      // Calculate distance from search point
      const poiLat = coordinates[1]
      const poiLng = coordinates[0]
      const distance = calculateDistance(latNum, lngNum, poiLat, poiLng)
      
      // Extract category from properties
      const category = properties.category?.[0] || properties.poi_category?.[0] || 'place'
      
      // Extract address components
      let address = ''
      let city = ''
      let region = ''
      let country = ''
      
      context.forEach((ctx: any) => {
        if (ctx.id.startsWith('address')) address = ctx.text
        if (ctx.id.startsWith('place')) city = ctx.text
        if (ctx.id.startsWith('region')) region = ctx.text
        if (ctx.id.startsWith('country')) country = ctx.text
      })

      return {
        id: feature.id,
        name: feature.properties?.name || feature.text || 'Unknown Place',
        category: category,
        description: properties.description || properties.full_address || undefined,
        location: {
          lat: poiLat,
          lng: poiLng
        },
        address: address || properties.full_address || '',
        city: city,
        region: region,
        country: country,
        distance: distance,
        source: 'mapbox'
      }
    }).sort((a: any, b: any) => a.distance - b.distance) // Sort by distance

    const result = {
      pois: pois,
      status: "OK",
      source: "mapbox",
      count: pois.length
    }

    // Cache the result
    searchCache.set(cacheKey, { data: result, timestamp: now })
    
    // Clean up old cache entries (keep last 100)
    if (searchCache.size > 100) {
      const entries = Array.from(searchCache.entries())
      entries.sort((a, b) => b[1].timestamp - a[1].timestamp)
      searchCache.clear()
      entries.slice(0, 100).forEach(([key, value]) => searchCache.set(key, value))
    }

    console.log(`✅ Mapbox Search: Returning ${pois.length} POIs`)

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        'X-Cache': 'MISS'
      }
    })
  } catch (error) {
    console.error('❌ Mapbox Search API GET error:', error)
    return NextResponse.json({
      pois: [],
      status: "ERROR",
      source: "mapbox",
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

