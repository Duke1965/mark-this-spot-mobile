/**
 * Simple LRU (Least Recently Used) Cache
 * In-memory cache with size limit and TTL support
 */

interface CacheEntry<T> {
  value: T
  timestamp: number
  ttl: number // TTL in milliseconds
}

export class LRUCache<T = any> {
  private cache: Map<string, CacheEntry<T>>
  private maxSize: number

  constructor(maxSize: number = 1000) {
    this.cache = new Map()
    this.maxSize = maxSize
  }

  /**
   * Get a value from cache
   * @param key Cache key
   * @returns Cached value or null if not found or expired
   */
  get(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    const now = Date.now()
    if (now - entry.timestamp > entry.ttl) {
      // Expired
      this.cache.delete(key)
      return null
    }

    // Move to end (most recently used)
    this.cache.delete(key)
    this.cache.set(key, entry)

    return entry.value
  }

  /**
   * Set a value in cache
   * @param key Cache key
   * @param value Value to cache
   * @param ttl Time to live in milliseconds
   */
  set(key: string, value: T, ttl: number): void {
    // Remove if already exists
    if (this.cache.has(key)) {
      this.cache.delete(key)
    }

    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      if (firstKey) {
        this.cache.delete(firstKey)
      }
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl
    })
  }

  /**
   * Check if a key exists and is not expired
   * @param key Cache key
   * @returns true if key exists and is valid
   */
  has(key: string): boolean {
    return this.get(key) !== null
  }

  /**
   * Delete a key from cache
   * @param key Cache key
   */
  delete(key: string): void {
    this.cache.delete(key)
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Get current cache size
   */
  size(): number {
    return this.cache.size
  }
}

