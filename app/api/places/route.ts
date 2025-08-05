import { type NextRequest, NextResponse } from "next/server"

// Generate location name based on coordinates
const getLocationNameFromCoords = (lat: number, lng: number) => {
  // South Africa location mapping - more precise ranges
  if (lat > -34.05 && lat < -34.04 && lng > 18.77 && lng < 18.78) {
    return "Riebeek West"
  } else if (lat > -34.2 && lat < -33.8 && lng > 18.7 && lng < 18.9) {
    return "Malmesbury"
  } else if (lat > -34.5 && lat < -33.5 && lng > 18.5 && lng < 19.5) {
    return "Cape Town"
  } else if (lat > -34.5 && lat < -33.5) {
    return "Western Cape"
  } else if (lng > 18.5 && lng < 19.5) {
    return "Cape Town Area"
  } else {
    return "South Africa"
  }
}

// Mock place data generator based on coordinates
const generateMockPlaces = (lat: number, lng: number) => {
  const locationName = getLocationNameFromCoords(lat, lng)
  
  const places = [
    {
      place_id: "location-1",
      name: locationName,
      geometry: {
        location: {
          lat: lat,
          lng: lng,
        },
      },
      rating: 4.5,
      price_level: 2,
      types: ["locality", "political"],
      vicinity: "",
      photos: [],
    }
  ]

  return places
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

    // Check if the API returned an error status
    if (!response.ok || data.status === "REQUEST_DENIED" || data.status === "ZERO_RESULTS") {
      throw new Error(`Google Places API error: ${data.error_message || "Unknown error"}`)
    }

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
