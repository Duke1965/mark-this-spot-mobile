/**
 * Yelp Photos API Route
 * Fetches business photos from Yelp Fusion API
 * Called only on "Done" to save rate limits
 */

import { NextRequest, NextResponse } from 'next/server'

const YELP_API_KEY = process.env.YELP_API_KEY
const YELP_BASE_URL = 'https://api.yelp.com/v3'

/**
 * POST /api/yelp-photos
 * Input: { lat: number, lng: number, term?: string }
 * Output: { images: [{ url: string, source: "yelp" }] }
 */
export async function POST(request: NextRequest) {
  try {
    if (!YELP_API_KEY) {
      console.warn('⚠️ YELP_API_KEY not configured')
      return NextResponse.json({ images: [] }, { status: 200 }) // Return empty, don't error
    }

    const body = await request.json()
    const { lat, lng, term } = body

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return NextResponse.json(
        { error: 'Invalid input: lat and lng must be numbers' },
        { status: 400 }
      )
    }

    console.log('🍽️ Yelp photos request:', { lat, lng, term })

    // Step 1: Search for businesses near the location
    const searchParams = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lng.toString(),
      radius: '1000', // 1km radius
      limit: '1', // Just get the closest one
      sort_by: 'distance'
    })

    if (term) {
      searchParams.append('term', term)
    }

    const searchResponse = await fetch(`${YELP_BASE_URL}/businesses/search?${searchParams}`, {
      headers: {
        'Authorization': `Bearer ${YELP_API_KEY}`,
        'Accept': 'application/json'
      },
      next: { revalidate: 3600 } // Cache for 1 hour
    })

    if (!searchResponse.ok) {
      console.warn(`⚠️ Yelp search failed: ${searchResponse.status}`)
      return NextResponse.json({ images: [] }, { status: 200 })
    }

    const searchData = await searchResponse.json()
    const businesses = searchData.businesses || []

    if (businesses.length === 0) {
      console.log('🍽️ No Yelp businesses found nearby')
      return NextResponse.json({ images: [] }, { status: 200 })
    }

    // Step 2: Get business details for the closest business
    const businessId = businesses[0].id
    console.log(`🍽️ Found business: ${businesses[0].name} (${businessId})`)

    const detailsResponse = await fetch(`${YELP_BASE_URL}/businesses/${businessId}`, {
      headers: {
        'Authorization': `Bearer ${YELP_API_KEY}`,
        'Accept': 'application/json'
      },
      next: { revalidate: 3600 }
    })

    if (!detailsResponse.ok) {
      console.warn(`⚠️ Yelp business details failed: ${detailsResponse.status}`)
      return NextResponse.json({ images: [] }, { status: 200 })
    }

    const businessDetails = await detailsResponse.json()
    const photos = businessDetails.photos || []

    console.log(`✅ Yelp returned ${photos.length} photos`)

    // Return images in consistent format
    const images = photos.map((url: string) => ({
      url,
      source: 'yelp' as const
    }))

    return NextResponse.json({ images }, { status: 200 })

  } catch (error) {
    console.error('❌ Yelp photos error:', error)
    // Don't fail the request - return empty images
    return NextResponse.json({ images: [] }, { status: 200 })
  }
}

