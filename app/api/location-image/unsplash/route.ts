import { type NextRequest, NextResponse } from "next/server"
import { UNSPLASH_ACCESS_KEY, validateUnsplashConfig } from "@/lib/externalServices"

/**
 * Unsplash Location Image API Route
 * Fetches location images from Unsplash based on place name, city, and category
 * Server-side only - API key is never exposed to client
 */

type UnsplashPhoto = {
  id: string
  urls: {
    small: string
    regular: string
  }
  user: {
    name: string
    links: { html: string }
  }
  links: { html: string }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const name = searchParams.get("name")
    const city = searchParams.get("city")
    const category = searchParams.get("category")

    console.log('🖼️ Unsplash API GET - params:', { name, city, category })

    // Validate that we have at least one parameter
    if (!name && !city && !category) {
      console.error('❌ Missing query parameters')
      return NextResponse.json(
        { error: "Missing query parameters. At least one of 'name', 'city', or 'category' is required." },
        { status: 400 }
      )
    }

    // Validate Unsplash configuration
    const config = validateUnsplashConfig()
    if (!config.valid) {
      console.error('❌ Unsplash access key not configured')
      return NextResponse.json(
        { error: config.error || "Unsplash access key not configured" },
        { status: 500 }
      )
    }

    // Build search queries with fallback strategy
    const queries: string[] = []

    // Filter out generic/placeholder names
    const meaningfulName = name && 
      name.trim() !== "" &&
      name !== "Location" &&
      name !== "PINIT Placeholder" &&
      name !== "Unknown Place" &&
      name !== "Quick Pin Location" &&
      !name.startsWith("Speed-based pin") &&
      !name.startsWith("Camera")
      ? name.trim()
      : null

    // Primary: Exact place name with city for most specific results
    if (meaningfulName) {
      if (city) {
        // Most specific: "Restaurant Name, City" format
        queries.push(`${meaningfulName}, ${city}`)
        // Also try without comma
        queries.push(`${meaningfulName} ${city}`)
        // Try just the name (in case it's very specific)
        queries.push(meaningfulName)
      } else {
        queries.push(meaningfulName)
      }
    }

    // Fallback #1: "<category> <city>" if category exists (less specific)
    if (category && city) {
      queries.push(`${category} ${city}`)
    }

    // Fallback #2: "<city>" alone (least specific - only if no name/category)
    if (city && !meaningfulName && !category) {
      queries.push(city)
    }

    // Fallback #3: just "<category>" (if city is missing and no meaningful name)
    if (category && !city && !meaningfulName) {
      queries.push(category)
    }

    // Remove duplicates
    const uniqueQueries = Array.from(new Set(queries))
    console.log('🔍 Unsplash search queries:', uniqueQueries)

    // Helper function to search Unsplash once
    async function searchOnce(query: string): Promise<UnsplashPhoto | null> {
      const url = new URL("https://api.unsplash.com/search/photos")
      url.searchParams.set("query", query)
      url.searchParams.set("orientation", "landscape")
      url.searchParams.set("per_page", "5") // Get more results to find better matches
      // Add relevance sorting to prioritize more relevant photos
      url.searchParams.set("order_by", "relevance")

      try {
        // Trim the key to remove any accidental whitespace
        const trimmedKey = UNSPLASH_ACCESS_KEY.trim()
        
        // Log key info for debugging (first 4 and last 4 chars only, never full key)
        const keyLength = trimmedKey.length
        const keyPreview = keyLength > 8 ? `${trimmedKey.substring(0, 4)}...${trimmedKey.substring(keyLength - 4)}` : "too short"
        console.log(`🔑 Unsplash key info: length=${keyLength}, preview=${keyPreview}`)
        
        if (keyLength !== 43) {
          console.warn(`⚠️ Unsplash key length is ${keyLength}, expected 43 characters`)
        }
        
        const response = await fetch(url.toString(), {
          headers: {
            Authorization: `Client-ID ${trimmedKey}`,
            "Accept-Version": "v1",
          },
          next: { revalidate: 3600 } // Cache for 1 hour
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`❌ Unsplash API error for query "${query}":`, response.status, errorText.substring(0, 200))
          return null
        }

        const data = await response.json()
        const results = data.results || []
        
        // Try to find a more relevant photo by checking descriptions/tags
        // Look for photos that might be of the actual place (not just generic stock photos)
        for (const photo of results) {
          const description = (photo.description || photo.alt_description || "").toLowerCase()
          const tags = (photo.tags || []).map((tag: any) => tag.title?.toLowerCase() || "").join(" ")
          const searchText = `${description} ${tags}`
          
          // If query contains a specific place name, prefer photos that mention it
          const queryLower = query.toLowerCase()
          if (queryLower.includes(",") || queryLower.split(" ").length <= 3) {
            // This looks like a specific place query - prefer photos that might be of the place
            // Check if description/tags mention the place name or location
            const placeWords = queryLower.split(/[,\s]+/).filter(w => w.length > 3)
            const hasPlaceMention = placeWords.some(word => searchText.includes(word))
            
            if (hasPlaceMention) {
              console.log(`✅ Found potentially relevant Unsplash photo for "${query}" (matches place name)`)
              return photo
            }
          }
        }
        
        // If no specific match found, return the first result
        return results[0] ?? null
      } catch (error) {
        console.error(`❌ Unsplash fetch error for query "${query}":`, error)
        return null
      }
    }

    // Try each query in order until we find a result
    let photo: UnsplashPhoto | null = null

    for (const query of uniqueQueries) {
      photo = await searchOnce(query)
      if (photo) {
        console.log(`✅ Found Unsplash image for query: "${query}"`)
        break
      }
    }

    if (!photo) {
      console.log('⚠️ No Unsplash image found for any query')
      return NextResponse.json(
        { error: "No image found" },
        { status: 404 }
      )
    }

    // Format response with attribution
    const result = {
      imageUrl: photo.urls.small,
      imageUrlLarge: photo.urls.regular,
      photographerName: photo.user.name,
      photographerProfileUrl: photo.user.links.html,
      unsplashPhotoLink: photo.links.html,
    }

    console.log('✅ Unsplash API: Returning image with attribution')

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      }
    })
  } catch (error) {
    console.error('❌ Unsplash handler error:', error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

