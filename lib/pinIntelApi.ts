/**
 * PINIT Pin Intelligence API Client
 * One-shot guarded calls to prevent duplicate requests
 */

// Module-level guards
let inFlight = false
let lastKey: string | null = null
let lastAt = 0

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

