import { type NextRequest, NextResponse } from "next/server"

/**
 * Wikimedia Image Resolver API Route
 * Resolves place images via Wikidata → Wikimedia Commons
 * 
 * Process:
 * 1. Search Wikidata by name (and optionally lat/lng for proximity matching)
 * 2. Extract image from Wikidata entity (P18, P242, P154)
 * 3. Convert to Wikimedia Commons URL
 * 4. Return image URL
 */

const WIKIDATA_SEARCH_BASE = 'https://www.wikidata.org/w/api.php'
const WIKIMEDIA_COMMONS_BASE = 'https://commons.wikimedia.org/wiki/Special:FilePath'

// Simple in-memory cache with 1 hour TTL
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 3600000 // 1 hour

// Simple rate limiting: max 10 requests per minute per IP
const rateLimit = new Map<string, number[]>()
const RATE_LIMIT_MAX = 10
const RATE_LIMIT_WINDOW = 60000 // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const requests = rateLimit.get(ip) || []
  
  // Remove old requests outside the window
  const recentRequests = requests.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW)
  
  if (recentRequests.length >= RATE_LIMIT_MAX) {
    return false // Rate limit exceeded
  }
  
  recentRequests.push(now)
  rateLimit.set(ip, recentRequests)
  return true
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  // Haversine formula for distance in km
  const R = 6371 // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const name = searchParams.get("name")
  const lat = searchParams.get("lat")
  const lng = searchParams.get("lng")

  console.log('🖼️ Wikimedia resolve API GET - params:', { name, lat, lng })

  if (!name) {
    return NextResponse.json({ 
      error: "Missing 'name' parameter" 
    }, { status: 400 })
  }

  // Rate limiting
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
  if (!checkRateLimit(ip)) {
    console.warn(`⚠️ Rate limit exceeded for IP: ${ip}`)
    return NextResponse.json({ 
      error: "Rate limit exceeded. Please try again later." 
    }, { status: 429 })
  }

  // Check cache
  const cacheKey = `${name}:${lat || ''}:${lng || ''}`
  const cached = cache.get(cacheKey)
  const now = Date.now()
  
  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    console.log('✅ Using cached Wikimedia result')
    return NextResponse.json(cached.data, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        'X-Cache': 'HIT'
      }
    })
  }

  try {
    // STEP 1: Search Wikidata by name
    const searchUrl = new URL(WIKIDATA_SEARCH_BASE)
    searchUrl.searchParams.set('action', 'wbsearchentities')
    searchUrl.searchParams.set('search', name)
    searchUrl.searchParams.set('language', 'en')
    searchUrl.searchParams.set('format', 'json')
    searchUrl.searchParams.set('limit', '10') // Get top 10 results

    console.log('🔍 Searching Wikidata:', searchUrl.toString())

    const searchResponse = await fetch(searchUrl.toString(), {
      next: { revalidate: 3600 } // Cache for 1 hour
    })

    if (!searchResponse.ok) {
      console.error(`❌ Wikidata search failed: ${searchResponse.status}`)
      return NextResponse.json({ 
        imageUrl: null,
        error: 'Wikidata search failed'
      }, { status: searchResponse.status })
    }

    const searchData = await searchResponse.json()
    const searchResults = searchData.search || []

    if (searchResults.length === 0) {
      console.log('📍 No Wikidata results found')
      const result = { imageUrl: null, source: 'wikimedia' }
      cache.set(cacheKey, { data: result, timestamp: now })
      return NextResponse.json(result)
    }

    console.log(`✅ Found ${searchResults.length} Wikidata results`)

    // STEP 2: Filter by proximity if lat/lng provided
    let bestResult = searchResults[0]
    
    if (lat && lng) {
      const latNum = parseFloat(lat)
      const lngNum = parseFloat(lng)
      
      if (!isNaN(latNum) && !isNaN(lngNum)) {
        // Get entities with coordinates to find closest match
        const entityIds = searchResults.map((r: any) => r.id).slice(0, 5) // Check top 5
        
        let closestResult = searchResults[0]
        let closestDistance = Infinity
        
        for (const result of searchResults.slice(0, 5)) {
          // Fetch entity to get coordinates
          const entityUrl = new URL(WIKIDATA_SEARCH_BASE)
          entityUrl.searchParams.set('action', 'wbgetentities')
          entityUrl.searchParams.set('ids', result.id)
          entityUrl.searchParams.set('props', 'claims')
          entityUrl.searchParams.set('format', 'json')
          
          try {
            const entityResponse = await fetch(entityUrl.toString(), {
              next: { revalidate: 3600 }
            })
            
            if (entityResponse.ok) {
              const entityData = await entityResponse.json()
              const entity = entityData.entities?.[result.id]
              
              if (entity?.claims?.P625) {
                // P625 is coordinate location
                const coordClaim = entity.claims.P625[0]
                const entityLat = coordClaim.mainsnak.datavalue?.value?.latitude
                const entityLng = coordClaim.mainsnak.datavalue?.value?.longitude
                
                if (entityLat && entityLng) {
                  const distance = calculateDistance(latNum, lngNum, entityLat, entityLng)
                  
                  if (distance < closestDistance && distance < 10) { // Within 10km
                    closestDistance = distance
                    closestResult = result
                    console.log(`✅ Found closer match: ${result.id} (${distance.toFixed(2)}km away)`)
                  }
                }
              }
            }
          } catch (error) {
            // Continue to next result if entity fetch fails
            console.warn(`⚠️ Error fetching entity ${result.id}:`, error)
          }
        }
        
        if (closestDistance < Infinity) {
          bestResult = closestResult
        }
      }
    }

    // STEP 3: Fetch entity details to get image
    const entityUrl = new URL(WIKIDATA_SEARCH_BASE)
    entityUrl.searchParams.set('action', 'wbgetentities')
    entityUrl.searchParams.set('ids', bestResult.id)
    entityUrl.searchParams.set('props', 'claims')
    entityUrl.searchParams.set('format', 'json')

    console.log('🔍 Fetching Wikidata entity:', bestResult.id)

    const entityResponse = await fetch(entityUrl.toString(), {
      next: { revalidate: 3600 }
    })

    if (!entityResponse.ok) {
      console.error(`❌ Wikidata entity fetch failed: ${entityResponse.status}`)
      const result = { imageUrl: null, source: 'wikimedia' }
      cache.set(cacheKey, { data: result, timestamp: now })
      return NextResponse.json(result)
    }

    const entityData = await entityResponse.json()
    const entity = entityData.entities?.[bestResult.id]

    if (!entity) {
      console.log('📍 Entity not found')
      const result = { imageUrl: null, source: 'wikimedia' }
      cache.set(cacheKey, { data: result, timestamp: now })
      return NextResponse.json(result)
    }

    // STEP 4: Extract image from entity (priority: P18 > P242 > P154)
    let imageFilename: string | null = null

    // P18: image (best - main image on Commons)
    if (entity.claims?.P18?.[0]?.mainsnak?.datavalue?.value) {
      imageFilename = entity.claims.P18[0].mainsnak.datavalue.value
      console.log('✅ Found P18 image:', imageFilename)
    }
    // P242: locator map (fallback)
    else if (entity.claims?.P242?.[0]?.mainsnak?.datavalue?.value) {
      imageFilename = entity.claims.P242[0].mainsnak.datavalue.value
      console.log('✅ Found P242 locator map:', imageFilename)
    }
    // P154: logo (last resort)
    else if (entity.claims?.P154?.[0]?.mainsnak?.datavalue?.value) {
      imageFilename = entity.claims.P154[0].mainsnak.datavalue.value
      console.log('✅ Found P154 logo:', imageFilename)
    }

    if (!imageFilename) {
      console.log('📍 No image found in Wikidata entity')
      const result = { imageUrl: null, source: 'wikimedia', qid: bestResult.id }
      cache.set(cacheKey, { data: result, timestamp: now })
      return NextResponse.json(result)
    }

    // STEP 5: Convert to Wikimedia Commons URL
    // Format: https://commons.wikimedia.org/wiki/Special:FilePath/{encoded_filename}?width=1200
    const encodedFilename = encodeURIComponent(imageFilename.replace(/ /g, '_'))
    const imageUrl = `${WIKIMEDIA_COMMONS_BASE}/${encodedFilename}?width=1200`

    console.log(`✅ Wikimedia image URL: ${imageUrl.substring(0, 80)}...`)

    const result = {
      imageUrl,
      source: 'wikimedia',
      qid: bestResult.id
    }

    // Cache the result
    cache.set(cacheKey, { data: result, timestamp: now })

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        'X-Cache': 'MISS'
      }
    })

  } catch (error) {
    console.error('❌ Wikimedia resolve API error:', error)
    return NextResponse.json({
      imageUrl: null,
      source: 'wikimedia',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

