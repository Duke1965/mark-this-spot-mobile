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
  source: 'wikimedia' | 'paid' | 'placeholder' | 'cached' | 'none'
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

  // STEP 2: Try Wikimedia (via Wikidata)
  // Only skip if name is explicitly "Location" or empty
  const shouldTryWikimedia = name && name.trim() && name !== "Location" && name !== "Unknown Place"
  
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
          
          // TODO: Store in Firebase cache (Step E)
          // await storeCachedImage(placeId, {
          //   imageUrl: wikimediaData.imageUrl,
          //   imageSource: 'wikimedia',
          //   imageUpdatedAt: new Date().toISOString(),
          //   qid: wikimediaData.qid
          // })

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
    console.log(`⚠️ Skipping Wikimedia lookup - invalid name: "${name}"`)
  }

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

