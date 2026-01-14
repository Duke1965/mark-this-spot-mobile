/**
 * PINIT Image Storage
 * Downloads images from URLs and uploads to Firebase Storage
 */

import { createHash } from 'crypto'

/**
 * Generate deterministic path for image storage
 */
export function generateImagePath(cacheKey: string, source: string, imageUrl: string): string {
  const hash = createHash('md5').update(imageUrl).digest('hex').substring(0, 8)
  const extension = 'jpg' // We'll normalize to jpg
  return `pin_images/${cacheKey}/${source}/${hash}.${extension}`
}

/**
 * Download image to buffer with timeout
 */
export async function downloadToBuffer(imageUrl: string, timeoutMs: number = 5000): Promise<Buffer> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  
  try {
    const response = await fetch(imageUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'PINITPreviewBot/1.0'
      }
    })
    
    clearTimeout(timeout)
    
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status}`)
    }
    
    const contentType = response.headers.get('content-type') || ''
    if (!contentType.startsWith('image/')) {
      throw new Error(`Invalid content type: ${contentType}`)
    }
    
    // Check if content type is allowed (jpeg, png, webp)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.some(type => contentType.includes(type))) {
      throw new Error(`Unsupported image type: ${contentType}`)
    }
    
    const arrayBuffer = await response.arrayBuffer()
    const maxSize = 5 * 1024 * 1024 // 5MB
    
    if (arrayBuffer.byteLength > maxSize) {
      throw new Error(`Image too large: ${arrayBuffer.byteLength} bytes`)
    }
    
    return Buffer.from(arrayBuffer)
  } catch (error) {
    clearTimeout(timeout)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Image download timeout')
    }
    throw error
  }
}

/**
 * Upload buffer to Firebase Storage
 * NOTE: This requires Firebase Admin SDK for server-side operations
 * 
 * For now, this is a placeholder that documents the requirement.
 * Implementation should use Firebase Admin SDK:
 * 
 * ```typescript
 * import admin from 'firebase-admin'
 * import { getStorage } from 'firebase-admin/storage'
 * 
 * const bucket = getStorage().bucket()
 * const file = bucket.file(path)
 * await file.save(buffer, {
 *   metadata: { contentType: 'image/jpeg' },
 *   public: true
 * })
 * const [url] = await file.getSignedUrl({ action: 'read', expires: '03-09-2491' })
 * return url
 * ```
 */
export async function uploadToStorage(
  buffer: Buffer,
  path: string,
  contentType: string = 'image/jpeg'
): Promise<string> {
  // TODO: Implement Firebase Admin SDK upload
  // For now, throw an error indicating Admin SDK is needed
  throw new Error(
    'Firebase Admin SDK required for server-side image upload. ' +
    'Please install firebase-admin and configure it, or implement upload logic.'
  )
  
  // Expected implementation:
  // 1. Initialize Firebase Admin if not already initialized
  // 2. Get storage bucket
  // 3. Upload buffer to path
  // 4. Make file public or generate signed URL
  // 5. Return public/signed URL
}

/**
 * Download and upload image, returning our hosted URL
 */
export async function downloadAndUploadImage(
  imageUrl: string,
  cacheKey: string,
  source: 'wikimedia' | 'website' | 'stock'
): Promise<string | null> {
  try {
    // Download image
    const buffer = await downloadToBuffer(imageUrl)
    
    // Generate storage path
    const path = generateImagePath(cacheKey, source, imageUrl)
    
    // Upload to storage
    const hostedUrl = await uploadToStorage(buffer, path, 'image/jpeg')
    
    return hostedUrl
  } catch (error) {
    console.error(`❌ Failed to download/upload image ${imageUrl}:`, error)
    return null
  }
}
