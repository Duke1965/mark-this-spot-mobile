import { type NextRequest, NextResponse } from "next/server"

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
    // Return mock data when API key is not available
    return NextResponse.json({
      results: [
        {
          place_id: "mock-1",
          name: "Local Coffee House",
          geometry: {
            location: {
              lat: Number.parseFloat(lat) + 0.001,
              lng: Number.parseFloat(lng) + 0.001,
            },
          },
          rating: 4.5,
          price_level: 2,
          types: ["cafe", "restaurant", "food"],
          vicinity: "Downtown Area",
          photos: [],
        },
        {
          place_id: "mock-2",
          name: "City Park Viewpoint",
          geometry: {
            location: {
              lat: Number.parseFloat(lat) - 0.002,
              lng: Number.parseFloat(lng) + 0.001,
            },
          },
          rating: 4.8,
          types: ["park", "tourist_attraction"],
          vicinity: "City Center",
          photos: [],
        },
        {
          place_id: "mock-3",
          name: "Art Gallery Downtown",
          geometry: {
            location: {
              lat: Number.parseFloat(lat) + 0.0015,
              lng: Number.parseFloat(lng) - 0.001,
            },
          },
          rating: 4.3,
          price_level: 1,
          types: ["art_gallery", "tourist_attraction"],
          vicinity: "Arts District",
          photos: [],
        },
      ],
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

    // Return fallback mock data on error
    return NextResponse.json({
      results: [
        {
          place_id: "fallback-1",
          name: "Popular Local Spot",
          geometry: {
            location: {
              lat: Number.parseFloat(lat) + 0.001,
              lng: Number.parseFloat(lng) + 0.001,
            },
          },
          rating: 4.2,
          types: ["establishment"],
          vicinity: "Nearby",
          photos: [],
        },
      ],
      status: "OK",
    })
  }
}
