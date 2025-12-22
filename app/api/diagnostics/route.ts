import { type NextRequest, NextResponse } from "next/server"
import { MAP_PROVIDER, MAPBOX_API_KEY, validateMapConfig } from "@/lib/mapConfig"

/**
 * Diagnostics API Route
 * Tests all API connections and environment variables
 * Helps identify why photos and content aren't loading
 * Tests Mapbox and Wikimedia APIs
 */

export async function GET(request: NextRequest) {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    environment: {},
    apis: {}
  }

  // Check environment variables (Mapbox only)
  const rawMapbox = process.env.NEXT_PUBLIC_MAPBOX_API_KEY || ""
  
  diagnostics.environment = {
    NEXT_PUBLIC_MAP_PROVIDER: MAP_PROVIDER,
    NEXT_PUBLIC_MAPBOX_API_KEY: !!process.env.NEXT_PUBLIC_MAPBOX_API_KEY,
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV
  }
  
  // Add debug info at top level (not in environment to avoid React rendering issues)
  diagnostics.key_debug = {
    mapbox_key_length: rawMapbox.length,
    mapbox_key_preview: rawMapbox.length > 8 ? `${rawMapbox.substring(0, 4)}...${rawMapbox.substring(rawMapbox.length - 4)}` : "empty"
  }

  // Get test coordinates from query params or use defaults (Cape Town)
  const { searchParams } = new URL(request.url)
  const testLat = searchParams.get("lat") || "-33.9249"
  const testLng = searchParams.get("lng") || "18.4241"

  console.log(`🔍 Running diagnostics for location: ${testLat}, ${testLng}`)

  // Test Mapbox Maps API (always used now, TomTom has been removed)
  try {
    const mapboxKey = process.env.NEXT_PUBLIC_MAPBOX_API_KEY
    
    if (!mapboxKey) {
      diagnostics.apis.mapbox = {
        status: "ERROR",
        error: "No API key found",
        details: "Missing NEXT_PUBLIC_MAPBOX_API_KEY"
      }
    } else {
      // Test Mapbox Geocoding API (reverse geocoding)
      const mapboxUrl = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${testLng},${testLat}.json`)
      mapboxUrl.searchParams.set('access_token', mapboxKey)
      
      const mapboxResponse = await fetch(mapboxUrl.toString())
      
      if (mapboxResponse.ok) {
        const mapboxData = await mapboxResponse.json()
        const features = mapboxData.features || []
        diagnostics.apis.mapbox = {
          status: "OK",
          places_found: features.length,
          sample_place: features[0]?.place_name || features[0]?.text || "No place found"
        }
      } else {
        const errorText = await mapboxResponse.text()
        diagnostics.apis.mapbox = {
          status: "ERROR",
          http_status: mapboxResponse.status,
          error: errorText.substring(0, 200)
        }
      }
      
      // Test Mapbox Static Images API
      try {
        const staticImageUrl = new URL(`https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${testLng},${testLat},14,0/400x400`)
        staticImageUrl.searchParams.set('access_token', mapboxKey)
        
        const staticImageResponse = await fetch(staticImageUrl.toString())
        
        if (staticImageResponse.ok) {
          diagnostics.apis.mapbox_static_image = {
            status: "OK",
            has_image_url: true,
            style: "streets-v12"
          }
        } else {
          diagnostics.apis.mapbox_static_image = {
            status: "ERROR",
            http_status: staticImageResponse.status
          }
        }
      } catch (error) {
        diagnostics.apis.mapbox_static_image = {
          status: "ERROR",
          error: error instanceof Error ? error.message : String(error)
        }
      }
    }
  } catch (error) {
    diagnostics.apis.mapbox = {
      status: "ERROR",
      error: error instanceof Error ? error.message : String(error)
    }
  }

  // Test Wikimedia API (replaces Unsplash)
  // Use a generic test name since we're testing the API, not a specific place
  try {
    // Try to get a place name from Mapbox geocoding for better Wikimedia test
    let testPlaceName = "Cape Town" // Fallback
    if (diagnostics.apis.mapbox?.sample_place) {
      // Extract first part of place name (before comma) for Wikimedia search
      testPlaceName = diagnostics.apis.mapbox.sample_place.split(',')[0].trim()
    }
    
    const testWikimediaUrl = `${request.nextUrl.origin}/api/wikimedia/resolve?name=${encodeURIComponent(testPlaceName)}&lat=${testLat}&lng=${testLng}`
    const wikimediaResponse = await fetch(testWikimediaUrl)
    
    if (wikimediaResponse.ok) {
      const wikimediaData = await wikimediaResponse.json()
      diagnostics.apis.wikimedia = {
        status: wikimediaData.imageUrl ? "OK" : "WARNING",
        has_image_url: !!wikimediaData.imageUrl,
        source: wikimediaData.source || "none",
        qid: wikimediaData.qid || null,
        message: wikimediaData.imageUrl ? "Wikimedia image found" : "No image found for test location"
      }
    } else {
      const errorText = await wikimediaResponse.text().catch(() => 'Unknown error')
      diagnostics.apis.wikimedia = {
        status: "ERROR",
        http_status: wikimediaResponse.status,
        error: errorText.substring(0, 200)
      }
    }
  } catch (error) {
    diagnostics.apis.wikimedia = {
      status: "ERROR",
      error: error instanceof Error ? error.message : String(error)
    }
  }


  // Validate map configuration
  const mapConfig = validateMapConfig()
  diagnostics.map_config = {
    provider: MAP_PROVIDER,
    valid: mapConfig.valid,
    errors: mapConfig.errors
  }


  // Overall status - Check critical APIs (Mapbox only)
  const allChecks: boolean[] = []
  
  // Check Mapbox API (required)
  allChecks.push(!!diagnostics.environment.NEXT_PUBLIC_MAPBOX_API_KEY)
  allChecks.push(diagnostics.apis.mapbox?.status === "OK")
  
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
  if (diagnostics.apis.mapbox_static_image?.status && diagnostics.apis.mapbox_static_image?.status !== "OK") {
    failingApis.push("Mapbox Static Image")
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

