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

    // Primary: "<name> <city>" (only if name is meaningful)
    if (meaningfulName) {
      if (city) {
        queries.push(`${meaningfulName} ${city}`)
      } else {
        queries.push(meaningfulName)
      }
    }

    // Fallback #1: "<category> <city>" if category exists
    if (category && city) {
      queries.push(`${category} ${city}`)
    }

    // Fallback #2: "<city>" alone
    if (city) {
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
      url.searchParams.set("per_page", "1")

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
        const first = data.results?.[0]
        return first ?? null
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

