import { type NextRequest, NextResponse } from "next/server"

/**
 * TomTom Search API Route
 * Finds nearby POIs (Points of Interest) using TomTom Search API
 * Replaces Mapbox Search API
 */

const TOMTOM_SEARCH_BASE = 'https://api.tomtom.com/search/2/nearbySearch/.json'

// In-memory cache to prevent duplicate requests
const searchCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 3600000 // 1 hour

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get("lat")
  const lng = searchParams.get("lng")
  const radius = searchParams.get("radius") || "200" // Default 200m
  const limit = searchParams.get("limit") || "20"
  const categories = searchParams.get("categories") || "restaurant,cafe,monument,museum,art_gallery,place_of_worship,tourism"

  console.log('🔍 TomTom Search API GET - params:', { lat, lng, radius, limit, categories })

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

  const accessToken = process.env.NEXT_PUBLIC_TOMTOM_API_KEY
  if (!accessToken) {
    console.error('❌ Missing NEXT_PUBLIC_TOMTOM_API_KEY env var')
    return NextResponse.json({ error: 'Missing NEXT_PUBLIC_TOMTOM_API_KEY env var' }, { status: 500 })
  }

  // Check cache first (prevent duplicate requests)
  const cacheKey = `${latNum.toFixed(6)},${lngNum.toFixed(6)},${radius},${limit}`
  const cached = searchCache.get(cacheKey)
  const now = Date.now()
  
  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    console.log('✅ Using cached TomTom Search result')
    return NextResponse.json(cached.data, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        'X-Cache': 'HIT'
      }
    })
  }

  try {
    // TomTom Search API: nearby search
    // TomTom uses categorySetIds for POI categories
    // Common categorySetIds: 7315 (restaurant), 7314 (cafe), 7317 (museum), etc.
    const categorySetIds = mapCategoriesToTomTomIds(categories)
    
    const searchUrl = new URL(TOMTOM_SEARCH_BASE)
    searchUrl.searchParams.set('lat', latNum.toString())
    searchUrl.searchParams.set('lon', lngNum.toString())
    searchUrl.searchParams.set('radius', (parseInt(radius) * 10).toString()) // TomTom uses decimeters, convert meters to decimeters
    searchUrl.searchParams.set('limit', limit)
    if (categorySetIds.length > 0) {
      searchUrl.searchParams.set('categorySet', categorySetIds.join(','))
    }
    searchUrl.searchParams.set('key', accessToken)

    console.log('🔗 TomTom Search URL:', searchUrl.toString().replace(accessToken, 'TOKEN_HIDDEN'))

    const response = await fetch(searchUrl.toString(), {
      next: { revalidate: 3600 } // Cache for 1 hour
    })

    console.log('📡 TomTom Search response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ TomTom Search API error: ${response.status}`, errorText.substring(0, 500))
      
      return NextResponse.json({
        pois: [],
        status: "ERROR",
        source: "tomtom",
        error: `TomTom Search API error: ${response.status}`
      }, { status: response.status })
    }

    const data = await response.json()
    
    // Transform TomTom Search response to our POI format
    const results = data.results || []
    const pois = results.map((result: any) => {
      const position = result.position || {}
      const poiLat = position.lat
      const poiLng = position.lon
      const distance = calculateDistance(latNum, lngNum, poiLat, poiLng)
      
      // Extract category from POI data
      const category = result.poi?.categorySet?.[0]?.id?.toString() || result.poi?.categories?.[0] || 'place'
      const categoryName = result.poi?.categorySet?.[0]?.name || result.poi?.categories?.[0] || 'place'
      
      // Extract address components
      const address = result.address || {}
      
      return {
        id: result.id || `${poiLat},${poiLng}`,
        name: result.poi?.name || result.address?.freeformAddress || 'Unknown Place',
        category: mapTomTomCategoryToGeneric(categoryName),
        description: result.poi?.phone || result.address?.freeformAddress || undefined,
        location: {
          lat: poiLat,
          lng: poiLng
        },
        address: address.freeformAddress || '',
        city: address.municipality || address.municipalitySubdivision || '',
        region: address.countrySubdivision || '',
        country: address.country || '',
        distance: distance,
        source: 'tomtom'
      }
    }).sort((a: any, b: any) => a.distance - b.distance) // Sort by distance

    const result = {
      pois: pois,
      status: "OK",
      source: "tomtom",
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

    console.log(`✅ TomTom Search: Returning ${pois.length} POIs`)

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        'X-Cache': 'MISS'
      }
    })
  } catch (error) {
    console.error('❌ TomTom Search API GET error:', error)
    return NextResponse.json({
      pois: [],
      status: "ERROR",
      source: "tomtom",
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

// Helper function to map category names to TomTom categorySetIds
function mapCategoriesToTomTomIds(categories: string): string[] {
  const categoryMap: Record<string, string> = {
    'restaurant': '7315',
    'cafe': '7314',
    'museum': '7317',
    'art_gallery': '7318',
    'place_of_worship': '7313',
    'tourism': '7376',
    'monument': '7376' // Tourism category for monuments
  }
  
  const categoryList = categories.split(',').map(c => c.trim())
  const ids: string[] = []
  
  categoryList.forEach(cat => {
    const id = categoryMap[cat.toLowerCase()]
    if (id && !ids.includes(id)) {
      ids.push(id)
    }
  })
  
  return ids
}

// Helper function to map TomTom category names to generic category names
function mapTomTomCategoryToGeneric(tomtomCategory: string): string {
  const categoryMap: Record<string, string> = {
    'Restaurant': 'restaurant',
    'Cafe': 'cafe',
    'Museum': 'museum',
    'Art Gallery': 'art_gallery',
    'Place of Worship': 'place_of_worship',
    'Tourism': 'tourism',
    'Monument': 'monument'
  }
  
  return categoryMap[tomtomCategory] || tomtomCategory.toLowerCase().replace(/\s+/g, '_')
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

