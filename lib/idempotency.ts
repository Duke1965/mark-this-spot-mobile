/**
 * Idempotency key tracker
 * Keeps a Map of recent idempotency keys that expire after 60s
 */

interface IdempotencyEntry {
  timestamp: number
  response: any
}

const idempotencyMap = new Map<string, IdempotencyEntry>()

// Cleanup interval (runs every 30s)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    const expiredKeys: string[] = []
    
    for (const [key, entry] of idempotencyMap.entries()) {
      if (now - entry.timestamp > 60000) { // 60s expiry
        expiredKeys.push(key)
      }
    }
    
    expiredKeys.forEach(key => idempotencyMap.delete(key))
    
    if (expiredKeys.length > 0) {
      console.log(`🔑 Cleaned up ${expiredKeys.length} expired idempotency keys`)
    }
  }, 30000)
}

/**
 * Check if an idempotency key was used recently
 * @param key Idempotency key
 * @returns Cached response if key was used recently, null otherwise
 */
export function checkIdempotency(key: string): any | null {
  const entry = idempotencyMap.get(key)
  if (!entry) return null
  
  const now = Date.now()
  if (now - entry.timestamp > 60000) {
    // Expired
    idempotencyMap.delete(key)
    return null
  }
  
  console.log(`🔑 Idempotency key hit: ${key}`)
  return entry.response
}

/**
 * Store a response for an idempotency key
 * @param key Idempotency key
 * @param response Response to cache
 */
export function storeIdempotency(key: string, response: any): void {
  idempotencyMap.set(key, {
    timestamp: Date.now(),
    response
  })
  console.log(`🔑 Idempotency key stored: ${key}`)
}

/**
 * Clear all idempotency keys (for testing)
 */
export function clearIdempotency(): void {
  idempotencyMap.clear()
  console.log(`🔑 All idempotency keys cleared`)
}

