import { type NextRequest, NextResponse } from "next/server"

/**
 * Diagnostics API Route
 * Tests all API connections and environment variables
 * Helps identify why photos and content aren't loading
 */

export async function GET(request: NextRequest) {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    environment: {},
    apis: {}
  }

  // Check environment variables
  diagnostics.environment = {
    NEXT_PUBLIC_MAPBOX_API_KEY: !!process.env.NEXT_PUBLIC_MAPBOX_API_KEY,
    // MAPILLARY_TOKEN is optional (no longer required)
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV
  }

  // Get test coordinates from query params or use defaults (Cape Town)
  const { searchParams } = new URL(request.url)
  const testLat = searchParams.get("lat") || "-33.9249"
  const testLng = searchParams.get("lng") || "18.4241"

  console.log(`🔍 Running diagnostics for location: ${testLat}, ${testLng}`)

  // Test Mapbox Geocoding API
  try {
    const mapboxKey = process.env.NEXT_PUBLIC_MAPBOX_API_KEY
    
    if (!mapboxKey) {
      diagnostics.apis.mapbox = {
        status: "ERROR",
        error: "No API key found",
        details: "Missing NEXT_PUBLIC_MAPBOX_API_KEY"
      }
    } else {
      const mapboxUrl = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${testLng},${testLat}.json`)
      mapboxUrl.searchParams.set('access_token', mapboxKey)
      mapboxUrl.searchParams.set('types', 'place') // Use 'place' for reliable results
      
      const mapboxResponse = await fetch(mapboxUrl.toString())

      if (mapboxResponse.ok) {
        const mapboxData = await mapboxResponse.json()
        const features = mapboxData.features || []
        diagnostics.apis.mapbox = {
          status: "OK",
          places_found: features.length,
          sample_place: features[0]?.text || features[0]?.place_name || "No places found"
        }
      } else {
        const errorText = await mapboxResponse.text()
        diagnostics.apis.mapbox = {
          status: "ERROR",
          http_status: mapboxResponse.status,
          error: errorText.substring(0, 200)
        }
      }
    }
  } catch (error) {
    diagnostics.apis.mapbox = {
      status: "ERROR",
      error: error instanceof Error ? error.message : String(error)
    }
  }

  // Test Mapillary API
  try {
    const mapillaryToken = process.env.MAPILLARY_TOKEN
    
    if (!mapillaryToken) {
      diagnostics.apis.mapillary = {
        status: "ERROR",
        error: "No MAPILLARY_TOKEN found"
      }
    } else {
      const radiusInDegrees = 50 / 111000 // 50m
      const latNum = parseFloat(testLat)
      const lngNum = parseFloat(testLng)
      const bbox = [
        lngNum - radiusInDegrees,
        latNum - radiusInDegrees,
        lngNum + radiusInDegrees,
        latNum + radiusInDegrees
      ].join(',')

      const mapillaryUrl = new URL('https://graph.mapillary.com/images')
      mapillaryUrl.searchParams.set('access_token', mapillaryToken)
      mapillaryUrl.searchParams.set('bbox', bbox)
      mapillaryUrl.searchParams.set('limit', '5')
      mapillaryUrl.searchParams.set('fields', 'id,thumb_2048_url,captured_at,compass_angle,geometry')

      const mapillaryResponse = await fetch(mapillaryUrl.toString())

      if (mapillaryResponse.ok) {
        const mapillaryData = await mapillaryResponse.json()
        const images = Array.isArray(mapillaryData?.data) ? mapillaryData.data : []
        diagnostics.apis.mapillary = {
          status: "OK",
          images_found: images.length,
          has_urls: images.length > 0 ? !!images[0].thumb_2048_url : false
        }
      } else {
        const errorText = await mapillaryResponse.text()
        diagnostics.apis.mapillary = {
          status: "ERROR",
          http_status: mapillaryResponse.status,
          error: errorText.substring(0, 200)
        }
      }
    }
  } catch (error) {
    diagnostics.apis.mapillary = {
      status: "ERROR",
      error: error instanceof Error ? error.message : String(error)
    }
  }

  // Test OSM Nominatim API
  try {
    const nominatimUrl = new URL('https://nominatim.openstreetmap.org/reverse')
    nominatimUrl.searchParams.set('lat', testLat)
    nominatimUrl.searchParams.set('lon', testLng)
    nominatimUrl.searchParams.set('format', 'json')
    nominatimUrl.searchParams.set('addressdetails', '1')
    
    const nominatimResponse = await fetch(nominatimUrl.toString(), {
      headers: {
        'User-Agent': 'PINIT-App/1.0 (Location-based pinning app)',
        'Accept': 'application/json'
      }
    })

    if (nominatimResponse.ok) {
      const nominatimData = await nominatimResponse.json()
      diagnostics.apis.nominatim = {
        status: "OK",
        place_found: !!nominatimData.display_name,
        sample_place: nominatimData.display_name?.substring(0, 50) || "No place found"
      }
    } else {
      diagnostics.apis.nominatim = {
        status: "ERROR",
        http_status: nominatimResponse.status
      }
    }
  } catch (error) {
    diagnostics.apis.nominatim = {
      status: "ERROR",
      error: error instanceof Error ? error.message : String(error)
    }
  }

  // Test internal API endpoints
  try {
    const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` 
      : process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000'
    
    // Test /api/mapbox_geocoding (for address geocoding only)
    const internalMapboxResponse = await fetch(`${baseUrl}/api/mapbox_geocoding?lat=${testLat}&lng=${testLng}`)
    diagnostics.apis.internal_mapbox = {
      status: internalMapboxResponse.ok ? "OK" : "ERROR",
      http_status: internalMapboxResponse.status
    }
    
    // Test /api/nominatim (OSM)
    const internalNominatimResponse = await fetch(`${baseUrl}/api/nominatim?lat=${testLat}&lng=${testLng}&radius=100&limit=5`)
    diagnostics.apis.internal_nominatim = {
      status: internalNominatimResponse.ok ? "OK" : "ERROR",
      http_status: internalNominatimResponse.status
    }
    
    // Test /api/overpass (OSM)
    const internalOverpassResponse = await fetch(`${baseUrl}/api/overpass?lat=${testLat}&lng=${testLng}&radius=100&limit=5`)
    diagnostics.apis.internal_overpass = {
      status: internalOverpassResponse.ok ? "OK" : "ERROR",
      http_status: internalOverpassResponse.status
    }
  } catch (error) {
    diagnostics.apis.internal_endpoints = {
      status: "ERROR",
      error: error instanceof Error ? error.message : String(error)
    }
  }

  // Overall status - Mapillary is now optional (we use OSM instead)
  // Only check critical APIs: Mapbox (for geocoding) and OSM (for POI data)
  const allChecks = [
    diagnostics.environment.NEXT_PUBLIC_MAPBOX_API_KEY,
    diagnostics.apis.mapbox?.status === "OK",
    diagnostics.apis.nominatim?.status === "OK" || diagnostics.apis.internal_nominatim?.status === "OK"
  ]
  
  diagnostics.overall_status = allChecks.every(check => check) ? "OK" : "ISSUES_FOUND"
  
  // Build issues summary arrays
  const missingEnvVars: string[] = []
  if (!diagnostics.environment.NEXT_PUBLIC_MAPBOX_API_KEY) {
    missingEnvVars.push("Mapbox API Key")
  }
  // Mapillary Token is optional (no longer required)
  
  const failingApis: string[] = []
  if (diagnostics.apis.mapbox?.status !== "OK") {
    failingApis.push("Mapbox")
  }
  if (diagnostics.apis.nominatim?.status !== "OK" && diagnostics.apis.internal_nominatim?.status !== "OK") {
    failingApis.push("Nominatim (OSM)")
  }
  // Mapillary is optional - don't include in failing APIs
  
  diagnostics.issues_summary = {
    missing_env_vars: missingEnvVars,
    failing_apis: failingApis
  }

  return NextResponse.json(diagnostics, { 
    status: 200,
    headers: {
      'Cache-Control': 'no-store'
    }
  })
}

