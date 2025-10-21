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
 * Call OpenCage reverse geocoding API
 */
async function reverseGeocode(lat: number, lng: number): Promise<{ formatted: string; components: Record<string, string> | null }> {
  if (!OPENCAGE_KEY) {
    throw new Error('OpenCage API key not configured')
  }
  
  const url = `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lng}&key=${OPENCAGE_KEY}&no_record=1&language=en&limit=1`
  
  try {
    const response = await fetchWithTimeout(url)
    
    if (!response.ok) {
      throw new Error(`OpenCage API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (!data.results || data.results.length === 0) {
      throw new Error('No geocoding results found')
    }
    
    const result = data.results[0]
    
    return {
      formatted: result.formatted || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      components: result.components || null
    }
  } catch (error) {
    console.error('❌ OpenCage error:', error)
    throw error
  }
}

/**
 * Call Geoapify Places API
 */
async function fetchNearbyPlaces(lat: number, lng: number): Promise<Array<{
  id: string
  name?: string
  categories?: string[]
  distance_m?: number
  lat: number
  lng: number
}>> {
  if (!GEOAPIFY_KEY) {
    throw new Error('Geoapify API key not configured')
  }
  
  const url = `https://api.geoapify.com/v2/places?categories=commercial,leisure,catering,activity&filter=circle:${lng},${lat},100&bias=proximity:${lng},${lat}&limit=20&apiKey=${GEOAPIFY_KEY}`
  
  try {
    const response = await fetchWithTimeout(url)
    
    if (!response.ok) {
      throw new Error(`Geoapify API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (!data.features || !Array.isArray(data.features)) {
      return []
    }
    
    return data.features.map((feature: any) => ({
      id: feature.properties?.place_id || `place-${Math.random().toString(36).substr(2, 9)}`,
      name: feature.properties?.name,
      categories: feature.properties?.categories,
      distance_m: feature.properties?.distance,
      lat: feature.geometry?.coordinates?.[1] || lat,
      lng: feature.geometry?.coordinates?.[0] || lng
    }))
  } catch (error) {
    console.error('❌ Geoapify error:', error)
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
    const geocodeKey = `opencage:${coarseKey(lat, lng, precision)}`
    const poiKey = `geoapify:${coarseKey(lat, lng, precision)}`
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
      console.log(`🌍 Fetching geocode from OpenCage...`)
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
      console.log(`🏪 Fetching POI from Geoapify...`)
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
    
    if (MAPILLARY_TOKEN) {
      if (isRedisConfigured) {
        imageryData = await redisGet(imageryKey)
        if (imageryData) {
          imageryCached = true
          console.log(`✅ Imagery cache hit (Redis): ${imageryKey}`)
        }
      }
      
      if (!imageryData) {
        imageryData = imageryCache.get(imageryKey)
        if (imageryData) {
          imageryCached = true
          console.log(`✅ Imagery cache hit (Memory): ${imageryKey}`)
        }
      }
      
      // Fetch imagery if not cached
      if (!imageryData) {
        console.log(`📸 Fetching imagery from Mapillary...`)
        try {
          imageryData = await fetchMapillaryImagery(lat, lng)
          
          if (imageryData && imageryData.length > 0) {
            // Store in cache
            imageryCache.set(imageryKey, imageryData, IMAGERY_TTL)
            if (isRedisConfigured) {
              await redisSet(imageryKey, imageryData, Math.floor(IMAGERY_TTL / 1000))
            }
            
            console.log(`✅ Imagery fetched and cached: ${imageryData.length} images`)
          }
        } catch (error) {
          console.error('❌ Imagery fetch failed:', error)
          imageryData = null
        }
      }
    }
    
    // Build response
    const response = {
      meta: {
        source: {
          geocode: 'opencage',
          places: 'geoapify',
          ...(MAPILLARY_TOKEN ? { imagery: 'mapillary' } : {})
        },
        cached: {
          geocode: geocodeCached,
          places: poiCached,
          ...(MAPILLARY_TOKEN ? { imagery: imageryCached } : {})
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

