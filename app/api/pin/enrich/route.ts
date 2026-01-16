/**
 * PINIT Pin Enrichment API Route
 * Orchestrates the hybrid pin enrichment pipeline
 */

import { NextRequest, NextResponse } from 'next/server'
import { resolvePlaceIdentity } from '@/lib/pinEnrich/resolvePlaceIdentity'
import { tryWikidataMatch, shouldAttemptWikidata } from '@/lib/pinEnrich/wikidata'
import { fetchWebsitePreview } from '@/lib/pinEnrich/websitePreview'
import { fetchFacebookPreview } from '@/lib/pinEnrich/facebookPreview'
import { downloadAndUploadImage } from '@/lib/pinEnrich/imageStore'
import { getCached, setCached, getCacheKey } from '@/lib/pinEnrich/cache'
import type { EnrichedPin } from '@/lib/pinEnrich/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/pin/enrich
 * Enrich a pin location with place identity, description, and images
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { lat, lng, userHintName } = body
    
    // Validate input
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return NextResponse.json(
        { error: 'Invalid input: lat and lng must be numbers' },
        { status: 400 }
      )
    }
    
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json(
        { error: 'Invalid coordinates: out of range' },
        { status: 400 }
      )
    }
    
    // Check cache
    const cacheKey = getCacheKey(lat, lng)
    const cached = getCached(cacheKey)
    if (cached) {
      console.log(`✅ Returning cached enrichment for ${cacheKey}`)
      return NextResponse.json({ status: 'ok', data: cached })
    }
    
    // Step 1: Resolve place identity
    console.log(`📍 Resolving place identity for ${lat}, ${lng}`)
    const place = await resolvePlaceIdentity(lat, lng, userHintName)
    
    // Step 2: Fetch website preview first (official site)
    let websitePreview = null
    if (place.website) {
      console.log(`🌐 Fetching website preview for: ${place.website}`)
      websitePreview = await fetchWebsitePreview(place.website)

      // Copy discovered social links onto place (if found)
      if (websitePreview?.discovered?.facebookUrl && !place.facebookUrl) {
        place.facebookUrl = websitePreview.discovered.facebookUrl
      }
      if (websitePreview?.discovered?.instagramUrl && !place.instagramUrl) {
        place.instagramUrl = websitePreview.discovered.instagramUrl
      }
    }

    // Step 3: Facebook page preview (OG only) if discovered/known
    let facebookPreview = null
    if (place.facebookUrl) {
      console.log(`📘 Fetching Facebook preview for: ${place.facebookUrl}`)
      facebookPreview = await fetchFacebookPreview(place.facebookUrl)
    }
    
    // Step 4: Build image candidates (website -> facebook -> wikimedia -> stock)
    const imageCandidates: Array<{ url: string; source: 'website' | 'facebook' | 'wikimedia' | 'stock' }> = []
    
    // Add website preview images
    if (websitePreview?.images) {
      for (const imgUrl of websitePreview.images) {
        imageCandidates.push({ url: imgUrl, source: 'website' })
      }
    }

    // Add Facebook preview images next (only if we still need more)
    if (facebookPreview?.images && imageCandidates.length < 3) {
      for (const imgUrl of facebookPreview.images) {
        imageCandidates.push({ url: imgUrl, source: 'facebook' })
      }
    }

    // Step 4b: Wikidata only after website/facebook, and only if we still need description/images
    let wikidata = null
    const needsMoreImages = imageCandidates.length === 0
    const needsDescription = !websitePreview?.description && !facebookPreview?.description

    if ((needsMoreImages || needsDescription) && shouldAttemptWikidata(place)) {
      console.log(`🔍 Trying Wikidata match for: ${place.name}`)
      wikidata = await tryWikidataMatch(place)
      if (wikidata?.wikidataId) {
        place.wikidataId = wikidata.wikidataId
      }

      if (wikidata && wikidata.wikidataId && wikidata.commonsImages && wikidata.commonsImages.length > 0 && imageCandidates.length < 3) {
        for (const imgUrl of wikidata.commonsImages.slice(0, 3)) {
          imageCandidates.push({ url: imgUrl, source: 'wikimedia' })
        }
      }
    } else if (!shouldAttemptWikidata(place)) {
      console.log(`⏭️ Skipping Wikidata: confidence too low (${place.confidence}) or road-like name`)
    }
    
    // Step 5: Download and upload images (max 3)
    const images: EnrichedPin['images'] = []
    for (const candidate of imageCandidates.slice(0, 3)) {
      try {
        const hostedUrl = await downloadAndUploadImage(candidate.url, cacheKey, candidate.source)
        if (hostedUrl) {
          images.push({
            url: hostedUrl,
            source: candidate.source,
            sourceUrl: candidate.url,
            fetchedAt: new Date().toISOString()
          })
        }
      } catch (error) {
        console.error(`❌ Failed to process image ${candidate.url}:`, error)
        // Continue with other images
      }
    }
    
    // Step 6: Build description (prioritize website, then facebook, then wikidata)
    let description: string | undefined
    if (websitePreview?.description) {
      description = websitePreview.description
    } else if (facebookPreview?.description) {
      description = facebookPreview.description
    } else if (wikidata?.description) {
      description = wikidata.description
    }
    
    // Step 7: Build final EnrichedPin
    const enriched: EnrichedPin = {
      place,
      description,
      images
    }
    
    // Add debug info in non-production
    if (process.env.NODE_ENV !== 'production') {
      enriched.debug = {
        wikidataMatch: wikidata ? { id: wikidata.wikidataId, hasDescription: !!wikidata.description, imageCount: wikidata.commonsImages?.length || 0 } : null,
        websitePreview: websitePreview ? { imageCount: websitePreview.images.length, hasDescription: !!websitePreview.description, hasFacebook: !!websitePreview.discovered?.facebookUrl } : null,
        facebookPreview: facebookPreview ? { imageCount: facebookPreview.images.length, hasDescription: !!facebookPreview.description } : null,
        imageCandidatesCount: imageCandidates.length,
        imagesProcessed: images.length
      }
    }
    
    // Step 8: Cache the result
    setCached(cacheKey, enriched)
    
    console.log(`✅ Enrichment complete: ${place.name}, ${images.length} images`)
    
    return NextResponse.json({ status: 'ok', data: enriched })
  } catch (error) {
    console.error('❌ Error in pin enrichment:', error)
    return NextResponse.json(
      { error: 'Failed to enrich pin', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
