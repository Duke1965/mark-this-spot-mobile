/**
 * Firebase Storage Image Upload Utility
 * Converts base64 images to Firebase Storage URLs
 */

import { storage } from './firebase'
import { ref, uploadBytes, getDownloadURL, UploadResult } from 'firebase/storage'

/**
 * Upload a base64 image to Firebase Storage
 * @param base64Image - Base64 encoded image data
 * @param filename - Unique filename for the image
 * @returns Promise with Firebase Storage download URL
 */
export async function uploadImageToFirebase(
  base64Image: string, 
  filename: string
): Promise<string> {
  try {
    console.log('📤 Uploading image to Firebase Storage:', filename)
    
    // Check if Firebase is configured
    if (!storage || !storage.ref) {
      console.warn('⚠️ Firebase Storage not configured, returning original base64 URL')
      return base64Image
    }
    
    // Convert base64 to blob
    const response = await fetch(base64Image)
    const blob = await response.blob()
    
    // Create a reference to the storage location
    const storageRef = ref(storage, `pinit-images/${filename}`)
    
    // Upload the blob
    const uploadResult: UploadResult = await uploadBytes(storageRef, blob)
    
    // Get the download URL
    const downloadURL = await getDownloadURL(uploadResult.ref)
    
    console.log('✅ Image uploaded successfully:', downloadURL)
    return downloadURL
  } catch (error) {
    console.error('❌ Error uploading image to Firebase:', error)
    // Fallback to base64 if upload fails
    return base64Image
  }
}

/**
 * Upload a canvas/rendered image to Firebase Storage
 * @param canvasDataUrl - Canvas data URL
 * @param filename - Unique filename for the image
 * @returns Promise with Firebase Storage download URL
 */
export async function uploadCanvasImageToFirebase(
  canvasDataUrl: string,
  filename: string
): Promise<string> {
  return uploadImageToFirebase(canvasDataUrl, filename)
}

/**
 * Generate a unique filename for an image
 * @param userId - User ID from auth
 * @param timestamp - Timestamp (optional)
 * @returns Unique filename string
 */
export function generateImageFilename(userId?: string, timestamp?: string): string {
  const uid = userId || 'anonymous'
  const ts = timestamp || Date.now().toString()
  return `${uid}_${ts}_${Math.random().toString(36).substring(2, 9)}.jpg`
}
