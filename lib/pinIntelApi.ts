/**
 * PINIT Pin Intelligence API Client
 * One-shot guarded calls to prevent duplicate requests
 */

// Module-level guards
let inFlight = false
let lastKey: string | null = null
let lastAt = 0

// Throttling state for maybeCallPinIntel
let lastPinIntelCallTime = 0
let lastPinIntelCoords: { lat: number; lng: number } | null = null

const MIN_PIN_INTEL_INTERVAL_MS = 60_000 // 60 seconds
const MIN_PIN_INTEL_DISTANCE_M = 75 // 75 meters

/**
 * Response from pin-intel gateway
 */
export interface PinIntelResponse {
  meta: {
    source: {
      geocode: string
      places: string
      imagery?: string
    }
    cached: {
      geocode: boolean
      places: boolean
      imagery?: boolean
    }
    idempotencyKey?: string
    rate: {
      minuteRemaining: number
      hourRemaining: number
    }
    duration_ms: number
  }
  geocode: {
    formatted: string
    components: Record<string, string> | null
  }
  places: Array<{
    id: string
    name?: string
    categories?: string[]
    distance_m?: number
    lat: number
    lng: number
  }>
  imagery?: {
    image_url: string
    thumb_url?: string
    bearing?: number
  } | null
}

/**
 * Post pin intelligence request to gateway
 * @param lat Latitude
 * @param lng Longitude
 * @param precision Precision for caching (default: 5)
 * @param userId Optional user ID for idempotency key
 * @returns Pin intelligence data
 */
export async function postPinIntel(
  lat: number,
  lng: number,
  precision: number = 5,
  userId?: string
): Promise<PinIntelResponse> {
  // Guard: check if already in flight
  if (inFlight) {
    console.log('⚠️ Request already in flight, skipping duplicate call')
    throw new Error('Request already in flight')
  }
  
  // Guard: debounce (1s minimum between calls - reduced for driving scenarios)
  const now = Date.now()
  if (now - lastAt < 1000) {
    console.log('⚠️ Debounce: Too soon since last call (1s minimum)')
    throw new Error('Already captured - please wait')
  }
  
  // Build idempotency key
  const userIdOrAnon = userId || 'anon'
  const roundedLat = Math.round(lat * 1e5)
  const roundedLng = Math.round(lng * 1e5)
  const timeWindow = Math.floor(Date.now() / 10000) // 10s window
  const idempotencyKey = `${userIdOrAnon}:${roundedLat},${roundedLng}:${timeWindow}`
  
  // Set guards
  inFlight = true
  lastAt = now
  lastKey = idempotencyKey
  
  // Create abort controller for cancellation
  const controller = new AbortController()
  
  try {
    console.log(`📡 Calling pin-intel gateway...`)
    console.log(`📍 Coordinates: ${lat}, ${lng}`)
    console.log(`🔑 Idempotency key: ${idempotencyKey}`)
    
    const response = await fetch('/api/pinit/pin-intel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-idempotency-key': idempotencyKey
      },
      body: JSON.stringify({ lat, lng, precision }),
      signal: controller.signal
    })
    
    if (!response.ok) {
      // Handle 429 rate limit errors specially
      if (response.status === 429) {
        const error = await response.json().catch(() => ({ error: 'Rate limit exceeded' }))
        console.warn('⚠️ Pin intel rate limited (429):', error)
        const rateLimitError = new Error('Rate limit exceeded')
        ;(rateLimitError as any).status = 429
        throw rateLimitError
      }
      
      const error = await response.json()
      console.error('❌ Pin intel request failed:', response.status, error)
      throw new Error(error.error || `Request failed with status ${response.status}`)
    }
    
    const data: PinIntelResponse = await response.json()
    
    console.log(`✅ Pin intel response received:`)
    console.log(`📍 Location: ${data.geocode.formatted}`)
    console.log(`🏪 Places: ${data.places.length}`)
    console.log(`⚡ Duration: ${data.meta.duration_ms}ms`)
    console.log(`💾 Cache: geocode=${data.meta.cached.geocode}, places=${data.meta.cached.places}`)
    
    return data
    
  } catch (error) {
    console.error('❌ Pin intel error:', error)
    throw error
  } finally {
    // Always reset in-flight guard
    inFlight = false
  }
}

/**
 * Cancel any in-flight request
 * Call this when user navigates away
 */
export function cancelPinIntel(): void {
  if (inFlight) {
    console.log('🛑 Cancelling in-flight pin intel request')
    inFlight = false
  }
}

/**
 * Check if a request is currently in flight
 */
export function isRequestInFlight(): boolean {
  return inFlight
}

/**
 * Reset guards (for testing)
 */
export function resetGuards(): void {
  inFlight = false
  lastKey = null
  lastAt = 0
  console.log('🔄 Pin intel guards reset')
}

/**
 * Calculate haversine distance between two coordinates in meters
 */
function haversineDistanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371000 // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)

  const sinDLat = Math.sin(dLat / 2)
  const sinDLng = Math.sin(dLng / 2)

  const h =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng

  return 2 * R * Math.asin(Math.sqrt(h))
}

/**
 * Throttled wrapper for postPinIntel that enforces:
 * - Minimum 60 seconds between calls
 * - Minimum 75 meters distance moved
 * - Graceful 429 handling
 * 
 * Returns null if the call is throttled or fails with 429.
 * Use this instead of postPinIntel for location-based calls.
 */
export async function maybeCallPinIntel(
  currentCoords: { lat: number; lng: number },
  precision: number = 5,
  userId?: string
): Promise<PinIntelResponse | null> {
  const now = Date.now()

  // 1) Enforce minimum time gap
  if (now - lastPinIntelCallTime < MIN_PIN_INTEL_INTERVAL_MS) {
    const timeSinceLastCall = Math.round((now - lastPinIntelCallTime) / 1000)
    console.log(`⏱ Skipping pin-intel: called too recently (${timeSinceLastCall}s ago, need ${MIN_PIN_INTEL_INTERVAL_MS / 1000}s)`)
    return null
  }

  // 2) Enforce minimum distance moved (if we have a previous point)
  if (lastPinIntelCoords) {
    const distance = haversineDistanceMeters(lastPinIntelCoords, currentCoords)
    if (distance < MIN_PIN_INTEL_DISTANCE_M) {
      console.log(
        `📍 Skipping pin-intel: user moved only ${distance.toFixed(1)}m (need ${MIN_PIN_INTEL_DISTANCE_M}m)`
      )
      return null
    }
  }

  // 3) OK, allowed to call pin-intel
  lastPinIntelCallTime = now
  lastPinIntelCoords = currentCoords

  try {
    const result = await postPinIntel(currentCoords.lat, currentCoords.lng, precision, userId)
    return result
  } catch (error) {
    // Handle 429 errors gracefully
    if (
      error instanceof Error &&
      ((error as any).status === 429 || 
       error.message.includes('429') || 
       error.message.includes('Rate limit exceeded'))
    ) {
      console.warn('⚠️ Pin-intel rate limited (429), backing off')
      // Note: we still leave lastPinIntelCallTime set so we don't hammer again instantly
      return null
    }
    
    // Re-throw other errors so callers can handle them
    throw error
  }
}

