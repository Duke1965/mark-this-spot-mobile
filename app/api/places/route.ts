import { type NextRequest, NextResponse } from "next/server"
import { isMapLifecycleEnabled } from "@/lib/mapLifecycle"
import { MAP_LIFECYCLE } from "@/lib/mapLifecycle"
import { daysAgo } from "@/lib/trending"

// Mock place data generator based on coordinates
const generateMockPlaces = (lat: number, lng: number) => {
  const places = [
    {
      place_id: "mock-1",
      name: "Central Park Gardens",
      geometry: {
        location: {
          lat: lat + 0.02, // Increased from 0.001 to 0.02 (about 2km)
          lng: lng + 0.02, // Increased from 0.001 to 0.02 (about 2km)
        },
      },
      rating: 4.5,
      price_level: 2,
      types: ["park", "tourist_attraction"],
      vicinity: "Downtown District",
      photos: [],
    },
    {
      place_id: "mock-2",
      name: "Riverside Café",
      geometry: {
        location: {
          lat: lat - 0.025, // Increased from 0.002 to 0.025 (about 2.5km)
          lng: lng + 0.015, // Increased from 0.001 to 0.015 (about 1.5km)
        },
      },
      rating: 4.8,
      types: ["cafe", "restaurant"],
      vicinity: "Waterfront Area",
      photos: [],
    },
    {
      place_id: "mock-3",
      name: "Heritage Museum",
      geometry: {
        location: {
          lat: lat + 0.03, // Increased from 0.0015 to 0.03 (about 3km)
          lng: lng - 0.02, // Increased from 0.001 to 0.02 (about 2km)
        },
      },
      rating: 4.3,
      price_level: 1,
      types: ["museum", "tourist_attraction"],
      vicinity: "Historic Quarter",
      photos: [],
    },
    {
      place_id: "mock-4",
      name: "Sunset Viewpoint",
      geometry: {
        location: {
          lat: lat - 0.015, // Increased from 0.001 to 0.015 (about 1.5km)
          lng: lng - 0.035, // Increased from 0.002 to 0.035 (about 3.5km)
        },
      },
      rating: 4.7,
      types: ["tourist_attraction", "point_of_interest"],
      vicinity: "Scenic Heights",
      photos: [],
    },
    {
      place_id: "mock-5",
      name: "Urban Market Square",
      geometry: {
        location: {
          lat: lat + 0.04, // Increased from 0.002 to 0.04 (about 4km)
          lng: lng + 0.03, // Increased from 0.002 to 0.03 (about 3km)
        },
      },
      rating: 4.1,
      types: ["shopping_mall", "establishment"],
      vicinity: "Commercial District",
      photos: [],
    },
    {
      place_id: "mock-6",
      name: "Mountain Trailhead",
      geometry: {
        location: {
          lat: lat - 0.045, // About 4.5km away
          lng: lng + 0.04, // About 4km away
        },
      },
      rating: 4.6,
      types: ["natural_feature", "tourist_attraction"],
      vicinity: "Mountain Region",
      photos: [],
    },
    {
      place_id: "mock-7",
      name: "Lakeside Marina",
      geometry: {
        location: {
          lat: lat + 0.035, // About 3.5km away
          lng: lng - 0.045, // About 4.5km away
        },
      },
      rating: 4.4,
      types: ["marina", "tourist_attraction"],
      vicinity: "Lakeside District",
      photos: [],
    },
    {
      place_id: "mock-8",
      name: "Cultural Arts Center",
      geometry: {
        location: {
          lat: lat - 0.05, // About 5km away
          lng: lng - 0.025, // About 2.5km away
        },
      },
      rating: 4.9,
      types: ["art_gallery", "establishment"],
      vicinity: "Arts District",
      photos: [],
    },
  ]

  // Shuffle the places to get different results each time
  return places.sort(() => Math.random() - 0.5).slice(0, 5) // Increased from 3 to 5 places
}

