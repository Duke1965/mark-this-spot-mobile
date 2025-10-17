/**
 * Optional Redis wrapper for Upstash
 * Falls back to no-op if Redis env vars not configured
 */

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN

const isRedisConfigured = !!(REDIS_URL && REDIS_TOKEN)

if (isRedisConfigured) {
  console.log('✅ Redis configured (Upstash)')
} else {
  console.log('⚠️ Redis not configured, using in-memory cache only')
}

/**
 * Get a value from Redis
 * @param key Cache key
 * @returns Cached value or null
 */
export async function redisGet(key: string): Promise<any | null> {
  if (!isRedisConfigured) return null

  try {
    const response = await fetch(`${REDIS_URL}/get/${encodeURIComponent(key)}`, {
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`
      }
    })

    if (!response.ok) {
      console.error('❌ Redis GET failed:', response.status)
      return null
    }

    const data = await response.json()
    return data.result ? JSON.parse(data.result) : null
  } catch (error) {
    console.error('❌ Redis GET error:', error)
    return null
  }
}

/**
 * Set a value in Redis with TTL
 * @param key Cache key
 * @param value Value to cache
 * @param ttlSeconds Time to live in seconds
 */
export async function redisSet(key: string, value: any, ttlSeconds: number): Promise<void> {
  if (!isRedisConfigured) return

  try {
    const response = await fetch(`${REDIS_URL}/set/${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        value: JSON.stringify(value),
        ex: ttlSeconds
      })
    })

    if (!response.ok) {
      console.error('❌ Redis SET failed:', response.status)
    }
  } catch (error) {
    console.error('❌ Redis SET error:', error)
  }
}

/**
 * Delete a key from Redis
 * @param key Cache key
 */
export async function redisDelete(key: string): Promise<void> {
  if (!isRedisConfigured) return

  try {
    await fetch(`${REDIS_URL}/del/${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`
      }
    })
  } catch (error) {
    console.error('❌ Redis DELETE error:', error)
  }
}

export { isRedisConfigured }

