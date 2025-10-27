import { type NextRequest, NextResponse } from "next/server"
import { foursquareAPI, FoursquareAPI } from "@/lib/foursquare"

/**
 * Foursquare Places API Route
 * Server-side proxy to avoid exposing API key
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { lat, lng, radius = 5000, limit = 10 } = body

    console.log('🔍 Foursquare Places API request:', { lat, lng, radius, limit })

    if (!lat || !lng) {
      return NextResponse.json({ error: "Missing lat/lng parameters" }, { status: 400 })
    }

    // Search nearby places using Foursquare
    const places = await foursquareAPI.searchNearby({
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      radius: parseInt(radius),
      limit: parseInt(limit)
    })

    if (!places || places.length === 0) {
      console.log('⚠️ No places found from Foursquare')
      return NextResponse.json({
        results: [],
        status: "ZERO_RESULTS",
        source: "foursquare"
      })
    }

    // Transform Foursquare places to our format
    const transformedPlaces = places.map(place => FoursquareAPI.transformToPinData(place))

    console.log(`✅ Foursquare API: Returning ${transformedPlaces.length} places`)

    return NextResponse.json({
      results: transformedPlaces,
      status: "OK",
      source: "foursquare"
    })
  } catch (error) {
    console.error('❌ Foursquare Places API error:', error)
    
    return NextResponse.json({
      results: [],
      status: "ERROR",
      source: "foursquare",
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get("lat")
  const lng = searchParams.get("lng")
  const radius = searchParams.get("radius") || "5000"
  const limit = searchParams.get("limit") || "10"

  if (!lat || !lng) {
    return NextResponse.json({ error: "Missing lat/lng parameters" }, { status: 400 })
  }

  try {
    console.log('🔍 Foursquare Places API GET request:', { lat, lng, radius, limit })

    // Search nearby places using Foursquare
    const places = await foursquareAPI.searchNearby({
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      radius: parseInt(radius),
      limit: parseInt(limit)
    })

    if (!places || places.length === 0) {
      console.log('⚠️ No places found from Foursquare')
      return NextResponse.json({
        results: [],
        status: "ZERO_RESULTS",
        source: "foursquare"
      })
    }

    // Transform Foursquare places to our format
    const transformedPlaces = places.map(place => FoursquareAPI.transformToPinData(place))

    console.log(`✅ Foursquare API: Returning ${transformedPlaces.length} places`)

    return NextResponse.json({
      results: transformedPlaces,
      status: "OK",
      source: "foursquare"
    })
  } catch (error) {
    console.error('❌ Foursquare Places API error:', error)
    
    return NextResponse.json({
      results: [],
      status: "ERROR",
      source: "foursquare",
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
