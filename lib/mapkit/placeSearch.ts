/**
 * MapKit JS Place Search utilities
 * Fetches place information (title, description, images) using Apple MapKit JS Search API
 */

declare global {
  interface Window {
    mapkit?: any
  }
}

export interface MapKitPlaceResult {
  name: string
  description?: string
  imageUrl?: string
  coordinate: { lat: number; lng: number }
  category?: string
  address?: string
}

/**
 * Search for places near a coordinate using MapKit JS Search API
 * Returns the nearest place with name, description, and image
 */
export async function searchNearbyPlace(
  lat: number,
  lng: number,
  radius: number = 100
): Promise<MapKitPlaceResult | null> {
  if (!window.mapkit) {
    console.error('❌ MapKit JS not loaded')
    return null
  }

  try {
    // Wait for MapKit to be initialized
    if (!window.mapkit.Map) {
      // MapKit not ready yet
      console.warn('⚠️ MapKit not initialized, waiting...')
      await new Promise(resolve => setTimeout(resolve, 500))
      if (!window.mapkit.Map) {
        console.error('❌ MapKit still not initialized')
        return null
      }
    }

    // Create coordinate
    const coordinate = new window.mapkit.Coordinate(lat, lng)

    // Create search region (radius in meters)
    const region = new window.mapkit.CoordinateRegion(
      coordinate,
      new window.mapkit.CoordinateSpan(
        radius / 111000, // Convert meters to degrees (roughly)
        radius / 111000
      )
    )

    // Create search request
    const search = new window.mapkit.Search({
      region: region,
      language: 'en',
      getsUserLocation: false
    })

    // Search for places near the coordinate
    // MapKit Search can find POIs near a location
    return new Promise((resolve, reject) => {
      search.search(
        '', // Empty query searches for nearby POIs
        (error: any, data: any) => {
          if (error) {
            console.error('❌ MapKit Search error:', error)
            resolve(null)
            return
          }

          if (!data || !data.places || data.places.length === 0) {
            console.log('📍 No places found in MapKit Search')
            resolve(null)
            return
          }

          // Get the closest place (first result)
          const place = data.places[0]
          const placeLocation = place.coordinate

          // Calculate distance to ensure it's within radius
          const distance = calculateDistance(
            lat, lng,
            placeLocation.latitude,
            placeLocation.longitude
          )

          if (distance > radius) {
            console.log(`📍 Nearest place is ${Math.round(distance)}m away (outside ${radius}m radius)`)
            resolve(null)
            return
          }

          // Extract place information
          const result: MapKitPlaceResult = {
            name: place.name || place.title || 'Location',
            coordinate: {
              lat: placeLocation.latitude,
              lng: placeLocation.longitude
            },
            address: place.address
          }

          // Try to get description from place details
          if (place.description) {
            result.description = place.description
          } else if (place.subtitle) {
            result.description = place.subtitle
          } else if (place.address) {
            result.description = place.address
          }

          // Try to get image
          // MapKit place annotations can have images/photos
          if (place.photo) {
            result.imageUrl = place.photo.url || place.photo
          } else if (place.image) {
            result.imageUrl = place.image.url || place.image
          }

          // Get category if available
          if (place.pointOfInterestCategory) {
            result.category = place.pointOfInterestCategory
          }

          console.log('✅ MapKit Search found place:', {
            name: result.name,
            hasDescription: !!result.description,
            hasImage: !!result.imageUrl,
            distance: Math.round(distance) + 'm'
          })

          resolve(result)
        }
      )
    })
  } catch (error) {
    console.error('❌ MapKit Search error:', error)
    return null
  }
}

/**
 * Reverse geocode coordinates to get address information
 * Falls back to reverse geocoding if place search fails
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<{ name: string; description?: string } | null> {
  if (!window.mapkit) {
    return null
  }

  try {
    const coordinate = new window.mapkit.Coordinate(lat, lng)
    const geocoder = new window.mapkit.Geocoder({
      language: 'en'
    })

    return new Promise((resolve, reject) => {
      geocoder.lookup(
        coordinate,
        (error: any, data: any) => {
          if (error) {
            console.warn('⚠️ MapKit reverse geocode error:', error)
            resolve(null)
            return
          }

          if (!data || !data.results || data.results.length === 0) {
            resolve(null)
            return
          }

          const result = data.results[0]
          const name = result.formattedAddressLines?.[0] || 
                       result.name || 
                       result.formattedAddress || 
                       'Location'

          const description = result.formattedAddress || 
                             result.subtitle ||
                             result.locality

          resolve({ name, description })
        }
      )
    })
  } catch (error) {
    console.error('❌ MapKit reverse geocode error:', error)
    return null
  }
}

/**
 * Calculate distance between two coordinates in meters (Haversine formula)
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000 // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180
  const φ2 = lat2 * Math.PI / 180
  const Δφ = (lat2 - lat1) * Math.PI / 180
  const Δλ = (lng2 - lng1) * Math.PI / 180

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

  return R * c
}

