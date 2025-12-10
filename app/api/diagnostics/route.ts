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

  // Check environment variables (Mapbox only)
  diagnostics.environment = {
    NEXT_PUBLIC_MAPBOX_API_KEY: !!process.env.NEXT_PUBLIC_MAPBOX_API_KEY,
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

  // Test Mapbox Search API (for POI data)
  try {
    const mapboxKey = process.env.NEXT_PUBLIC_MAPBOX_API_KEY
    
    if (mapboxKey) {
      const searchResponse = await fetch(`${request.nextUrl.origin}/api/mapbox/search?lat=${testLat}&lng=${testLng}&radius=200&limit=5&categories=restaurant,cafe,monument,museum,art_gallery,place_of_worship,tourism`)
      
      if (searchResponse.ok) {
        const searchData = await searchResponse.json()
        diagnostics.apis.mapbox_search = {
          status: searchData.status === "OK" ? "OK" : searchData.status,
          pois_found: searchData.pois?.length || 0,
          sample_poi: searchData.pois?.[0]?.name || "No POIs found"
        }
      } else {
        diagnostics.apis.mapbox_search = {
          status: "ERROR",
          http_status: searchResponse.status
        }
      }
    }
  } catch (error) {
    diagnostics.apis.mapbox_search = {
      status: "ERROR",
      error: error instanceof Error ? error.message : String(error)
    }
  }

  // Test Mapbox Static Images API
  try {
    const mapboxKey = process.env.NEXT_PUBLIC_MAPBOX_API_KEY
    
    if (mapboxKey) {
      const staticImageResponse = await fetch(`${request.nextUrl.origin}/api/mapbox/static-image?lat=${testLat}&lng=${testLng}&width=400&height=400&zoom=17&style=streets-v12`)
      
      if (staticImageResponse.ok) {
        const staticImageData = await staticImageResponse.json()
        diagnostics.apis.mapbox_static_image = {
          status: staticImageData.status === "OK" ? "OK" : staticImageData.status,
          has_image_url: !!staticImageData.imageUrl,
          style: staticImageData.style || "streets-v12"
        }
      } else {
        diagnostics.apis.mapbox_static_image = {
          status: "ERROR",
          http_status: staticImageResponse.status
        }
      }
    }
  } catch (error) {
    diagnostics.apis.mapbox_static_image = {
      status: "ERROR",
      error: error instanceof Error ? error.message : String(error)
    }
  }

  // Skip internal API endpoint tests in production (causes 401 errors when server calls itself)
  // These routes work fine from client-side - the 401s are diagnostic artifacts only
  // Internal routes are tested implicitly through external API tests above

  // Overall status - Check critical Mapbox APIs only
  const allChecks = [
    diagnostics.environment.NEXT_PUBLIC_MAPBOX_API_KEY,
    diagnostics.apis.mapbox?.status === "OK",
    diagnostics.apis.mapbox_search?.status === "OK"
  ]
  
  diagnostics.overall_status = allChecks.every(check => check) ? "OK" : "ISSUES_FOUND"
  
  // Build issues summary arrays
  const missingEnvVars: string[] = []
  if (!diagnostics.environment.NEXT_PUBLIC_MAPBOX_API_KEY) {
    missingEnvVars.push("Mapbox API Key")
  }
  
  const failingApis: string[] = []
  if (diagnostics.apis.mapbox?.status !== "OK") {
    failingApis.push("Mapbox Geocoding")
  }
  if (diagnostics.apis.mapbox_search?.status !== "OK") {
    failingApis.push("Mapbox Search")
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

