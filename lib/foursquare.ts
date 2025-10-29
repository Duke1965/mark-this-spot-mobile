/**
 * Foursquare Places API Client
 * Reliable, enterprise-grade location data provider
 */

import { assembleFsqPhotoUrl } from './fsq'

interface FoursquarePhoto {
  id: string
  created_at: string
  prefix: string
  suffix: string
  width: number
  height: number
}

interface FoursquarePlace {
  fsq_id: string
  name: string
  location: {
    latitude: number
    longitude: number
    address?: string
    locality?: string
    region?: string
    postcode?: string
    country?: string
  }
  geocodes: {
    main: { latitude: number; longitude: number }
  }
  photos?: FoursquarePhoto[]
  categories?: Array<{
    id: number
    name: string
    icon: {
      prefix: string
      suffix: string
    }
  }>
  tips?: Array<{
    id: string
    created_at: string
    text: string
    lang?: string
  }>
  rating?: number
  price?: number
  hours?: {
    display: string
  }
  description?: string // NEW: Venue description from Foursquare
}

interface FoursquareNearbySearchParams {
  lat: number
  lng: number
  radius?: number // in meters, max 100000
  limit?: number // 1-50
  categories?: string
  fields?: string
}

export class FoursquareAPI {
  private apiKey: string
  private baseUrl = 'https://api.foursquare.com/v3'
  private rateLimitKey = 'foursquare-last-request'
  private minRequestInterval = 1000 // 1 second minimum between requests

  constructor() {
    // Prefer server-side key (FOURSQUARE_API_KEY), fallback to client key (NEXT_PUBLIC_FOURSQUARE_API_KEY)
    this.apiKey = process.env.FOURSQUARE_API_KEY || process.env.NEXT_PUBLIC_FOURSQUARE_API_KEY || ''
    
    if (!this.apiKey) {
      console.warn('⚠️ Foursquare API key not configured')
    } else if (process.env.FOURSQUARE_API_KEY) {
      console.log('✅ Using server-side FOURSQUARE_API_KEY')
    } else {
      console.log('✅ Using client-side NEXT_PUBLIC_FOURSQUARE_API_KEY')
    }
  }

  /**
   * Check rate limit to prevent API loops
   */
  private checkRateLimit(): boolean {
    const lastRequest = localStorage.getItem(this.rateLimitKey)
    if (!lastRequest) return true
    
    const timeSinceLastRequest = Date.now() - parseInt(lastRequest)
    
    if (timeSinceLastRequest < this.minRequestInterval) {
      console.log('⏸️ Rate limit: Too soon since last Foursquare request')
      return false
    }
    
    return true
  }

  /**
   * Update rate limit timestamp
   */
  private updateRateLimit(): void {
    localStorage.setItem(this.rateLimitKey, Date.now().toString())
  }

  /**
   * Search for places near a location
   */
  async searchNearby(params: FoursquareNearbySearchParams): Promise<FoursquarePlace[]> {
    // Rate limit check
    if (!this.checkRateLimit()) {
      return []
    }

    if (!this.apiKey) {
      console.log('⚠️ Foursquare API key not available')
      return []
    }

    try {
      const radius = params.radius || 5000 // 5km default
      const limit = params.limit || 10
      
      const url = `${this.baseUrl}/places/search` +
        `?ll=${params.lat},${params.lng}` +
        `&radius=${Math.min(radius, 100000)}` +
        `&limit=${Math.min(limit, 50)}` +
        '&fields=fsq_id,name,location,geocodes,photos,categories,rating,price,hours,description'

      console.log('🔍 Fetching from Foursquare Places API...')
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': this.apiKey,
          'Accept': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Foursquare API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      
      // Update rate limit
      this.updateRateLimit()
      
      console.log(`✅ Foursquare API: Found ${data.results?.length || 0} places`)
      
      return data.results || []
    } catch (error) {
      console.error('❌ Foursquare API error:', error)
      return []
    }
  }

  /**
   * Get photo URL from Foursquare photo object
   */
  static getPhotoUrl(photo: FoursquarePhoto | undefined, size: 'original' | 'medium' | 'small' = 'medium'): string {
    if (!photo || !photo.prefix || !photo.suffix) return ''
    
    // Use the new helper function from lib/fsq.ts
    const sizeMap: Record<string, 'original' | '500x500' | '300x300'> = {
      original: 'original',
      medium: '500x500',
      small: '300x300'
    }
    
    const assembledUrl = assembleFsqPhotoUrl(photo.prefix, photo.suffix, sizeMap[size])
    return assembledUrl || ''
  }

  /**
   * Transform Foursquare place to our PinData format
   */
  static transformToPinData(place: FoursquarePlace, userId?: string): any {
    const primaryCategory = place.categories?.[0]
    const primaryPhoto = place.photos?.[0]
    
    // Use Foursquare description if available, otherwise generate one
    const description = place.description || FoursquareAPI.generateDescription(place, primaryCategory)
    
    return {
      id: place.fsq_id,
      latitude: place.location.latitude,
      longitude: place.location.longitude,
      locationName: place.name,
      mediaUrl: primaryPhoto ? FoursquareAPI.getPhotoUrl(primaryPhoto) : null,
      mediaType: primaryPhoto ? 'photo' : null,
      title: place.name,
      description: description,
      tags: place.categories?.map(cat => cat.name.toLowerCase().replace(/\s+/g, '-')) || [],
      timestamp: new Date().toISOString(),
      rating: place.rating,
      priceLevel: place.price,
      types: place.categories?.map(cat => cat.name) || [],
      isRecommended: true,
      googlePlaceId: place.fsq_id, // Using Foursquare ID
      category: primaryCategory?.name || 'General',
      photos: place.photos?.map(photo => ({
        url: FoursquareAPI.getPhotoUrl(photo),
        placeName: place.name,
        width: photo.width,
        height: photo.height
      })) || []
    }
  }

  /**
   * Generate a description for the place
   */
  static generateDescription(place: FoursquarePlace, category?: { name: string }): string {
    const ratingText = place.rating ? `${place.rating.toFixed(1)} stars` : 'Highly rated'
    const priceText = place.price ? '$'.repeat(place.price) : ''
    const categoryText = category?.name || 'place'
    
    return `${categoryText} in your area. ${ratingText}${priceText ? ` • ${priceText}` : ''}`
  }

  /**
   * Get place details by ID
   */
  async getPlaceDetails(fsqId: string): Promise<FoursquarePlace | null> {
    if (!this.apiKey) return null

    try {
      console.log('🔍 Fetching place details from Foursquare:', fsqId)
      
      const response = await fetch(`${this.baseUrl}/places/${fsqId}`, {
        method: 'GET',
        headers: {
          'Authorization': this.apiKey,
          'Accept': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Foursquare API error: ${response.status}`)
      }

      const data = await response.json()
      
      // Update rate limit
      this.updateRateLimit()
      
      return data
    } catch (error) {
      console.error('❌ Foursquare API error:', error)
      return null
    }
  }
}

// Export singleton instance
export const foursquareAPI = new FoursquareAPI()