// Original GET endpoint for Google Places API
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get("lat")
  const lng = searchParams.get("lng")
  const radius = searchParams.get("radius") || "5000" // Increased from 1000 to 5000 (5km)
  
  // Detect mobile vs desktop from headers
  const userAgent = request.headers.get("user-agent") || ""
  const deviceType = request.headers.get("x-device-type") || "unknown"
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent) || deviceType === "mobile"
  
  console.log(`🌐 [${isMobile ? 'MOBILE' : 'DESKTOP'}] Places API GET request:`, { lat, lng, radius, deviceType })

  if (!lat || !lng) {
    return NextResponse.json({ error: "Missing lat/lng parameters" }, { status: 400 })
  }

  // REMOVED: Early API key check that was forcing mock data
  // Now we always try Google API first

  // Check if API key is available
  if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
    console.log(`🌐 [${isMobile ? 'MOBILE' : 'DESKTOP'}] Google Maps API key not configured, using mock data`)
    return NextResponse.json({
      results: generateMockPlaces(parseFloat(lat), parseFloat(lng)),
      status: "OK",
      source: "mock"
    })
  }

  try {
    const types = [
      "tourist_attraction",
      "restaurant",
      "cafe",
      "museum",
      "park",
      "shopping_mall",
      "art_gallery",
      "amusement_park",
      "zoo",
      "aquarium",
      "establishment", // Added to catch more places
      "point_of_interest" // Added to catch more places
    ]

    const placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${types.join(
      "|",
    )}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
    
    console.log(`🌐 [${isMobile ? 'MOBILE' : 'DESKTOP'}] Calling Google Places API...`)
    
    const response = await fetch(placesUrl, {
      headers: {
        'User-Agent': isMobile ? 'PINIT-Mobile-App/1.0' : 'PINIT-Web-App/1.0'
      }
    })
    const data = await response.json()

    if (!response.ok) {
      throw new Error(`Google Places API error: ${data.error_message || "Unknown error"}`)
    }

    console.log(`✅ [${isMobile ? 'MOBILE' : 'DESKTOP'}] Google Places API: Found ${data.results?.length || 0} places`)
    
    // Handle ZERO_RESULTS specifically for mobile
    if (data.status === 'ZERO_RESULTS') {
      console.log(`⚠️ [${isMobile ? 'MOBILE' : 'DESKTOP'}] No places found in radius ${radius}m`)
      
      // For mobile, try with a larger radius if no results
      if (isMobile && Number.parseInt(radius) < 10000) {
        console.log(`🔄 [MOBILE] Trying with larger radius (10km)...`)
        const largerRadiusUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=10000&type=${types.join(
          "|",
        )}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
        
        try {
          const largerResponse = await fetch(largerRadiusUrl, {
            headers: {
              'User-Agent': 'PINIT-Mobile-App/1.0'
            }
          })
          const largerData = await largerResponse.json()
          
          if (largerResponse.ok && largerData.results && largerData.results.length > 0) {
            console.log(`✅ [MOBILE] Found ${largerData.results.length} places with larger radius`)
            return NextResponse.json(largerData)
          }
        } catch (largerError) {
          console.log(`⚠️ [MOBILE] Larger radius search failed:`, largerError)
        }
      }
      
      // Only fall back to mock data if we really can't find anything
      console.log(`🔄 [${isMobile ? 'MOBILE' : 'DESKTOP'}] Falling back to mock data after no Google results`)
      
      // Try reverse geocoding first before falling back to mock data
      try {
        const geocodeResponse = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
        )
        
        if (geocodeResponse.ok) {
          const geocodeData = await geocodeResponse.json()
          if (geocodeData.results && geocodeData.results.length > 0) {
            const addressComponents = geocodeData.results[0].address_components
            const formattedAddress = geocodeData.results[0].formatted_address
            
            // Create a meaningful place from geocoding data
            const locality = addressComponents.find((comp: any) => 
              comp.types.includes('locality') || comp.types.includes('sublocality')
            )
            
            const route = addressComponents.find((comp: any) => 
              comp.types.includes('route')
            )
            
            const neighborhood = addressComponents.find((comp: any) => 
              comp.types.includes('neighborhood')
            )
            
            let placeName = "Unknown Location"
            let vicinity = ""
            
            if (locality && route) {
              placeName = `${locality.long_name} - ${route.long_name}`
              vicinity = locality.long_name
            } else if (locality && neighborhood) {
              placeName = `${locality.long_name} - ${neighborhood.long_name}`
              vicinity = locality.long_name
            } else if (locality) {
              placeName = locality.long_name
              vicinity = locality.long_name
            } else if (formattedAddress) {
              const parts = formattedAddress.split(',')
              placeName = parts[0]?.trim() || "Unknown Location"
              vicinity = parts[parts.length - 2]?.trim() || ""
            }
            
            console.log(`📍 [${isMobile ? 'MOBILE' : 'DESKTOP'}] Created place from geocoding:`, { placeName, vicinity })
            
            return NextResponse.json({
              results: [{
                place_id: `geocode-${Date.now()}`,
                name: placeName,
                geometry: {
                  location: {
                    lat: Number.parseFloat(lat),
                    lng: Number.parseFloat(lng)
                  }
                },
                rating: undefined,
                price_level: undefined,
                types: ["point_of_interest"],
                vicinity: vicinity,
                photos: []
              }],
              status: "OK",
              source: "geocoding"
            })
          }
        }
      } catch (geocodeError) {
        console.log(`📍 [${isMobile ? 'MOBILE' : 'DESKTOP'}] Geocoding fallback failed:`, geocodeError)
      }
      
      // Final fallback to mock data
      const mockPlaces = generateMockPlaces(Number.parseFloat(lat), Number.parseFloat(lng))
      return NextResponse.json({
        results: mockPlaces,
        status: "OK",
        source: "mock"
      })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error(`❌ [${isMobile ? 'MOBILE' : 'DESKTOP'}] Google Places API error:`, error)

    // Try reverse geocoding before falling back to mock data
    console.log(`🔄 [${isMobile ? 'MOBILE' : 'DESKTOP'}] Trying reverse geocoding after API error...`)
    try {
      const geocodeResponse = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
      )
      
      if (geocodeResponse.ok) {
        const geocodeData = await geocodeResponse.json()
        if (geocodeData.results && geocodeData.results.length > 0) {
          const addressComponents = geocodeData.results[0].address_components
          const formattedAddress = geocodeData.results[0].formatted_address
          
          // Create a meaningful place from geocoding data
          const locality = addressComponents.find((comp: any) => 
            comp.types.includes('locality') || comp.types.includes('sublocality')
          )
          
          const route = addressComponents.find((comp: any) => 
            comp.types.includes('route')
          )
          
          const neighborhood = addressComponents.find((comp: any) => 
            comp.types.includes('neighborhood')
          )
          
          let placeName = "Unknown Location"
          let vicinity = ""
          
          if (locality && route) {
            placeName = `${locality.long_name} - ${route.long_name}`
            vicinity = locality.long_name
          } else if (locality && neighborhood) {
            placeName = `${locality.long_name} - ${neighborhood.long_name}`
            vicinity = locality.long_name
          } else if (locality) {
            placeName = locality.long_name
            vicinity = locality.long_name
          } else if (formattedAddress) {
            const parts = formattedAddress.split(',')
            placeName = parts[0]?.trim() || "Unknown Location"
            vicinity = parts[parts.length - 2]?.trim() || ""
          }
          
          console.log(`📍 [${isMobile ? 'MOBILE' : 'DESKTOP'}] Created place from geocoding after API error:`, { placeName, vicinity })
          
          return NextResponse.json({
            results: [{
              place_id: `geocode-error-${Date.now()}`,
              name: placeName,
              geometry: {
                location: {
                  lat: Number.parseFloat(lat),
                  lng: Number.parseFloat(lng)
                }
              },
              rating: undefined,
              price_level: undefined,
              types: ["point_of_interest"],
              vicinity: vicinity,
              photos: []
            }],
            status: "OK",
            source: "geocoding-error"
          })
        }
      }
    } catch (geocodeError) {
      console.log(`📍 [${isMobile ? 'MOBILE' : 'DESKTOP'}] Geocoding fallback after API error failed:`, geocodeError)
    }
    
    // Only fall back to mock data on actual API errors
    console.log(`🔄 [${isMobile ? 'MOBILE' : 'DESKTOP'}] Falling back to mock data after API error`)
    const fallbackPlaces = generateMockPlaces(Number.parseFloat(lat), Number.parseFloat(lng))
    
    return NextResponse.json({
      results: fallbackPlaces,
      status: "OK",
      source: "mock-error"
    })
  }
}



