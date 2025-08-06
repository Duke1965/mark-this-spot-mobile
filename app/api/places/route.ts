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

// Enhanced location name generator with better precision
const generateEnhancedLocationName = (lat: number, lng: number) => {
  // More precise location detection
  if (lat > -34.05 && lat < -34.04 && lng > 18.77 && lng < 18.78) {
    return "Riebeek West, Western Cape"
  } else if (lat > -33.6 && lat < -33.5 && lng > 18.9 && lng < 19.0) {
    return "Wellington, Western Cape"
  } else if (lat > -34.2 && lat < -33.8 && lng > 18.7 && lng < 18.9) {
    return "Malmesbury, Western Cape"
  } else if (lat > -34.5 && lat < -33.5 && lng > 18.5 && lng < 19.5) {
    return "Cape Town, Western Cape"
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
  const locationName = generateEnhancedLocationName(lat, lng)
  
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
    // Use Google Geocoding API to get the actual location name
    const geocodingUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`

    console.log("📍 Calling Google Geocoding API:", geocodingUrl)
    
    const response = await fetch(geocodingUrl)
    const data = await response.json()

    console.log("📍 Google Geocoding API response:", JSON.stringify(data, null, 2))

    // Check if the API returned an error status
    if (!response.ok || data.status === "REQUEST_DENIED" || data.status === "ZERO_RESULTS") {
      console.log("❌ Google Geocoding API error:", data.status, data.error_message)
      throw new Error(`Google Geocoding API error: ${data.error_message || "Unknown error"}`)
    }

    // Extract the location name from the geocoding results
    if (data.results && data.results.length > 0) {
      const result = data.results[0]
      const locationName = result.formatted_address.split(',')[0] // Get the first part of the address
      
      console.log("📍 Real location name from Google:", locationName)
      
      // Create a mock place with the real location name
      const realPlace = {
        place_id: "geocoded-location",
        name: locationName,
        geometry: {
          location: {
            lat: Number.parseFloat(lat),
            lng: Number.parseFloat(lng),
          },
        },
        rating: 4.5,
        price_level: 2,
        types: ["locality", "political"],
        vicinity: generateEnhancedLocationName(Number.parseFloat(lat), Number.parseFloat(lng)),
        photos: [],
      }

      return NextResponse.json({
        results: [realPlace],
        status: "OK",
      })
    }

    // If no results, fall back to mock data
    throw new Error("No geocoding results found")
  } catch (error) {
    console.error("❌ Google Geocoding API error:", error)

    // Return varied fallback mock data on error
    const fallbackPlaces = generateMockPlaces(Number.parseFloat(lat), Number.parseFloat(lng))
    
    return NextResponse.json({
      results: fallbackPlaces,
      status: "OK",
    })
  }
}
