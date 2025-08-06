import { type NextRequest, NextResponse } from "next/server"

// Mock place data generator based on coordinates
const generateMockPlaces = (lat: number, lng: number) => {
  const places = [
    {
      place_id: "mock-1",
      name: "Central Park Gardens",
      geometry: {
        location: {
          lat: lat + 0.001,
          lng: lng + 0.001,
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
          lat: lat - 0.002,
          lng: lng + 0.001,
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
          lat: lat + 0.0015,
          lng: lng - 0.001,
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
          lat: lat - 0.001,
          lng: lng - 0.002,
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
          lat: lat + 0.002,
          lng: lng + 0.002,
        },
      },
      rating: 4.1,
      types: ["shopping_mall", "establishment"],
      vicinity: "Commercial District",
      photos: [],
    },
  ]

  // Shuffle the places to get different results each time
  return places.sort(() => Math.random() - 0.5).slice(0, 3)
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get("lat")
  const lng = searchParams.get("lng")
  const radius = searchParams.get("radius") || "1000"

  if (!lat || !lng) {
    return NextResponse.json({ error: "Missing lat/lng parameters" }, { status: 400 })
  }

  if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
    console.warn("Google Maps API key not found, returning mock data")
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

    const response = await fetch(placesUrl)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(`Google Places API error: ${data.error_message || "Unknown error"}`)
    }

    console.log(`✅ Google Places API: Found ${data.results?.length || 0} places`)

    return NextResponse.json(data)
  } catch (error) {
    console.error("❌ Google Places API error:", error)

    // Return varied fallback mock data on error
    const fallbackPlaces = generateMockPlaces(Number.parseFloat(lat), Number.parseFloat(lng))
    
    return NextResponse.json({
      results: fallbackPlaces,
      status: "OK",
    })
  }
}
