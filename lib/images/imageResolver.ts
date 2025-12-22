/**
 * Unified Image Resolver
 * Resolves place images with aggressive caching:
 * 1. Check Firebase/DB cache first
 * 2. Try Wikimedia (via Wikidata)
 * 3. Fallback to paid provider
 * 4. Final fallback: placeholder
 */

export interface ImageResolverInput {
  placeId: string // Canonical place ID we store for pins
  name?: string
  lat?: number
  lng?: number
  address?: string
}

export interface ImageResolverResult {
  imageUrl: string | null
  source: 'wikimedia' | 'mapbox' | 'paid' | 'placeholder' | 'cached' | 'none'
  qid?: string // Wikidata QID if from Wikimedia
  cached?: boolean // True if retrieved from cache
}

/**
 * Resolve place image with caching
 * This function checks cache first, then tries Wikimedia, then paid provider
 */
export async function resolvePlaceImage(
  input: ImageResolverInput
): Promise<ImageResolverResult> {
  const { placeId, name, lat, lng } = input

  console.log(`🖼️ Resolving image for placeId: ${placeId}`, { name, lat, lng })

  // STEP 1: Check cache (Firebase/DB)
  // TODO: Implement Firebase cache check (Step E)
  // For now, we'll skip cache and always fetch fresh
  // const cached = await getCachedImage(placeId)
  // if (cached && cached.imageUrl) {
  //   return {
  //     imageUrl: cached.imageUrl,
  //     source: 'cached',
  //     cached: true
  //   }
  // }

  // Helper: Check if name is just a street address (not a notable place)
  const isStreetAddress = (name: string): boolean => {
    const streetPatterns = [
      /\b(street|road|avenue|drive|lane|way|boulevard|court|place|terrace|close|grove|park|gardens|square|circle|hill|view|heights|ridge|valley)\b/i,
      /^\d+\s+[A-Za-z]/i, // Starts with number (e.g., "123 Main Street")
      /,\s*[A-Za-z]/ // Contains comma (e.g., "Main Street, City")
    ]
    return streetPatterns.some(pattern => pattern.test(name))
  }

  // STEP 2: Try Wikimedia (via Wikidata) - but skip for street addresses
  // Only try Wikimedia for notable places, not street addresses
  const shouldTryWikimedia = name && name.trim() && 
    name !== "Location" && 
    name !== "Unknown Place" &&
    !isStreetAddress(name) // Skip street addresses
  
  if (shouldTryWikimedia) {
    try {
      console.log(`🖼️ Attempting Wikimedia lookup for: "${name}"`)
      const wikimediaUrl = `/api/wikimedia/resolve?name=${encodeURIComponent(name)}${lat && lng ? `&lat=${lat}&lng=${lng}` : ''}`
      console.log(`🖼️ Wikimedia API URL: ${wikimediaUrl}`)
      
      const wikimediaResponse = await fetch(wikimediaUrl)

      if (wikimediaResponse.ok) {
        const wikimediaData = await wikimediaResponse.json()
        console.log(`🖼️ Wikimedia API response:`, { 
          hasImageUrl: !!wikimediaData.imageUrl,
          source: wikimediaData.source,
          qid: wikimediaData.qid,
          error: wikimediaData.error
        })
        
        if (wikimediaData.imageUrl) {
          console.log(`✅ Wikimedia image found: ${wikimediaData.imageUrl.substring(0, 50)}...`)
          
          return {
            imageUrl: wikimediaData.imageUrl,
            source: 'wikimedia',
            qid: wikimediaData.qid
          }
        } else {
          console.log(`⚠️ Wikimedia API returned no imageUrl for "${name}"`)
        }
      } else {
        const errorText = await wikimediaResponse.text().catch(() => 'Unknown error')
        console.warn(`⚠️ Wikimedia API failed: ${wikimediaResponse.status} - ${errorText.substring(0, 200)}`)
      }
    } catch (error) {
      console.error(`❌ Wikimedia lookup error:`, error)
      if (error instanceof Error) {
        console.error(`❌ Error message: ${error.message}`)
        console.error(`❌ Error stack: ${error.stack?.substring(0, 300)}`)
      }
    }
  } else {
    if (name && isStreetAddress(name)) {
      console.log(`⚠️ Skipping Wikimedia lookup - street address detected: "${name}"`)
    } else {
      console.log(`⚠️ Skipping Wikimedia lookup - invalid name: "${name}"`)
    }
  }

  // STEP 2.5: Try Mapbox Static Images API ONLY if Wikimedia didn't find an image
  // Mapbox static map should be a fallback, not used in photo carousel if Wikimedia has a photo
  // We skip this step entirely - Mapbox static images should only be used as a last resort
  // and should not appear in the photo carousel when Wikimedia images exist

  // STEP 3: Fallback to paid provider (ONLY if Wikimedia fails)
  // TODO: Implement paid provider (Step D)
  // try {
  //   const paidImage = await fetchPaidPlacePhoto({ placeId, name, lat, lng })
  //   if (paidImage) {
  //     // Store in cache
  //     await storeCachedImage(placeId, {
  //       imageUrl: paidImage,
  //       imageSource: 'paid',
  //       imageUpdatedAt: new Date().toISOString()
  //     })
  //     return { imageUrl: paidImage, source: 'paid' }
  //   }
  // } catch (error) {
  //   console.warn('⚠️ Paid provider error:', error)
  // }

  // STEP 4: Final fallback - placeholder
  console.log(`⚠️ No image found for ${placeId}, using placeholder`)
  return {
    imageUrl: '/pinit-placeholder.jpg',
    source: 'placeholder'
  }
}