// Add POST method support to handle frontend requests
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { lat, lng, radius = "5000" } = body
    
    // Detect mobile vs desktop from headers
    const userAgent = request.headers.get("user-agent") || ""
    const deviceType = request.headers.get("x-device-type") || "unknown"
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent) || deviceType === "mobile"
    
    console.log(`🌐 [${isMobile ? 'MOBILE' : 'DESKTOP'}] Places API POST request:`, { lat, lng, radius, deviceType })

    if (!lat || !lng) {
      return NextResponse.json({ error: "Missing lat/lng parameters" }, { status: 400 })
    }

    // REMOVED: Early API key check that was forcing mock data
    // Now we always try Google API first

    const types = [
      "tourist_attraction",
      "restaurant",
      "cafe",
      "museum",
      "park",
      "shopping_mall",
      "art_gallery",
      "amusement_park",
      "zoo",
      "aquarium",
      "establishment", // Added to catch more places
      "point_of_interest" // Added to catch more places
    ]

    const placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${types.join(
      "|",
    )}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
    
    console.log(`🌐 [${isMobile ? 'MOBILE' : 'DESKTOP'}] Calling Google Places API via POST...`)
    
    const response = await fetch(placesUrl, {
      headers: {
        'User-Agent': isMobile ? 'PINIT-Mobile-App/1.0' : 'PINIT-Web-App/1.0'
      }
    })
    const data = await response.json()

    if (!response.ok) {
      throw new Error(`Google Places API error: ${data.error_message || "Unknown error"}`)
    }

    console.log(`✅ [${isMobile ? 'MOBILE' : 'DESKTOP'}] Google Places API POST: Found ${data.results?.length || 0} places`)
    
    // Handle ZERO_RESULTS specifically for mobile
    if (data.status === 'ZERO_RESULTS') {
      console.log(`⚠️ [${isMobile ? 'MOBILE' : 'DESKTOP'}] No places found in radius ${radius}m`)
      
      // For mobile, try with a larger radius if no results
      if (isMobile && Number.parseInt(radius) < 10000) {
        console.log(`🔄 [MOBILE] Trying with larger radius (10km)...`)
        const largerRadiusUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=10000&type=${types.join(
          "|",
        )}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
        
        try {
          const largerResponse = await fetch(largerRadiusUrl, {
            headers: {
              'User-Agent': 'PINIT-Mobile-App/1.0'
            }
          })
          const largerData = await largerResponse.json()
          
          if (largerResponse.ok && largerData.results && largerData.results.length > 0) {
            console.log(`✅ [MOBILE] Found ${largerData.results.length} places with larger radius`)
            return NextResponse.json(largerData)
          }
        } catch (largerError) {
          console.log(`⚠️ [MOBILE] Larger radius search failed:`, largerError)
        }
      }
      
      // Try reverse geocoding before falling back to mock data
      console.log(`🔄 [${isMobile ? 'MOBILE' : 'DESKTOP'}] Trying reverse geocoding...`)
      try {
        const geocodeResponse = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
        )
        
        if (geocodeResponse.ok) {
          const geocodeData = await geocodeResponse.json()
          if (geocodeData.results && geocodeData.results.length > 0) {
            const addressComponents = geocodeData.results[0].address_components
            const formattedAddress = geocodeData.results[0].formatted_address
            
            // Create a meaningful place from geocoding data
            const locality = addressComponents.find((comp: any) => 
              comp.types.includes('locality') || comp.types.includes('sublocality')
            )
            
            const route = addressComponents.find((comp: any) => 
              comp.types.includes('route')
            )
            
            const neighborhood = addressComponents.find((comp: any) => 
              comp.types.includes('neighborhood')
            )
            
            let placeName = "Unknown Location"
            let vicinity = ""
            
            if (locality && route) {
              placeName = `${locality.long_name} - ${route.long_name}`
              vicinity = locality.long_name
            } else if (locality && neighborhood) {
              placeName = `${locality.long_name} - ${neighborhood.long_name}`
              vicinity = locality.long_name
            } else if (locality) {
              placeName = locality.long_name
              vicinity = locality.long_name
            } else if (formattedAddress) {
              const parts = formattedAddress.split(',')
              placeName = parts[0]?.trim() || "Unknown Location"
              vicinity = parts[parts.length - 2]?.trim() || ""
            }
            
            console.log(`📍 [${isMobile ? 'MOBILE' : 'DESKTOP'}] Created place from geocoding:`, { placeName, vicinity })
            
            return NextResponse.json({
              results: [{
                place_id: `geocode-${Date.now()}`,
                name: placeName,
                geometry: {
                  location: {
                    lat: Number.parseFloat(lat),
                    lng: Number.parseFloat(lng)
                  }
                },
                rating: undefined,
                price_level: undefined,
                types: ["point_of_interest"],
                vicinity: vicinity,
                photos: []
              }],
              status: "OK",
              source: "geocoding"
            })
          }
        }
      } catch (geocodeError) {
        console.log(`📍 [${isMobile ? 'MOBILE' : 'DESKTOP'}] Geocoding fallback failed:`, geocodeError)
      }
      
      // Only fall back to mock data if we really can't find anything
      console.log(`🔄 [${isMobile ? 'MOBILE' : 'DESKTOP'}] Falling back to mock data after no Google results`)
      const mockPlaces = generateMockPlaces(Number.parseFloat(lat), Number.parseFloat(lng))
      return NextResponse.json({
        results: mockPlaces,
        status: "OK",
        source: "mock"
      })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error(`❌ [${isMobile ? 'MOBILE' : 'DESKTOP'}] Google Places API POST error:`, error)

    // Only fall back to mock data on actual API errors
    console.log(`🔄 [${isMobile ? 'MOBILE' : 'DESKTOP'}] Falling back to mock data after API error`)
    const fallbackPlaces = generateMockPlaces(Number.parseFloat(lat), Number.parseFloat(lng))
    
    return NextResponse.json({
      results: fallbackPlaces,
      status: "OK",
    })
  }
}
