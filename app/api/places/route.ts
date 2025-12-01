import { type NextRequest, NextResponse } from "next/server"
import { isMapLifecycleEnabled } from "@/lib/mapLifecycle"
import { MAP_LIFECYCLE } from "@/lib/mapLifecycle"
import { daysAgo } from "@/lib/trending"

// Mock place data generator based on coordinates
const generateMockPlaces = (lat: number, lng: number) => {
  const places = [
    {
      place_id: "mock-1",
      name: "Central Park Gardens",
      geometry: {
        location: {
          lat: lat + 0.02, // Increased from 0.001 to 0.02 (about 2km)
          lng: lng + 0.02, // Increased from 0.001 to 0.02 (about 2km)
        },
      },
      rating: 4.5,
      price_level: 2,
      types: ["park", "tourist_attraction"],
      vicinity: "Downtown District",
      photos: [],
    },
    {
      place_id: "mock-2",
      name: "Riverside Café",
      geometry: {
        location: {
          lat: lat - 0.025, // Increased from 0.002 to 0.025 (about 2.5km)
          lng: lng + 0.015, // Increased from 0.001 to 0.015 (about 1.5km)
        },
      },
      rating: 4.8,
      types: ["cafe", "restaurant"],
      vicinity: "Waterfront Area",
      photos: [],
    },
    {
      place_id: "mock-3",
      name: "Heritage Museum",
      geometry: {
        location: {
          lat: lat + 0.03, // Increased from 0.0015 to 0.03 (about 3km)
          lng: lng - 0.02, // Increased from 0.001 to 0.02 (about 2km)
        },
      },
      rating: 4.3,
      price_level: 1,
      types: ["museum", "tourist_attraction"],
      vicinity: "Historic Quarter",
      photos: [],
    },
    {
      place_id: "mock-4",
      name: "Sunset Viewpoint",
      geometry: {
        location: {
          lat: lat - 0.015, // Increased from 0.001 to 0.015 (about 1.5km)
          lng: lng - 0.035, // Increased from 0.002 to 0.035 (about 3.5km)
        },
      },
      rating: 4.7,
      types: ["tourist_attraction", "point_of_interest"],
      vicinity: "Scenic Heights",
      photos: [],
    },
    {
      place_id: "mock-5",
      name: "Urban Market Square",
      geometry: {
        location: {
          lat: lat + 0.04, // Increased from 0.002 to 0.04 (about 4km)
          lng: lng + 0.03, // Increased from 0.002 to 0.03 (about 3km)
        },
      },
      rating: 4.1,
      types: ["shopping_mall", "establishment"],
      vicinity: "Commercial District",
      photos: [],
    },
    {
      place_id: "mock-6",
      name: "Mountain Trailhead",
      geometry: {
        location: {
          lat: lat - 0.045, // About 4.5km away
          lng: lng + 0.04, // About 4km away
        },
      },
      rating: 4.6,
      types: ["natural_feature", "tourist_attraction"],
      vicinity: "Mountain Region",
      photos: [],
    },
    {
      place_id: "mock-7",
      name: "Lakeside Marina",
      geometry: {
        location: {
          lat: lat + 0.035, // About 3.5km away
          lng: lng - 0.045, // About 4.5km away
        },
      },
      rating: 4.4,
      types: ["marina", "tourist_attraction"],
      vicinity: "Lakeside District",
      photos: [],
    },
    {
      place_id: "mock-8",
      name: "Cultural Arts Center",
      geometry: {
        location: {
          lat: lat - 0.05, // About 5km away
          lng: lng - 0.025, // About 2.5km away
        },
      },
      rating: 4.9,
      types: ["art_gallery", "establishment"],
      vicinity: "Arts District",
      photos: [],
    },
  ]

  // Shuffle the places to get different results each time
  return places.sort(() => Math.random() - 0.5).slice(0, 5) // Increased from 3 to 5 places
}

