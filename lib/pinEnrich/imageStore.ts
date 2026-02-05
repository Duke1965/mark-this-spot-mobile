/**
 * PINIT Image Storage
 * Downloads images from URLs and uploads to Firebase Storage
 */

import { createHash } from 'crypto'
import { getStorage } from 'firebase-admin/storage'
import { getAdminApp, getNormalizedBucketName } from '@/lib/firebaseAdmin'

/**
 * Generate deterministic path for image storage
 */
export function generateImagePath(cacheKey: string, source: string, imageUrl: string, extension: string): string {
  const hash = createHash('md5').update(imageUrl).digest('hex').substring(0, 8)
  return `pin_images/${cacheKey}/${source}/${hash}.${extension}`
}

/**
 * Download image to buffer with timeout
 */
export async function downloadToBuffer(
  imageUrl: string,
  timeoutMs: number = 5000
): Promise<{ buffer: Buffer; contentType: string }> {
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
    
    return { buffer: Buffer.from(arrayBuffer), contentType }
  } catch (error) {
    clearTimeout(timeout)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Image download timeout')
    }
    throw error
  }
}

function getExtensionFromContentType(contentType: string): string {
  const ct = contentType.toLowerCase()
  if (ct.includes('image/png')) return 'png'
  if (ct.includes('image/webp')) return 'webp'
  return 'jpg'
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
  contentType: string
): Promise<string> {
  const app = getAdminApp()
  if (!app) {
    throw new Error('Firebase Admin not initialized. Check service account env vars.')
  }

  const bucketName = getNormalizedBucketName()
  const storage = getStorage(app)
  // Prefer explicitly configured bucket, but fall back to default bucket if misconfigured.
  const tryUpload = async (bucketToUse: ReturnType<typeof storage.bucket>) => {
    const file = bucketToUse.file(path)
    await file.save(buffer, {
      resumable: false,
      metadata: { contentType }
    })
    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: '03-09-2491'
    })
    return signedUrl
  }

  if (bucketName) {
    try {
      return await tryUpload(storage.bucket(bucketName))
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      // Common when env var points at a non-existent bucket.
      if (
        msg.toLowerCase().includes('specified bucket does not exist') ||
        msg.toLowerCase().includes('bucket name not specified or invalid')
      ) {
        // Try the default bucket for the service account project.
        return await tryUpload(storage.bucket())
      }
      throw e
    }
  }

  return await tryUpload(storage.bucket())
}

/**
 * Download and upload image, returning our hosted URL
 */
export async function downloadAndUploadImage(
  imageUrl: string,
  cacheKey: string,
  source: 'wikimedia' | 'website' | 'facebook' | 'stock',
  opts?: { timeoutMs?: number; onError?: (info: { stage: 'init' | 'download' | 'upload'; message: string }) => void }
): Promise<string | null> {
  try {
    // Download image
    let buffer: Buffer
    let contentType: string
    try {
      const got = await downloadToBuffer(imageUrl, opts?.timeoutMs)
      buffer = got.buffer
      contentType = got.contentType
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      opts?.onError?.({ stage: msg.toLowerCase().includes('firebase admin') ? 'init' : 'download', message: msg })
      throw e
    }
    
    // Generate storage path
    const extension = getExtensionFromContentType(contentType)
    const path = generateImagePath(cacheKey, source, imageUrl, extension)
    
    // Upload to storage
    let hostedUrl: string
    try {
      hostedUrl = await uploadToStorage(buffer, path, contentType)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      const stage: 'init' | 'upload' =
        msg.toLowerCase().includes('firebase admin not initialized') || msg.toLowerCase().includes('credential')
          ? 'init'
          : 'upload'
      opts?.onError?.({ stage, message: msg })
      throw e
    }
    
    return hostedUrl
  } catch (error) {
    console.error(`❌ Failed to download/upload image ${imageUrl}:`, error)
    return null
  }
}
