/**
 * PINIT Pin Intelligence Gateway
 * 
 * Single endpoint for location enrichment:
 * - OpenCage reverse geocoding
 * - Geoapify POI lookup
 * - Optional Mapillary imagery
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
const OPENCAGE_KEY = process.env.OPENCAGE_KEY
const GEOAPIFY_KEY = process.env.GEOAPIFY_KEY
const MAPILLARY_TOKEN = process.env.MAPILLARY_TOKEN

// Cache instances
const geocodeCache = new LRUCache<any>(500)
const poiCache = new LRUCache<any>(500)
const imageryCache = new LRUCache<any>(200)

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
const IMAGERY_TTL = 24 * 60 * 60 * 1000 // 24 hours

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
 * Call Foursquare Places API for reverse geocoding (get place name)
 */
async function reverseGeocode(lat: number, lng: number): Promise<{ formatted: string; components: Record<string, string> | null }> {
  const foursquareServiceKey = process.env.FSQ_PLACES_SERVICE_KEY || process.env.FOURSQUARE_API_KEY || process.env.NEXT_PUBLIC_FOURSQUARE_API_KEY
  
  if (!foursquareServiceKey) {
    throw new Error('Foursquare API key not configured')
  }
  
  // Use internal Foursquare Places API endpoint
  const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL 
    ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` 
    : process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000'
  
  const url = `${baseUrl}/api/foursquare-places?lat=${lat}&lng=${lng}&radius=50&limit=1`
  
  try {
    const response = await fetchWithTimeout(url)
    
    if (!response.ok) {
      throw new Error(`Foursquare API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (!data.items || data.items.length === 0) {
      // Return coordinate-based fallback
      return {
        formatted: `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
        components: null
      }
    }
    
    const place = data.items[0]
    const placeName = place.title || place.name || ""
    const address = place.address || place.location?.address || ""
    
    // Format as "Street Name, Town" - extract street and locality from address
    // Foursquare address format is typically: "Street Number Street Name, Locality, City, Country"
    // We want: "Street Name, Locality/City" (concise format)
    let formatted = ""
    
    if (address) {
      // Split address by comma to get components
      const addressParts = address.split(',').map((part: string) => part.trim()).filter((part: string) => part.length > 0)
      
      if (addressParts.length >= 2) {
        // First part is usually street, second is usually locality/town
        const street = addressParts[0]
        const town = addressParts[1]
        formatted = `${street}, ${town}`
      } else if (addressParts.length === 1) {
        // Only one part - use it as street, try to get town from place name or use place name
        formatted = addressParts[0]
        if (placeName && placeName !== addressParts[0]) {
          // If place name is different, add it as town
          formatted = `${addressParts[0]}, ${placeName}`
        }
      } else {
        formatted = address
      }
    } else if (placeName) {
      // No address from Foursquare, try TomTom reverse geocoding for street-level data
      try {
        const tomtomKey = process.env.NEXT_PUBLIC_TOMTOM_API_KEY
        if (tomtomKey) {
          const tomtomUrl = new URL(`https://api.tomtom.com/search/2/reverseGeocode/${lat},${lng}.json`)
          tomtomUrl.searchParams.set('key', tomtomKey)
          
          const tomtomResponse = await fetch(tomtomUrl.toString())
          if (tomtomResponse.ok) {
            const tomtomData = await tomtomResponse.json()
            const addresses = tomtomData.addresses || []
            
            if (addresses.length > 0) {
              const tomtomAddress = addresses[0].address || {}
              const streetNumber = tomtomAddress.streetNumber || ""
              const streetName = tomtomAddress.streetName || ""
              const street = streetNumber && streetName ? `${streetNumber} ${streetName}` : (streetName || streetNumber || "")
              const municipality = tomtomAddress.municipality || tomtomAddress.municipalitySubdivision || ""
              
              // Format: "Street, Town" or "Street, Suburb, City"
              if (street && municipality) {
                formatted = `${street}, ${municipality}`
              } else if (street) {
                formatted = `${street}, ${placeName}`
              } else if (municipality) {
                formatted = `${placeName}, ${municipality}`
              } else {
                formatted = placeName
              }
            } else {
              formatted = placeName
            }
          } else {
            formatted = placeName
          }
        } else {
          formatted = placeName
        }
      } catch (tomtomError) {
        console.log('⚠️ TomTom fallback error, using place name:', tomtomError)
        formatted = placeName
      }
    } else {
      // Fallback to coordinates (but we'll try to avoid this)
      formatted = `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`
    }
    
    return {
      formatted: formatted,
      components: {
        name: placeName,
        address: address,
        category: place.category || ""
      }
    }
  } catch (error) {
    console.error('❌ Foursquare geocoding error:', error)
    
    // Try TomTom as fallback before returning coordinates
    try {
      const tomtomKey = process.env.NEXT_PUBLIC_TOMTOM_API_KEY
      if (tomtomKey) {
        const tomtomUrl = new URL(`https://api.tomtom.com/search/2/reverseGeocode/${lat},${lng}.json`)
        tomtomUrl.searchParams.set('key', tomtomKey)
        
        const tomtomResponse = await fetch(tomtomUrl.toString())
        if (tomtomResponse.ok) {
          const tomtomData = await tomtomResponse.json()
          const addresses = tomtomData.addresses || []
          
          if (addresses.length > 0) {
            const tomtomAddress = addresses[0].address || {}
            const streetNumber = tomtomAddress.streetNumber || ""
            const streetName = tomtomAddress.streetName || ""
            const street = streetNumber && streetName ? `${streetNumber} ${streetName}` : (streetName || streetNumber || "")
            const municipality = tomtomAddress.municipality || tomtomAddress.municipalitySubdivision || ""
            const freeformAddress = tomtomAddress.freeformAddress || ""
            
            if (street && municipality) {
              return {
                formatted: `${street}, ${municipality}`,
                components: {
                  name: municipality,
                  address: street,
                  category: ""
                }
              }
            } else if (freeformAddress) {
              return {
                formatted: freeformAddress,
                components: {
                  name: municipality || "",
                  address: street || "",
                  category: ""
                }
              }
            }
          }
        }
      }
    } catch (tomtomError) {
      console.log('⚠️ TomTom fallback also failed:', tomtomError)
    }
    
    // Return coordinate-based fallback on error
    return {
      formatted: `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
      components: null
    }
  }
}

/**
 * Call Foursquare Places API for nearby places
 */
async function fetchNearbyPlaces(lat: number, lng: number): Promise<Array<{
  id: string
  name?: string
  categories?: string[]
  distance_m?: number
  lat: number
  lng: number
}>> {
  const foursquareServiceKey = process.env.FSQ_PLACES_SERVICE_KEY || process.env.FOURSQUARE_API_KEY || process.env.NEXT_PUBLIC_FOURSQUARE_API_KEY
  
  if (!foursquareServiceKey) {
    throw new Error('Foursquare API key not configured')
  }
  
  // Use internal Foursquare Places API endpoint
  const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL 
    ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` 
    : process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000'
  
  const url = `${baseUrl}/api/foursquare-places?lat=${lat}&lng=${lng}&radius=5000&limit=20`
  
  try {
    const response = await fetchWithTimeout(url)
    
    if (!response.ok) {
      throw new Error(`Foursquare API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (!data.items || !Array.isArray(data.items)) {
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
    // Exclude: supermarkets, gas stations, convenience stores, banks, ATMs, etc.
    // TRAVEL-RELATED CATEGORIES ONLY
    // Filter to show only places relevant to travel and tourism
    // Includes: restaurants, coffee shops, historical buildings, tourist attractions, etc.
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
    
    return data.items
      .map((place: any) => {
        const placeLat = place.location?.lat || place.latitude || lat
        const placeLng = place.location?.lng || place.longitude || lng
        const distance = calculateDistance(lat, lng, placeLat, placeLng)
        
        const placeCategories = place.category ? [place.category] : (place.categories || [])
        const categoryStr = placeCategories.join(' ').toLowerCase()
        
        // Check if place matches travel categories
        const isTravelRelated = travelCategories.some(cat => categoryStr.includes(cat))
        // Check if place should be excluded
        const shouldExclude = excludeCategories.some(cat => categoryStr.includes(cat))
        
        if (!isTravelRelated || shouldExclude) {
          return null // Filter out non-travel places
        }
        
        return {
          id: place.fsq_id || place.id || `place-${Math.random().toString(36).substr(2, 9)}`,
          name: place.title || place.name,
          categories: placeCategories,
          distance_m: Math.round(distance),
          lat: placeLat,
          lng: placeLng
        }
      })
      .filter((place: any) => place !== null) // Remove filtered out places
  } catch (error) {
    console.error('❌ Foursquare places error:', error)
    throw error
  }
}

/**
 * Optional: Fetch Mapillary imagery (multiple images for carousel)
 */
async function fetchMapillaryImagery(lat: number, lng: number): Promise<Array<{ image_url: string; thumb_url?: string; bearing?: number }> | null> {
  if (!MAPILLARY_TOKEN) {
    return null // Skip if token not configured
  }
  
  try {
    // Mapillary API v4: search for images near location - get multiple images for carousel
    const url = `https://graph.mapillary.com/images?access_token=${MAPILLARY_TOKEN}&fields=id,thumb_2048_url,thumb_256_url,compass_angle&bbox=${lng - 0.001},${lat - 0.001},${lng + 0.001},${lat + 0.001}&limit=4`
    
    const response = await fetchWithTimeout(url, {}, 5000, 0) // No retry for imagery
    
    if (!response.ok) {
      return null
    }
    
    const data = await response.json()
    
    if (!data.data || data.data.length === 0) {
      return null
    }
    
    // Return array of images for carousel
    return data.data.map((image: any) => ({
      image_url: image.thumb_2048_url || image.thumb_256_url,
      thumb_url: image.thumb_256_url,
      bearing: image.compass_angle
    }))
  } catch (error) {
    console.error('❌ Mapillary error:', error)
    return null
  }
}

// Wikimedia Commons integration removed - unreliable filenames caused nature/insect photos
// Now using Mapillary only for street-level imagery, with PINIT placeholder as fallback

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
    const geocodeKey = `foursquare-geocode:${coarseKey(lat, lng, precision)}`
    const poiKey = `foursquare-places:${coarseKey(lat, lng, precision)}`
    const imageryKey = `mapillary:${coarseKey(lat, lng, precision)}`
    
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
    
    // Fetch geocode if not cached
    if (!geocodeData) {
      console.log(`🌍 Fetching geocode from Foursquare...`)
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
    
    // Fetch POI if not cached
    if (!poiData) {
      console.log(`🏪 Fetching POI from Foursquare...`)
      try {
        poiData = await fetchNearbyPlaces(lat, lng)
        
        // Store in cache
        poiCache.set(poiKey, poiData, POI_TTL)
        if (isRedisConfigured) {
          await redisSet(poiKey, poiData, Math.floor(POI_TTL / 1000))
        }
        
        console.log(`✅ POI fetched and cached: ${poiData.length} places`)
      } catch (error) {
        console.error('❌ POI fetch failed:', error)
        poiData = [] // Empty array on failure
      }
    }
    
    // Try to get imagery from cache (optional)
    let imageryData: any = null
    let imageryCached = false
    let imagerySource = 'none'
    
    // Check cache first
    if (isRedisConfigured) {
      imageryData = await redisGet(imageryKey)
      if (imageryData) {
        imageryCached = true
        imagerySource = imageryData[0]?.source || 'cached'
        console.log(`✅ Imagery cache hit (Redis): ${imageryKey}`)
      }
    }
    
    if (!imageryData) {
      imageryData = imageryCache.get(imageryKey)
      if (imageryData) {
        imageryCached = true
        imagerySource = imageryData[0]?.source || 'cached'
        console.log(`✅ Imagery cache hit (Memory): ${imageryKey}`)
      }
    }
    
    // Fetch imagery if not cached - Mapillary only
    if (!imageryData && MAPILLARY_TOKEN) {
      console.log(`📸 Fetching street-level imagery from Mapillary...`)
      
      try {
        imageryData = await fetchMapillaryImagery(lat, lng)
        
        if (imageryData && imageryData.length > 0) {
          imagerySource = 'mapillary'
          imageryData = imageryData.map((img: any) => ({ ...img, source: 'mapillary' }))
          
          // Cache the result
          imageryCache.set(imageryKey, imageryData, IMAGERY_TTL)
          if (isRedisConfigured) {
            await redisSet(imageryKey, imageryData, Math.floor(IMAGERY_TTL / 1000))
          }
          
          console.log(`✅ Mapillary: Found ${imageryData.length} street-level images`)
        } else {
          console.log(`📸 No Mapillary imagery available for this location - will use placeholder`)
        }
      } catch (error) {
        console.error('❌ Mapillary fetch failed:', error)
        imageryData = null
      }
    }
    
    // Build response
    const response = {
      meta: {
        source: {
          geocode: 'foursquare',
          places: 'foursquare',
          ...(imagerySource !== 'none' ? { imagery: imagerySource } : {})
        },
        cached: {
          geocode: geocodeCached,
          places: poiCached,
          ...(imageryData ? { imagery: imageryCached } : {})
        },
        ...(idempotencyKey ? { idempotencyKey } : {}),
        rate: {
          minuteRemaining: rateLimit.minuteRemaining,
          hourRemaining: rateLimit.hourRemaining
        },
        duration_ms: Date.now() - startTime
      },
      geocode: geocodeData,
      places: poiData,
      ...(imageryData ? { imagery: imageryData } : {})
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