// Original GET endpoint for Google Places API
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get("lat")
  const lng = searchParams.get("lng")
  const radius = searchParams.get("radius") || "10" // Ultra-precise: 10 meters for exact location pinning
  
  // Detect mobile vs desktop from headers
  const userAgent = request.headers.get("user-agent") || ""
  const deviceType = request.headers.get("x-device-type") || "unknown"
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent) || deviceType === "mobile"
  
  console.log(`🌐 [${isMobile ? 'MOBILE' : 'DESKTOP'}] Places API GET request:`, { lat, lng, radius, deviceType })
  console.log(`🌐 [${isMobile ? 'MOBILE' : 'DESKTOP'}] Environment check - Foursquare API key present: ${!!process.env.NEXT_PUBLIC_FOURSQUARE_API_KEY}`)

  if (!lat || !lng) {
    return NextResponse.json({ error: "Missing lat/lng parameters" }, { status: 400 })
  }

  // NEW: Try Foursquare Places API first for GET requests
  // Use the new /api/foursquare-places endpoint which uses the new Places API
  const foursquareServiceKey = process.env.FSQ_PLACES_SERVICE_KEY || process.env.FOURSQUARE_API_KEY || process.env.NEXT_PUBLIC_FOURSQUARE_API_KEY
  
  if (foursquareServiceKey) {
    console.log(`🌐 [${isMobile ? 'MOBILE' : 'DESKTOP'}] Trying Foursquare Places API first...`)
    try {
      // Use larger radius for rural areas (convert radius string to number, default to 5000m)
      const searchRadius = Math.max(parseInt(radius) || 5000, 5000) // At least 5km for better coverage
      
      // Call the new /api/foursquare-places endpoint
      // Use internal fetch - construct absolute URL for server-side fetch
      const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL 
        ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` 
        : process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000'
      
      const foursquareResponse = await fetch(`${baseUrl}/api/foursquare-places?lat=${lat}&lng=${lng}&radius=${searchRadius}&limit=10`, {
        headers: {
          'Accept': 'application/json',
        },
      })
      
      if (foursquareResponse.ok) {
        const foursquareData = await foursquareResponse.json()
        const foursquareResults = foursquareData.items || []
      
        console.log(`✅ [${isMobile ? 'MOBILE' : 'DESKTOP'}] Foursquare Places API: Found ${foursquareResults.length} places`)
        
        // Debug: Log first result details
        if (foursquareResults.length > 0) {
          console.log(`🔍 [${isMobile ? 'MOBILE' : 'DESKTOP'}] First Foursquare result:`, JSON.stringify(foursquareResults[0], null, 2))
        }
        
        // ONLY use Foursquare - no Google fallback
        if (foursquareResults.length > 0) {
          console.log(`📸 [${isMobile ? 'MOBILE' : 'DESKTOP'}] Using Foursquare results`)
          // Convert Foursquare results to expected format
          const foursquareFormatResults = foursquareResults.map((place: any) => {
            return {
              place_id: place.fsq_id || place.id,
              name: place.title || place.name,
              geometry: {
                location: {
                  lat: place.location?.lat || place.latitude,
                  lng: place.location?.lng || place.longitude
                }
              },
              rating: place.rating,
              price_level: place.priceLevel,
              types: place.types || place.categories?.map((cat: any) => typeof cat === 'string' ? cat.toLowerCase().replace(/\s+/g, '_') : cat.name?.toLowerCase().replace(/\s+/g, '_')) || [],
              vicinity: place.address || place.location?.address || "",
              description: place.description || "",
              photos: place.photoUrl ? [{
                photo_reference: place.photoUrl, // This is actually a full URL, not a reference
                width: 400,
                height: 300
              }] : []
            }
          })
        
          return NextResponse.json({
            results: foursquareFormatResults,
            status: "OK",
            source: "foursquare"
          })
        } else {
          console.log(`⚠️ [${isMobile ? 'MOBILE' : 'DESKTOP'}] Foursquare Places API returned 0 results - returning empty array`)
          return NextResponse.json({
            results: [],
            status: "OK",
            source: "foursquare"
          })
        }
      } else {
        console.log(`⚠️ [${isMobile ? 'MOBILE' : 'DESKTOP'}] Foursquare Places API response not OK - returning empty array`)
        return NextResponse.json({
          results: [],
          status: "OK",
          source: "foursquare"
        })
      }
    } catch (foursquareError) {
      console.log(`⚠️ [${isMobile ? 'MOBILE' : 'DESKTOP'}] Foursquare Places API failed - returning empty array:`, foursquareError)
      return NextResponse.json({
        results: [],
        status: "ERROR",
        source: "foursquare",
        error: foursquareError instanceof Error ? foursquareError.message : "Unknown error"
      })
    }
  } else {
    console.log(`⚠️ [${isMobile ? 'MOBILE' : 'DESKTOP'}] Foursquare Places API service key not found - returning empty array`)
    return NextResponse.json({
      results: [],
      status: "ERROR",
      source: "foursquare",
      error: "Foursquare API key not configured"
    })
  }
}



// Add POST method support to handle frontend requests
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { lat, lng, radius = "10" } = body // Ultra-precise: 10 meters for exact location pinning
  
  // Detect mobile vs desktop from headers
  const userAgent = request.headers.get("user-agent") || ""
  const deviceType = request.headers.get("x-device-type") || "unknown"
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent) || deviceType === "mobile"
  
  try {
    
    console.log(`🌐 [${isMobile ? 'MOBILE' : 'DESKTOP'}] Places API POST request:`, { lat, lng, radius, deviceType })

    if (!lat || !lng) {
      return NextResponse.json({ error: "Missing lat/lng parameters" }, { status: 400 })
    }

    // NEW: Try Foursquare Places API first
    const foursquareServiceKey = process.env.FSQ_PLACES_SERVICE_KEY || process.env.FOURSQUARE_API_KEY || process.env.NEXT_PUBLIC_FOURSQUARE_API_KEY
    
    if (foursquareServiceKey) {
      console.log(`🌐 [${isMobile ? 'MOBILE' : 'DESKTOP'}] Trying Foursquare Places API first...`)
      try {
        // Call the new /api/foursquare-places endpoint
        const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL 
          ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` 
          : process.env.VERCEL_URL 
          ? `https://${process.env.VERCEL_URL}`
          : 'http://localhost:3000'
        
        const foursquareResponse = await fetch(`${baseUrl}/api/foursquare-places?lat=${lat}&lng=${lng}&radius=${parseInt(radius)}&limit=5`, {
          headers: {
            'Accept': 'application/json',
          },
        })
        
        if (foursquareResponse.ok) {
          const foursquareData = await foursquareResponse.json()
          const foursquareResults = foursquareData.items || []
        
          console.log(`✅ [${isMobile ? 'MOBILE' : 'DESKTOP'}] Foursquare Places API: Found ${foursquareResults.length} places`)
        
        // Debug: Log first result details
          if (foursquareResults.length > 0) {
          console.log(`🔍 [${isMobile ? 'MOBILE' : 'DESKTOP'}] First Foursquare result:`, JSON.stringify(foursquareResults[0], null, 2))
        }
        
        // ONLY use Foursquare - no Google fallback
          if (foursquareResults.length > 0) {
          console.log(`📸 [${isMobile ? 'MOBILE' : 'DESKTOP'}] Using Foursquare results`)
          // Convert Foursquare results to expected format
          const foursquareFormatResults = foursquareResults.map((place: any) => {
            return {
              place_id: place.fsq_id || place.id,
              name: place.title || place.name,
              geometry: {
                location: {
                  lat: place.location?.lat || place.latitude,
                  lng: place.location?.lng || place.longitude
                }
              },
              rating: place.rating,
              price_level: place.priceLevel,
              types: place.types || place.categories?.map((cat: any) => typeof cat === 'string' ? cat.toLowerCase().replace(/\s+/g, '_') : cat.name?.toLowerCase().replace(/\s+/g, '_')) || [],
              vicinity: place.address || place.location?.address || "",
              description: place.description || "",
              photos: place.photoUrl ? [{
                photo_reference: place.photoUrl, // This is actually a full URL, not a reference
                width: 400,
                height: 300
              }] : []
            }
          })
          
          return NextResponse.json({
            results: foursquareFormatResults,
            status: "OK",
            source: "foursquare"
          })
          } else {
            console.log(`⚠️ [${isMobile ? 'MOBILE' : 'DESKTOP'}] Foursquare Places API returned 0 results - returning empty array`)
            return NextResponse.json({
              results: [],
              status: "OK",
              source: "foursquare"
            })
          }
        } else {
          console.log(`⚠️ [${isMobile ? 'MOBILE' : 'DESKTOP'}] Foursquare Places API response not OK - returning empty array`)
          return NextResponse.json({
            results: [],
            status: "OK",
            source: "foursquare"
          })
        }
      } catch (foursquareError) {
        console.log(`⚠️ [${isMobile ? 'MOBILE' : 'DESKTOP'}] Foursquare Places API failed - returning empty array:`, foursquareError)
        return NextResponse.json({
          results: [],
          status: "ERROR",
          source: "foursquare",
          error: foursquareError instanceof Error ? foursquareError.message : "Unknown error"
        })
      }
    } else {
      console.log(`⚠️ [${isMobile ? 'MOBILE' : 'DESKTOP'}] Foursquare Places API service key not found - returning empty array`)
      return NextResponse.json({
        results: [],
        status: "ERROR",
        source: "foursquare",
        error: "Foursquare API key not configured"
      })
    }
}
