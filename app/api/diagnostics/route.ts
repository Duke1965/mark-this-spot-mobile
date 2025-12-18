import { type NextRequest, NextResponse } from "next/server"
import { MAP_PROVIDER, TOMTOM_API_KEY, validateMapConfig } from "@/lib/mapConfig"
import { UNSPLASH_ACCESS_KEY, validateUnsplashConfig } from "@/lib/externalServices"

/**
 * Diagnostics API Route
 * Tests all API connections and environment variables
 * Helps identify why photos and content aren't loading
 * Tests TomTom and Unsplash APIs (Mapbox has been removed)
 */

export async function GET(request: NextRequest) {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    environment: {},
    apis: {}
  }

  // Check environment variables (TomTom, Unsplash)
  // Also capture raw values for debugging (first/last chars only for security)
  const rawUnsplash = process.env.UNSPLASH_ACCESS_KEY || ""
  const rawTomtom = process.env.NEXT_PUBLIC_TOMTOM_API_KEY || ""
  
  diagnostics.environment = {
    NEXT_PUBLIC_MAP_PROVIDER: MAP_PROVIDER,
    NEXT_PUBLIC_TOMTOM_API_KEY: !!process.env.NEXT_PUBLIC_TOMTOM_API_KEY,
    UNSPLASH_ACCESS_KEY: !!process.env.UNSPLASH_ACCESS_KEY,
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV
  }
  
  // Add debug info at top level (not in environment to avoid React rendering issues)
  diagnostics.key_debug = {
    unsplash_key_length: rawUnsplash.length,
    tomtom_key_length: rawTomtom.length,
    unsplash_key_preview: rawUnsplash.length > 8 ? `${rawUnsplash.substring(0, 4)}...${rawUnsplash.substring(rawUnsplash.length - 4)}` : "empty",
    tomtom_key_preview: rawTomtom.length > 8 ? `${rawTomtom.substring(0, 4)}...${rawTomtom.substring(rawTomtom.length - 4)}` : "empty"
  }

  // Get test coordinates from query params or use defaults (Cape Town)
  const { searchParams } = new URL(request.url)
  const testLat = searchParams.get("lat") || "-33.9249"
  const testLng = searchParams.get("lng") || "18.4241"

  console.log(`🔍 Running diagnostics for location: ${testLat}, ${testLng}`)

  // Test TomTom Maps API (always used now, Mapbox has been removed)
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
      
      // Test TomTom Search API (for POI data)
      try {
        const searchResponse = await fetch(`${request.nextUrl.origin}/api/tomtom/search?lat=${testLat}&lng=${testLng}&radius=200&limit=5&categories=restaurant,cafe,monument,museum,art_gallery,place_of_worship,tourism`)
        
        if (searchResponse.ok) {
          const searchData = await searchResponse.json()
          diagnostics.apis.tomtom_search = {
            status: searchData.status === "OK" ? "OK" : searchData.status,
            pois_found: searchData.pois?.length || 0,
            sample_poi: searchData.pois?.[0]?.name || "No POIs found"
          }
        } else {
          diagnostics.apis.tomtom_search = {
            status: "ERROR",
            http_status: searchResponse.status
          }
        }
      } catch (error) {
        diagnostics.apis.tomtom_search = {
          status: "ERROR",
          error: error instanceof Error ? error.message : String(error)
        }
      }
    }
  } catch (error) {
    diagnostics.apis.tomtom = {
      status: "ERROR",
      error: error instanceof Error ? error.message : String(error)
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
      // Validate key format
      const trimmedKey = unsplashKey.trim()
      const keyLength = trimmedKey.length
      
      // Unsplash Access Keys are typically 43 characters, but can vary
      // Check for common issues
      let keyFormatIssue = null
      if (keyLength < 20) {
        keyFormatIssue = "Key appears too short (less than 20 characters)"
      } else if (keyLength > 200) {
        keyFormatIssue = "Key appears too long (more than 200 characters)"
      } else if (trimmedKey.includes(' ')) {
        keyFormatIssue = "Key contains spaces (should be trimmed)"
      } else if (trimmedKey.startsWith('"') || trimmedKey.endsWith('"')) {
        keyFormatIssue = "Key appears to have quotes around it (remove quotes)"
      } else if (trimmedKey.startsWith("'") || trimmedKey.endsWith("'")) {
        keyFormatIssue = "Key appears to have single quotes around it (remove quotes)"
      }
      
      // Test Unsplash Search API with a travel-related query
      const unsplashUrl = new URL('https://api.unsplash.com/search/photos')
      unsplashUrl.searchParams.set('query', 'cape town restaurant')
      unsplashUrl.searchParams.set('per_page', '1')
      
      // Log key info for debugging (first 4 and last 4 chars only)
      console.log(`🔑 Diagnostics: Unsplash key length=${keyLength}, preview=${keyLength > 8 ? `${trimmedKey.substring(0, 4)}...${trimmedKey.substring(keyLength - 4)}` : 'too short'}`)
      
      const unsplashResponse = await fetch(unsplashUrl.toString(), {
        headers: {
          'Authorization': `Client-ID ${trimmedKey}`,
          'Accept-Version': 'v1'
        }
      })
      
      if (unsplashResponse.ok) {
        const unsplashData = await unsplashResponse.json()
        const results = unsplashData.results || []
        diagnostics.apis.unsplash = {
          status: "OK",
          photos_found: results.length,
          total_results: unsplashData.total || 0,
          sample_photo_id: results[0]?.id || "No photos found",
          key_length: keyLength
        }
      } else {
        const errorText = await unsplashResponse.text()
        let errorMessage = errorText.substring(0, 200)
        
        // Provide helpful error message based on status code
        if (unsplashResponse.status === 401) {
          errorMessage = `Invalid API key (HTTP 401). Key length: ${keyLength} chars. Verify the key is correct in Vercel environment variables. Get a new Access Key from: https://unsplash.com/developers`
          if (keyFormatIssue) {
            errorMessage += ` | Format issue: ${keyFormatIssue}`
          }
        } else if (unsplashResponse.status === 403) {
          errorMessage = "API key does not have required permissions or rate limit exceeded."
        }
        
        diagnostics.apis.unsplash = {
          status: "ERROR",
          http_status: unsplashResponse.status,
          error: errorMessage,
          key_length: keyLength,
          key_format_issue: keyFormatIssue || null,
          key_preview: keyLength > 0 ? `${trimmedKey.substring(0, 4)}...${trimmedKey.substring(keyLength - 4)}` : "N/A",
          note: "In Vercel: Settings → Environment Variables → Check UNSPLASH_ACCESS_KEY. Make sure: 1) No quotes around value, 2) No spaces, 3) It's an Access Key (not OAuth token), 4) Redeploy after changes"
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
    
    if (!unsplashKey) {
      diagnostics.apis.unsplash_location_image = {
        status: "WARNING",
        error: "Skipped - Unsplash API key not configured"
      }
    } else {
      // Test the internal route - this will use the same authentication as the main Unsplash API
      const locationImageUrl = `${request.nextUrl.origin}/api/location-image/unsplash?name=Cape Town Restaurant&city=Cape Town&category=restaurant`
      const locationImageResponse = await fetch(locationImageUrl)
      
      if (locationImageResponse.ok) {
        const locationImageData = await locationImageResponse.json()
        diagnostics.apis.unsplash_location_image = {
          status: locationImageData.imageUrl ? "OK" : "WARNING",
          has_image_url: !!locationImageData.imageUrl,
          has_attribution: !!locationImageData.photographerName,
          sample_photographer: locationImageData.photographerName || "N/A"
        }
      } else {
        const errorData = await locationImageResponse.json().catch(() => ({ error: "Unknown error" }))
        diagnostics.apis.unsplash_location_image = {
          status: "ERROR",
          http_status: locationImageResponse.status,
          error: errorData.error || `HTTP ${locationImageResponse.status}`,
          note: locationImageResponse.status === 404 ? "Route not found - check that the route exists" : "Check server logs for details"
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

  // Check if Unsplash and TomTom keys are accidentally the same (crossed values)
  const unsplashKey = process.env.UNSPLASH_ACCESS_KEY?.trim() || ""
  const tomtomKey = process.env.NEXT_PUBLIC_TOMTOM_API_KEY?.trim() || ""
  const areSame = unsplashKey && tomtomKey && unsplashKey === tomtomKey
  
  diagnostics.same_value_unsplash_tomtom = areSame
  
  // Add detailed key comparison for debugging
  if (unsplashKey && tomtomKey) {
    diagnostics.key_comparison = {
      unsplash_length: unsplashKey.length,
      tomtom_length: tomtomKey.length,
      unsplash_preview: unsplashKey.length > 8 ? `${unsplashKey.substring(0, 4)}...${unsplashKey.substring(unsplashKey.length - 4)}` : "too short",
      tomtom_preview: tomtomKey.length > 8 ? `${tomtomKey.substring(0, 4)}...${tomtomKey.substring(tomtomKey.length - 4)}` : "too short",
      are_identical: areSame,
      note: areSame ? "⚠️ Keys are identical - they are crossed in Vercel environment variables!" : "Keys are different (correct)"
    }
  } else {
    diagnostics.key_comparison = {
      unsplash_exists: !!unsplashKey,
      tomtom_exists: !!tomtomKey,
      note: "One or both keys are missing"
    }
  }

  // Overall status - Check critical APIs (TomTom and Unsplash)
  const allChecks: boolean[] = []
  
  // Check TomTom API (required)
  allChecks.push(!!diagnostics.environment.NEXT_PUBLIC_TOMTOM_API_KEY)
  allChecks.push(diagnostics.apis.tomtom?.status === "OK")
  
  // Unsplash is optional but recommended
  if (diagnostics.environment.UNSPLASH_ACCESS_KEY) {
    allChecks.push(diagnostics.apis.unsplash?.status === "OK" || diagnostics.apis.unsplash?.status === "WARNING")
  }
  
  diagnostics.overall_status = allChecks.every(check => check) ? "OK" : "ISSUES_FOUND"
  
  // Build issues summary arrays
  const missingEnvVars: string[] = []
  if (!diagnostics.environment.NEXT_PUBLIC_TOMTOM_API_KEY) {
    missingEnvVars.push("TomTom API Key")
  }
  if (!diagnostics.environment.UNSPLASH_ACCESS_KEY) {
    missingEnvVars.push("Unsplash Access Key (optional but recommended)")
  }
  
  const failingApis: string[] = []
  if (diagnostics.apis.tomtom?.status !== "OK") {
    failingApis.push("TomTom Geocoding")
  }
  if (diagnostics.apis.tomtom_search?.status && diagnostics.apis.tomtom_search?.status !== "OK") {
    failingApis.push("TomTom Search")
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

