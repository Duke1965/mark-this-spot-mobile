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
    FSQ_PLACES_SERVICE_KEY: !!process.env.FSQ_PLACES_SERVICE_KEY,
    FOURSQUARE_API_KEY: !!process.env.FOURSQUARE_API_KEY,
    NEXT_PUBLIC_FOURSQUARE_API_KEY: !!process.env.NEXT_PUBLIC_FOURSQUARE_API_KEY,
    MAPILLARY_TOKEN: !!process.env.MAPILLARY_TOKEN,
    NEXT_PUBLIC_MAPBOX_TOKEN: !!process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV
  }

  // Get test coordinates from query params or use defaults (Cape Town)
  const { searchParams } = new URL(request.url)
  const testLat = searchParams.get("lat") || "-33.9249"
  const testLng = searchParams.get("lng") || "18.4241"

  console.log(`🔍 Running diagnostics for location: ${testLat}, ${testLng}`)

  // Test Foursquare Places API
  try {
    const fsqKey = process.env.FSQ_PLACES_SERVICE_KEY || process.env.FOURSQUARE_API_KEY || process.env.NEXT_PUBLIC_FOURSQUARE_API_KEY
    
    if (!fsqKey) {
      diagnostics.apis.foursquare = {
        status: "ERROR",
        error: "No API key found",
        details: "Missing FSQ_PLACES_SERVICE_KEY, FOURSQUARE_API_KEY, and NEXT_PUBLIC_FOURSQUARE_API_KEY"
      }
    } else {
      const fsqUrl = new URL('https://places-api.foursquare.com/places/search')
      fsqUrl.searchParams.set('ll', `${testLat},${testLng}`)
      fsqUrl.searchParams.set('radius', '100')
      fsqUrl.searchParams.set('limit', '5')
      fsqUrl.searchParams.set('fields', 'name,categories,description,rating,location')
      
      const fsqResponse = await fetch(fsqUrl.toString(), {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${fsqKey}`,
          'X-Places-Api-Version': '2025-06-17',
        },
      })

      if (fsqResponse.ok) {
        const fsqData = await fsqResponse.json()
        diagnostics.apis.foursquare = {
          status: "OK",
          places_found: fsqData.items?.length || 0,
          sample_place: fsqData.items?.[0]?.title || fsqData.items?.[0]?.name || "No places found"
        }
      } else {
        const errorText = await fsqResponse.text()
        diagnostics.apis.foursquare = {
          status: "ERROR",
          http_status: fsqResponse.status,
          error: errorText.substring(0, 200)
        }
      }
    }
  } catch (error) {
    diagnostics.apis.foursquare = {
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

  // Test internal API endpoints
  try {
    const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` 
      : process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000'
    
    // Test /api/foursquare-places
    const internalFsqResponse = await fetch(`${baseUrl}/api/foursquare-places?lat=${testLat}&lng=${testLng}&radius=100&limit=5`)
    diagnostics.apis.internal_foursquare = {
      status: internalFsqResponse.ok ? "OK" : "ERROR",
      http_status: internalFsqResponse.status
    }
    
    // Test /api/mapillary
    const internalMapillaryResponse = await fetch(`${baseUrl}/api/mapillary?lat=${testLat}&lng=${testLng}&radius=50&limit=5`)
    diagnostics.apis.internal_mapillary = {
      status: internalMapillaryResponse.ok ? "OK" : "ERROR",
      http_status: internalMapillaryResponse.status
    }
  } catch (error) {
    diagnostics.apis.internal_endpoints = {
      status: "ERROR",
      error: error instanceof Error ? error.message : String(error)
    }
  }

  // Overall status
  const allChecks = [
    diagnostics.environment.FSQ_PLACES_SERVICE_KEY || diagnostics.environment.FOURSQUARE_API_KEY || diagnostics.environment.NEXT_PUBLIC_FOURSQUARE_API_KEY,
    diagnostics.environment.MAPILLARY_TOKEN,
    diagnostics.apis.foursquare?.status === "OK",
    diagnostics.apis.mapillary?.status === "OK"
  ]
  
  diagnostics.overall_status = allChecks.every(check => check) ? "OK" : "ISSUES_FOUND"
  
  // Build issues summary arrays
  const missingEnvVars: string[] = []
  if (!diagnostics.environment.FSQ_PLACES_SERVICE_KEY && !diagnostics.environment.FOURSQUARE_API_KEY && !diagnostics.environment.NEXT_PUBLIC_FOURSQUARE_API_KEY) {
    missingEnvVars.push("Foursquare API Key")
  }
  if (!diagnostics.environment.MAPILLARY_TOKEN) {
    missingEnvVars.push("Mapillary Token")
  }
  
  const failingApis: string[] = []
  if (diagnostics.apis.foursquare?.status !== "OK") {
    failingApis.push("Foursquare")
  }
  if (diagnostics.apis.mapillary?.status !== "OK") {
    failingApis.push("Mapillary")
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

