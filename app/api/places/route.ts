import { type NextRequest, NextResponse } from "next/server"

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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get("lat")
  const lng = searchParams.get("lng")
  const radius = searchParams.get("radius") || "5000" // Increased from 1000 to 5000 (5km)
  
  // Detect mobile vs desktop from headers
  const userAgent = request.headers.get("user-agent") || ""
  const deviceType = request.headers.get("x-device-type") || "unknown"
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent) || deviceType === "mobile"
  
  console.log(`🌐 [${isMobile ? 'MOBILE' : 'DESKTOP'}] Places API request:`, { lat, lng, radius, deviceType })

  if (!lat || !lng) {
    return NextResponse.json({ error: "Missing lat/lng parameters" }, { status: 400 })
  }

  if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
    console.warn(`🌐 [${isMobile ? 'MOBILE' : 'DESKTOP'}] Google Maps API key not found, returning mock data`)
    // Return varied mock data when API key is not available
    const mockPlaces = generateMockPlaces(Number.parseFloat(lat), Number.parseFloat(lng))
    
    return NextResponse.json({
      results: mockPlaces,
      status: "OK",
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
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error(`❌ [${isMobile ? 'MOBILE' : 'DESKTOP'}] Google Places API error:`, error)

    // Return varied fallback mock data on error
    const fallbackPlaces = generateMockPlaces(Number.parseFloat(lat), Number.parseFloat(lng))
    
    return NextResponse.json({
      results: fallbackPlaces,
      status: "OK",
    })
  }
}
