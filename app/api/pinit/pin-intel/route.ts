/**
 * PINIT Pin Intelligence Gateway
 * 
 * Single endpoint for location enrichment:
 * - Mapbox reverse geocoding
 * - Mapbox POI lookup
 * 
 * Features:
 * - Rate limiting (5 req/min burst, 60/hour)
 * - Caching (6h geocode, 2h POI)
 * - Idempotency (60s window)
 */

import { NextRequest, NextResponse } from 'next/server'
import { LRUCache } from '@/lib/lru'
import { coarseKey } from '@/lib/geohash'
import { checkIdempotency, storeIdempotency } from '@/lib/idempotency'
import { redisGet, redisSet, isRedisConfigured } from '@/lib/redis'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Environment variables
const MAPBOX_API_KEY = process.env.NEXT_PUBLIC_MAPBOX_API_KEY

// Cache instances
const geocodeCache = new LRUCache<any>(500)
const poiCache = new LRUCache<any>(500)

// Rate limiting
interface RateLimitEntry {
  minuteCount: number
  hourCount: number
  minuteReset: number
  hourReset: number
}

const rateLimits = new Map<string, RateLimitEntry>()

// TTLs in milliseconds
const GEOCODE_TTL = 6 * 60 * 60 * 1000 // 6 hours
const POI_TTL = 2 * 60 * 60 * 1000 // 2 hours

/**
 * Extract client IP from request
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (realIP) {
    return realIP
  }
  
  return 'unknown'
}

/**
 * Check and update rate limits
 * @returns true if allowed, false if rate limited
 */
function checkRateLimit(ip: string): { allowed: boolean; minuteRemaining: number; hourRemaining: number } {
  const now = Date.now()
  const entry = rateLimits.get(ip)
  
  if (!entry) {
    // First request from this IP
    rateLimits.set(ip, {
      minuteCount: 1,
      hourCount: 1,
      minuteReset: now + 60000, // 1 minute
      hourReset: now + 3600000 // 1 hour
    })
    return { allowed: true, minuteRemaining: 4, hourRemaining: 59 }
  }
  
  // Reset counters if windows expired
  if (now > entry.minuteReset) {
    entry.minuteCount = 0
    entry.minuteReset = now + 60000
  }
  
  if (now > entry.hourReset) {
    entry.hourCount = 0
    entry.hourReset = now + 3600000
  }
  
  // Check limits: 5 req/min, 60 req/hour
  if (entry.minuteCount >= 5) {
    return { allowed: false, minuteRemaining: 0, hourRemaining: 60 - entry.hourCount }
  }
  
  if (entry.hourCount >= 60) {
    return { allowed: false, minuteRemaining: 5 - entry.minuteCount, hourRemaining: 0 }
  }
  
  // Increment counters
  entry.minuteCount++
  entry.hourCount++
  
  return {
    allowed: true,
    minuteRemaining: 5 - entry.minuteCount,
    hourRemaining: 60 - entry.hourCount
  }
}

/**
 * Fetch with timeout and retry
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = 8000, retries: number = 1): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    })
    clearTimeout(timeout)
    return response
  } catch (error) {
    clearTimeout(timeout)
    
    // Retry on network errors only
    if (retries > 0 && (error instanceof Error && error.name === 'AbortError')) {
      console.log(`⚠️ Request timeout, retrying... (${retries} retries left)`)
      await new Promise(resolve => setTimeout(resolve, 1000))
      return fetchWithTimeout(url, options, timeoutMs, retries - 1)
    }
    
    throw error
  }
}

/**
 * Call Mapbox Geocoding API for reverse geocoding (get place name)
 */
