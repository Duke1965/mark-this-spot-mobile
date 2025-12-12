import { type NextRequest, NextResponse } from "next/server"
import { MAP_PROVIDER, MAPBOX_API_KEY, TOMTOM_API_KEY, validateMapConfig } from "@/lib/mapConfig"
import { UNSPLASH_ACCESS_KEY, validateUnsplashConfig } from "@/lib/externalServices"

/**
 * Diagnostics API Route
 * Tests all API connections and environment variables
 * Helps identify why photos and content aren't loading
 * Updated to include TomTom and Unsplash APIs
 */

export async function GET(request: NextRequest) {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    environment: {},
    apis: {}
  }

  // Check environment variables (Mapbox, TomTom, Unsplash, and Map Provider)
  diagnostics.environment = {
    NEXT_PUBLIC_MAP_PROVIDER: process.env.NEXT_PUBLIC_MAP_PROVIDER || "mapbox",
    NEXT_PUBLIC_MAPBOX_API_KEY: !!process.env.NEXT_PUBLIC_MAPBOX_API_KEY,
    NEXT_PUBLIC_TOMTOM_API_KEY: !!process.env.NEXT_PUBLIC_TOMTOM_API_KEY,
    UNSPLASH_ACCESS_KEY: !!process.env.UNSPLASH_ACCESS_KEY,
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

  // Test Mapbox Static Images API (only if Mapbox is configured)
  if (MAP_PROVIDER === "mapbox" || MAPBOX_API_KEY) {
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
  }

  // Test TomTom Maps API (if TomTom is the selected provider)
  if (MAP_PROVIDER === "tomtom") {
    try {
      const tomtomKey = process.env.NEXT_PUBLIC_TOMTOM_API_KEY
      
      if (!tomtomKey) {
        diagnostics.apis.tomtom = {
          status: "ERROR",
          error: "No API key found",
          details: "Missing NEXT_PUBLIC_TOMTOM_API_KEY"
        }
      } else {
        // Test TomTom Geocoding API (reverse geocoding)
        const tomtomUrl = new URL(`https://api.tomtom.com/search/2/reverseGeocode/${testLat},${testLng}.json`)
        tomtomUrl.searchParams.set('key', tomtomKey)
        
        const tomtomResponse = await fetch(tomtomUrl.toString())
        
        if (tomtomResponse.ok) {
          const tomtomData = await tomtomResponse.json()
          const addresses = tomtomData.addresses || []
          diagnostics.apis.tomtom = {
            status: "OK",
            addresses_found: addresses.length,
            sample_address: addresses[0]?.address?.freeformAddress || addresses[0]?.address?.municipality || "No address found"
          }
        } else {
          const errorText = await tomtomResponse.text()
          diagnostics.apis.tomtom = {
            status: "ERROR",
            http_status: tomtomResponse.status,
            error: errorText.substring(0, 200)
          }
        }
      }
    } catch (error) {
      diagnostics.apis.tomtom = {
        status: "ERROR",
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  // Test Unsplash API
  try {
    const unsplashKey = process.env.UNSPLASH_ACCESS_KEY
    
    if (!unsplashKey) {
      diagnostics.apis.unsplash = {
        status: "WARNING",
        error: "No API key found",
        details: "Missing UNSPLASH_ACCESS_KEY (server-side only)"
      }
    } else {
      // Test Unsplash Search API with a travel-related query
      const unsplashUrl = new URL('https://api.unsplash.com/search/photos')
      unsplashUrl.searchParams.set('query', 'cape town restaurant')
      unsplashUrl.searchParams.set('per_page', '1')
      
      const unsplashResponse = await fetch(unsplashUrl.toString(), {
        headers: {
          'Authorization': `Client-ID ${unsplashKey}`
        }
      })
      
      if (unsplashResponse.ok) {
        const unsplashData = await unsplashResponse.json()
        const results = unsplashData.results || []
        diagnostics.apis.unsplash = {
          status: "OK",
          photos_found: results.length,
          total_results: unsplashData.total || 0,
          sample_photo_id: results[0]?.id || "No photos found"
        }
      } else {
        const errorText = await unsplashResponse.text()
        diagnostics.apis.unsplash = {
          status: "ERROR",
          http_status: unsplashResponse.status,
          error: errorText.substring(0, 200)
        }
      }
    }
  } catch (error) {
    diagnostics.apis.unsplash = {
      status: "ERROR",
      error: error instanceof Error ? error.message : String(error)
    }
  }

  // Test Unsplash location image API route (internal)
  try {
    const unsplashKey = process.env.UNSPLASH_ACCESS_KEY
    
    if (unsplashKey) {
      const locationImageResponse = await fetch(`${request.nextUrl.origin}/api/location-image/unsplash?name=Cape Town Restaurant&city=Cape Town&category=restaurant`)
      
      if (locationImageResponse.ok) {
        const locationImageData = await locationImageResponse.json()
        diagnostics.apis.unsplash_location_image = {
          status: locationImageData.imageUrl ? "OK" : "WARNING",
          has_image_url: !!locationImageData.imageUrl,
          has_attribution: !!locationImageData.photographerName
        }
      } else {
        diagnostics.apis.unsplash_location_image = {
          status: "ERROR",
          http_status: locationImageResponse.status
        }
      }
    }
  } catch (error) {
    diagnostics.apis.unsplash_location_image = {
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

  // Validate Unsplash configuration
  const unsplashConfig = validateUnsplashConfig()
  diagnostics.unsplash_config = {
    valid: unsplashConfig.valid,
    error: unsplashConfig.error
  }

  // Overall status - Check critical APIs based on configured provider
  const allChecks: boolean[] = []
  
  // Check map provider API
  if (MAP_PROVIDER === "tomtom") {
    allChecks.push(!!diagnostics.environment.NEXT_PUBLIC_TOMTOM_API_KEY)
    allChecks.push(diagnostics.apis.tomtom?.status === "OK")
  } else {
    allChecks.push(!!diagnostics.environment.NEXT_PUBLIC_MAPBOX_API_KEY)
    allChecks.push(diagnostics.apis.mapbox?.status === "OK")
    allChecks.push(diagnostics.apis.mapbox_search?.status === "OK")
  }
  
  // Unsplash is optional but recommended
  if (diagnostics.environment.UNSPLASH_ACCESS_KEY) {
    allChecks.push(diagnostics.apis.unsplash?.status === "OK" || diagnostics.apis.unsplash?.status === "WARNING")
  }
  
  diagnostics.overall_status = allChecks.every(check => check) ? "OK" : "ISSUES_FOUND"
  
  // Build issues summary arrays
  const missingEnvVars: string[] = []
  if (MAP_PROVIDER === "tomtom" && !diagnostics.environment.NEXT_PUBLIC_TOMTOM_API_KEY) {
    missingEnvVars.push("TomTom API Key")
  }
  if (MAP_PROVIDER === "mapbox" && !diagnostics.environment.NEXT_PUBLIC_MAPBOX_API_KEY) {
    missingEnvVars.push("Mapbox API Key")
  }
  if (!diagnostics.environment.UNSPLASH_ACCESS_KEY) {
    missingEnvVars.push("Unsplash Access Key (optional but recommended)")
  }
  
  const failingApis: string[] = []
  if (MAP_PROVIDER === "tomtom" && diagnostics.apis.tomtom?.status !== "OK") {
    failingApis.push("TomTom Geocoding")
  }
  if (MAP_PROVIDER === "mapbox") {
    if (diagnostics.apis.mapbox?.status !== "OK") {
      failingApis.push("Mapbox Geocoding")
    }
    if (diagnostics.apis.mapbox_search?.status !== "OK") {
      failingApis.push("Mapbox Search")
    }
  }
  if (diagnostics.environment.UNSPLASH_ACCESS_KEY && diagnostics.apis.unsplash?.status === "ERROR") {
    failingApis.push("Unsplash API")
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

