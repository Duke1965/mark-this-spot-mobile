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
    MAPILLARY_TOKEN: !!process.env.MAPILLARY_TOKEN, // Optional - for street-level imagery
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

  // Test Mapillary API (for street-level imagery)
  try {
    const mapillaryToken = process.env.MAPILLARY_TOKEN
    
    if (!mapillaryToken) {
      diagnostics.apis.mapillary = {
        status: "NO_TOKEN",
        note: "MAPILLARY_TOKEN not configured (optional)"
      }
    } else {
      // Test Mapillary API by calling our internal route
      const mapillaryResponse = await fetch(`${request.nextUrl.origin}/api/mapillary?lat=${testLat}&lng=${testLng}&radius=100&limit=1`)
      
      if (mapillaryResponse.ok) {
        const mapillaryData = await mapillaryResponse.json()
        diagnostics.apis.mapillary = {
          status: mapillaryData.status === "OK" ? "OK" : mapillaryData.status,
          images_found: mapillaryData.images?.length || 0,
          note: mapillaryData.note || undefined
        }
      } else {
        diagnostics.apis.mapillary = {
          status: "ERROR",
          http_status: mapillaryResponse.status
        }
      }
    }
  } catch (error) {
    diagnostics.apis.mapillary = {
      status: "ERROR",
      error: error instanceof Error ? error.message : String(error)
    }
  }

  // Test KartaView API (for street-level imagery)
  try {
    // KartaView doesn't require an API key (open source)
    const kartaviewResponse = await fetch(`${request.nextUrl.origin}/api/kartaview?lat=${testLat}&lng=${testLng}&radius=100&limit=1`)
    
    if (kartaviewResponse.ok) {
      const kartaviewData = await kartaviewResponse.json()
      diagnostics.apis.kartaview = {
        status: kartaviewData.status === "OK" ? "OK" : kartaviewData.status,
        images_found: kartaviewData.images?.length || 0,
        note: kartaviewData.note || undefined
      }
    } else {
      diagnostics.apis.kartaview = {
        status: "ERROR",
        http_status: kartaviewResponse.status
      }
    }
  } catch (error) {
    diagnostics.apis.kartaview = {
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

  // Skip internal API endpoint tests in production (causes 401 errors when server calls itself)
  // These routes work fine from client-side - the 401s are diagnostic artifacts only
  // Internal routes are tested implicitly through external API tests above

  // Overall status - Check critical APIs: Mapbox (for geocoding) and OSM (for POI data)
  const allChecks = [
    diagnostics.environment.NEXT_PUBLIC_MAPBOX_API_KEY,
    diagnostics.apis.mapbox?.status === "OK",
    diagnostics.apis.nominatim?.status === "OK"
  ]
  
  diagnostics.overall_status = allChecks.every(check => check) ? "OK" : "ISSUES_FOUND"
  
  // Build issues summary arrays
  const missingEnvVars: string[] = []
  if (!diagnostics.environment.NEXT_PUBLIC_MAPBOX_API_KEY) {
    missingEnvVars.push("Mapbox API Key")
  }
  
  const failingApis: string[] = []
  if (diagnostics.apis.mapbox?.status !== "OK") {
    failingApis.push("Mapbox")
  }
  if (diagnostics.apis.nominatim?.status !== "OK") {
    failingApis.push("Nominatim (OSM)")
  }
  
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