async function reverseGeocode(lat: number, lng: number): Promise<{ 
  formatted: string
  components: Record<string, string> | null
  place_type?: string[]
  feature_name?: string
}> {
  if (!MAPBOX_API_KEY) {
    throw new Error('Mapbox API key not configured')
  }
  
  try {
    // Use Mapbox Geocoding API for reverse geocoding
    // Request both address and place types for best results
    const mapboxUrl = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json`)
    mapboxUrl.searchParams.set('access_token', MAPBOX_API_KEY)
    mapboxUrl.searchParams.set('types', 'address,place')
    mapboxUrl.searchParams.set('limit', '5')
    
    const response = await fetchWithTimeout(mapboxUrl.toString())
    
    if (!response.ok) {
      throw new Error(`Mapbox Geocoding API error: ${response.status}`)
    }
    
    const data = await response.json()
    const features = data.features || []
    
    if (features.length === 0) {
      // Return coordinate-based fallback
      return {
        formatted: `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
        components: null
      }
    }
    
    // Find best result: prefer address (has street name), then place (city/town)
    const addressResult = features.find((f: any) => {
      const types = Array.isArray(f.place_type) ? f.place_type : [f.place_type]
      return types.includes('address')
    })
    const placeResult = features.find((f: any) => {
      const types = Array.isArray(f.place_type) ? f.place_type : [f.place_type]
      return types.includes('place')
    })
    const bestFeature = addressResult || placeResult || features[0]
    
    // Extract place_type for diagnostics
    const placeType = Array.isArray(bestFeature.place_type) ? bestFeature.place_type : [bestFeature.place_type]
    const featureName = bestFeature.text || bestFeature.place_name?.split(',')[0] || ''
    
    // Extract address components from context
    const context = bestFeature.context || []
    let street = ''
    let city = ''
    let neighborhood = ''
    
    context.forEach((ctx: any) => {
      if (ctx.id?.startsWith('address')) street = ctx.text || ''
      if (ctx.id?.startsWith('place')) city = ctx.text || ''
      if (ctx.id?.startsWith('neighborhood')) neighborhood = ctx.text || ''
    })
    
    // Extract place name
    const placeName = bestFeature.text || bestFeature.place_name?.split(',')[0] || ''
    
    // Build formatted address: "Street, City" or "Place Name, City"
    let formatted = ''
    if (street && city) {
      formatted = `${street}, ${city}`
    } else if (street && neighborhood) {
      formatted = `${street}, ${neighborhood}`
    } else if (placeName && city) {
      formatted = `${placeName}, ${city}`
    } else if (bestFeature.place_name) {
      // Use full place_name as fallback
      formatted = bestFeature.place_name.split(',')[0] + (bestFeature.place_name.includes(',') ? `, ${bestFeature.place_name.split(',')[1]?.trim() || ''}` : '')
    } else if (placeName) {
      formatted = placeName
    } else {
      formatted = `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`
    }
    
    return {
      formatted: formatted.trim(),
      components: {
        name: placeName || city || '',
        address: street || bestFeature.properties?.address || '',
        category: bestFeature.properties?.category || bestFeature.place_type?.[0] || ''
      },
      place_type: placeType,
      feature_name: featureName
    }
  } catch (error) {
    console.error('❌ Mapbox geocoding error:', error)
    
    // Return coordinate-based fallback on error
    return {
      formatted: `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
      components: null
    }
  }
}

/**
 * Call Mapbox Geocoding API for nearby POIs
 */
async function fetchNearbyPlaces(lat: number, lng: number): Promise<Array<{
  id: string
  name?: string
  categories?: string[]
  distance_m?: number
  lat: number
  lng: number
}>> {
  if (!MAPBOX_API_KEY) {
    throw new Error('Mapbox API key not configured')
  }
  
  try {
    // Use Mapbox Geocoding API to find nearby POIs
    // Strategy: Use reverse geocoding with POI type and bbox (bounding box) for better results
    // Calculate bounding box for ~5km radius around the location
    const radiusKm = 5
    const radiusDegrees = radiusKm / 111 // Approximate: 1 degree ≈ 111km
    const bbox = `${lng - radiusDegrees},${lat - radiusDegrees},${lng + radiusDegrees},${lat + radiusDegrees}`
    
    // Try reverse geocoding with POI type first (most efficient)
    const mapboxUrl = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json`)
    mapboxUrl.searchParams.set('access_token', MAPBOX_API_KEY)
    mapboxUrl.searchParams.set('types', 'poi')
    mapboxUrl.searchParams.set('limit', '20')
    mapboxUrl.searchParams.set('proximity', `${lng},${lat}`)
    
    const response = await fetchWithTimeout(mapboxUrl.toString())
    
    if (!response.ok) {
      throw new Error(`Mapbox Geocoding API error: ${response.status}`)
    }
    
    const data = await response.json()
    let features = data.features || []
    
    // If we got few results, try a broader search with common POI terms
    if (features.length < 5) {
      console.log(`📍 Only found ${features.length} POIs, trying broader search...`)
      
      // Try searching for common POI types with proximity
      const commonTerms = ['restaurant', 'cafe', 'museum']
      const seenIds = new Set(features.map((f: any) => f.id).filter(Boolean))
      
      for (const term of commonTerms) {
        try {
          const searchUrl = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(term)}.json`)
          searchUrl.searchParams.set('access_token', MAPBOX_API_KEY)
          searchUrl.searchParams.set('types', 'poi')
          searchUrl.searchParams.set('limit', '10')
          searchUrl.searchParams.set('proximity', `${lng},${lat}`)
          
          const searchResponse = await fetchWithTimeout(searchUrl.toString(), {}, 3000, 0)
          
          if (searchResponse.ok) {
            const searchData = await searchResponse.json()
            const searchFeatures = searchData.features || []
            
            // Add features within 5km that we haven't seen
            for (const feature of searchFeatures) {
              if (feature.id && !seenIds.has(feature.id)) {
                const coords = feature.geometry?.coordinates || []
                if (coords.length >= 2) {
                  const placeLng = coords[0]
                  const placeLat = coords[1]
                  
                  // Quick distance check (rough approximation)
                  const latDiff = Math.abs(placeLat - lat)
                  const lngDiff = Math.abs(placeLng - lng)
                  const distanceKm = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111
                  
                  if (distanceKm <= 5) {
                    seenIds.add(feature.id)
                    features.push(feature)
                  }
                }
              }
            }
          }
        } catch (error) {
          // Continue with next term
          console.warn(`⚠️ Error searching for "${term}":`, error)
        }
      }
    }
    
    if (features.length === 0) {
      console.log('📍 No POIs found via Mapbox search')
      return []
    }
    
    // Calculate distance from center point to each place
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      const R = 6371000 // Earth radius in meters
      const toRad = (deg: number) => (deg * Math.PI) / 180
      const dLat = toRad(lat2 - lat1)
      const dLng = toRad(lon2 - lon1)
      const lat1Rad = toRad(lat1)
      const lat2Rad = toRad(lat2)
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1Rad) * Math.cos(lat2Rad) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      return R * c
    }
    
    // Filter to only travel-related places (restaurants, cafes, museums, galleries, tourism, monuments)
    // Mapbox POI categories are in properties.category
    const travelCategories = [
      // Food & Dining
      'restaurant', 'cafe', 'coffee', 'food', 'dining', 'catering', 'bistro', 'bakery', 'bar', 'pub',
      // Cultural & Historical
      'museum', 'art_gallery', 'gallery', 'art', 'cultural', 'historical', 'history',
      'monument', 'memorial', 'landmark', 'historic', 'heritage', 'castle', 'palace', 'fort',
      // Tourism & Attractions
      'tourism', 'tourist', 'attraction', 'sightseeing', 'viewpoint', 'lookout', 'observation',
      // Entertainment & Venues
      'theater', 'cinema', 'entertainment', 'venue', 'concert', 'music', 'festival',
      // Nature & Outdoor
      'park', 'garden', 'beach', 'nature', 'outdoor', 'hiking', 'trail', 'waterfall', 'cave',
      // Accommodation
      'hotel', 'lodging', 'accommodation', 'hostel', 'resort',
      // Religious Sites
      'place_of_worship', 'church', 'temple', 'mosque', 'synagogue', 'cathedral', 'basilica',
      // Shopping (travel-related only)
      'souvenir', 'market', 'bazaar'
    ]
    
    const excludeCategories = [
      'supermarket', 'grocery', 'convenience', 'store', 'shop',
      'gas_station', 'fuel', 'petrol', 'gas',
      'bank', 'atm', 'financial',
      'pharmacy', 'drugstore',
      'post_office', 'postal',
      'car_rental', 'car_dealer', 'automotive',
      'hardware', 'home_garden', 'furniture'
    ]
    
    return features
      .map((feature: any) => {
        const coordinates = feature.geometry?.coordinates || []
        const placeLng = coordinates[0]
        const placeLat = coordinates[1]
        
        if (!placeLat || !placeLng) {
          return null
        }
        
        const distance = calculateDistance(lat, lng, placeLat, placeLng)
        
        // Filter to within 5km
        if (distance > 5000) {
          return null
        }
        
        const category = feature.properties?.category || ''
        const categoryStr = category.toLowerCase()
        
        // Check if place matches travel categories
        const isTravelRelated = travelCategories.some(cat => categoryStr.includes(cat))
        // Check if place should be excluded
        const shouldExclude = excludeCategories.some(cat => categoryStr.includes(cat))
        
        if (!isTravelRelated || shouldExclude) {
          return null // Filter out non-travel places
        }
        
        return {
          id: feature.id || `place-${Math.random().toString(36).substr(2, 9)}`,
          name: feature.text || feature.properties?.name || '',
          categories: category ? [category] : [],
          distance_m: Math.round(distance),
          lat: placeLat,
          lng: placeLng
        }
      })
      .filter((place: any) => place !== null) // Remove filtered out places
      .sort((a: any, b: any) => (a.distance_m || 0) - (b.distance_m || 0)) // Sort by distance
  } catch (error) {
    console.error('❌ Mapbox places error:', error)
    throw error
  }
}


/**
 * Main POST handler
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Parse request body
    const body = await request.json()
    const { lat, lng, precision = 5 } = body
    
    // Validate input
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return NextResponse.json(
        { error: 'Invalid input: lat and lng must be numbers' },
        { status: 400 }
      )
    }
    
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json(
        { error: 'Invalid coordinates: out of range' },
        { status: 400 }
      )
    }
    
    // Check idempotency
    const idempotencyKey = request.headers.get('x-idempotency-key')
    if (idempotencyKey) {
      const cachedResponse = checkIdempotency(idempotencyKey)
      if (cachedResponse) {
        console.log(`🔑 Returning cached response for idempotency key: ${idempotencyKey}`)
        return NextResponse.json(cachedResponse)
      }
    }
    
    // Check rate limits
    const clientIP = getClientIP(request)
    const rateLimit = checkRateLimit(clientIP)
    
    if (!rateLimit.allowed) {
      console.log(`⛔ Rate limit exceeded for IP: ${clientIP}`)
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      )
    }
    
    // Generate cache keys
    const geocodeKey = `mapbox-geocode:${coarseKey(lat, lng, precision)}`
    const poiKey = `mapbox-places:${coarseKey(lat, lng, precision)}`
    
    // ============================================
    // POI-FIRST APPROACH: Search POIs FIRST
    // ============================================
    
    // Try to get POI from cache
    let poiData: any = null
    let poiCached = false
    
    if (isRedisConfigured) {
      poiData = await redisGet(poiKey)
      if (poiData) {
        poiCached = true
        console.log(`✅ POI cache hit (Redis): ${poiKey}`)
      }
    }
    
    if (!poiData) {
      poiData = poiCache.get(poiKey)
      if (poiData) {
        poiCached = true
        console.log(`✅ POI cache hit (Memory): ${poiKey}`)
      }
    }
    
    // Fetch POIs FIRST (POI-first approach)
    if (!poiData) {
      console.log(`🏪 [POI-FIRST] Fetching POIs from Mapbox...`)
      try {
        const fetchedPOIs = await fetchNearbyPlaces(lat, lng)
        
        // Store in cache
        poiCache.set(poiKey, fetchedPOIs, POI_TTL)
        if (isRedisConfigured) {
          await redisSet(poiKey, fetchedPOIs, Math.floor(POI_TTL / 1000))
        }
        
        console.log(`✅ POI fetched and cached: ${fetchedPOIs.length} places`)
        poiData = fetchedPOIs
      } catch (error) {
        console.error('❌ POI fetch failed:', error)
        poiData = [] // Empty array on failure
      }
    }
    
    // Choose best POI: distance <= 200m (or 300m in rural areas)
    // Detect rural: if we have fewer than 3 POIs within 1km, consider it rural
    const nearbyPOIs = poiData?.filter((poi: any) => poi.distance_m && poi.distance_m <= 1000) || []
    const isRural = nearbyPOIs.length < 3
    const maxDistance = isRural ? 300 : 200
    
    let bestPOI: any = null
    let usePOIForMetadata = false
    
    if (poiData && poiData.length > 0) {
      // Find best POI (closest travel-related place within maxDistance)
      bestPOI = poiData.find((poi: any) => poi.distance_m && poi.distance_m <= maxDistance) || poiData[0]
      
      // Use POI if it's within the distance threshold
      if (bestPOI && bestPOI.distance_m && bestPOI.distance_m <= maxDistance) {
        usePOIForMetadata = true
        console.log(`📍 [POI-FIRST] Using POI for metadata: ${bestPOI.name} (${bestPOI.distance_m}m away, ${isRural ? 'rural' : 'urban'} area)`)
      } else {
        console.log(`📍 [POI-FIRST] No POI within ${maxDistance}m threshold, will use reverse geocode fallback`)
      }
    }
    
    // ============================================
    // REVERSE GEOCODE: For fallback or locality
    // ============================================
    
    // Try to get from cache (Redis first, then in-memory)
    let geocodeData: any = null
    let geocodeCached = false
    
    if (isRedisConfigured) {
      geocodeData = await redisGet(geocodeKey)
      if (geocodeData) {
        geocodeCached = true
        console.log(`✅ Geocode cache hit (Redis): ${geocodeKey}`)
      }
    }
    
    if (!geocodeData) {
      geocodeData = geocodeCache.get(geocodeKey)
      if (geocodeData) {
        geocodeCached = true
        console.log(`✅ Geocode cache hit (Memory): ${geocodeKey}`)
      }
    }
    
    // Fetch geocode if not cached (needed for locality fallback or when no POI found)
    if (!geocodeData) {
      console.log(`🌍 Fetching geocode from Mapbox...`)
      try {
        geocodeData = await reverseGeocode(lat, lng)
        
        // Store in cache
        geocodeCache.set(geocodeKey, geocodeData, GEOCODE_TTL)
        if (isRedisConfigured) {
          await redisSet(geocodeKey, geocodeData, Math.floor(GEOCODE_TTL / 1000))
        }
        
        console.log(`✅ Geocode fetched and cached: ${geocodeData.formatted}`)
      } catch (error) {
        console.error('❌ Geocode failed:', error)
        // Use fallback
        geocodeData = {
          formatted: `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
          components: null
        }
      }
    }
    
    // Extract locality from geocode for Wikimedia fallback
    const locality = geocodeData.components?.city || 
                     geocodeData.components?.town || 
                     geocodeData.components?.neighbourhood ||
                     geocodeData.components?.suburb ||
                     geocodeData.feature_name?.split(',')[1]?.trim() ||
                     ''
    
    // Build response (keeping same shape for compatibility)
    // If we found a good POI, use it for title/category/Wikimedia search
    let finalGeocode = geocodeData
    let wikimediaSearchTerm = ''
    
    if (usePOIForMetadata && bestPOI) {
      // Use POI for metadata
      finalGeocode = {
        ...geocodeData,
        components: {
          ...geocodeData.components,
          name: bestPOI.name || geocodeData.components?.name || '',
          category: bestPOI.categories?.[0] || geocodeData.components?.category || '',
          poi_name: bestPOI.name,
          poi_distance_m: bestPOI.distance_m
        }
      }
      // Use POI name + locality for Wikimedia search
      wikimediaSearchTerm = bestPOI.name + (locality ? `, ${locality}` : '')
      console.log(`✅ [POI-FIRST] Using POI "${bestPOI.name}" for title/category/Wikimedia search`)
    } else {
      // No POI found or too far - use locality for Wikimedia
      wikimediaSearchTerm = locality || geocodeData.feature_name || geocodeData.components?.name || ''
      console.log(`✅ [POI-FIRST] No suitable POI, using locality "${wikimediaSearchTerm}" for Wikimedia search`)
    }
    
    const response = {
      meta: {
        source: {
          geocode: 'mapbox',
          places: 'mapbox'
        },
        cached: {
          geocode: geocodeCached,
          places: poiCached
        },
        ...(idempotencyKey ? { idempotencyKey } : {}),
        rate: {
          minuteRemaining: rateLimit.minuteRemaining,
          hourRemaining: rateLimit.hourRemaining
        },
        duration_ms: Date.now() - startTime,
        // Debug info for diagnostics
        debug: {
          reverse_geocode_result: {
            place_type: geocodeData.place_type || [],
            name: geocodeData.feature_name || geocodeData.components?.name || ''
          },
          poi_candidates: poiData?.slice(0, 5).map((poi: any) => ({
            name: poi.name,
            distance_m: poi.distance_m
          })) || [],
          chosen_poi: bestPOI && usePOIForMetadata ? {
            name: bestPOI.name,
            distance_m: bestPOI.distance_m
          } : null,
          wikimedia_search_term: wikimediaSearchTerm
        }
      },
      geocode: finalGeocode,
      places: poiData,
      // Add POI metadata if we're using a POI (for easier UI access)
      ...(usePOIForMetadata && bestPOI ? {
        poi_metadata: {
          name: bestPOI.name,
          category: bestPOI.categories?.[0] || bestPOI.category,
          distance_m: bestPOI.distance_m,
          id: bestPOI.id
        }
      } : {})
    }
    
    // Store for idempotency if key provided
    if (idempotencyKey) {
      storeIdempotency(idempotencyKey, response)
    }
    
    console.log(`✅ Pin intel request completed in ${Date.now() - startTime}ms`)
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('❌ Pin intel error:', error)
    
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'External service error' },
      { status: 502 }
    )
  }
}

/**
 * GET handler (for testing)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lat = parseFloat(searchParams.get('lat') || '0')
  const lng = parseFloat(searchParams.get('lng') || '0')
  const precision = parseInt(searchParams.get('precision') || '5')
  
  if (!lat || !lng) {
    return NextResponse.json(
      { error: 'Missing lat or lng parameter' },
      { status: 400 }
    )
  }
  
  // Create a mock POST request
  const mockRequest = new Request(request.url, {
    method: 'POST',
    headers: request.headers,
    body: JSON.stringify({ lat, lng, precision })
  })
  
  return POST(mockRequest as any)
}

