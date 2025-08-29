// Centralized Helper Functions for PINIT
// Common utility functions used across components

import { UI_CONFIG, LOCATION_CONFIG, ERROR_MESSAGES } from './constants'

// Device Detection
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false
  return window.innerWidth <= UI_CONFIG.MOBILE_BREAKPOINT
}

export function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}

export function isAndroidDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Android/.test(navigator.userAgent)
}

// Network & Connectivity
export function isOnline(): boolean {
  if (typeof navigator === 'undefined') return true
  return navigator.onLine
}

export async function waitForNetwork(timeout: number = 5000): Promise<boolean> {
  return new Promise((resolve) => {
    if (isOnline()) {
      resolve(true)
      return
    }

    const timeoutId = setTimeout(() => {
      window.removeEventListener('online', onlineHandler)
      resolve(false)
    }, timeout)

    const onlineHandler = () => {
      clearTimeout(timeoutId)
      window.removeEventListener('online', onlineHandler)
      resolve(true)
    }

    window.addEventListener('online', onlineHandler)
  })
}

// Retry Logic
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      
      if (attempt === maxAttempts) {
        throw lastError
      }

      const delay = baseDelay * Math.pow(2, attempt - 1)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError!
}

// Location Utilities
export function calculateDistance(
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number {
  const R = 6371 // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export function isValidCoordinates(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
}

export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m`
  } else if (distanceKm < 100) {
    return `${distanceKm.toFixed(1)}km`
  } else {
    return `${Math.round(distanceKm)}km`
  }
}

// Time & Date Utilities
export function formatTimeAgo(timestamp: string): string {
  const now = new Date()
  const date = new Date(timestamp)
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMinutes < 1) return 'just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`
  return `${Math.floor(diffDays / 365)}y ago`
}

export function isRecentPin(timestamp: string, hoursThreshold: number = 24): boolean {
  const now = new Date()
  const pinTime = new Date(timestamp)
  const diffHours = (now.getTime() - pinTime.getTime()) / (1000 * 60 * 60)
  return diffHours <= hoursThreshold
}

// String Utilities
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength - 3) + '...'
}

export function capitalizeFirst(text: string): string {
  if (!text) return text
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
}

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Array Utilities
export function removeDuplicates<T>(array: T[], keyFn?: (item: T) => string): T[] {
  if (!keyFn) {
    return [...new Set(array)]
  }
  
  const seen = new Set<string>()
  return array.filter(item => {
    const key = keyFn(item)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

// Storage Utilities
export function getStorageSize(key: string): number {
  try {
    const item = localStorage.getItem(key)
    return item ? new Blob([item]).size : 0
  } catch {
    return 0
  }
}

export function getTotalStorageUsage(): number {
  try {
    let total = 0
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('pinit-')) {
        total += getStorageSize(key)
      }
    }
    return total
  } catch {
    return 0
  }
}

export function formatStorageSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  
  return `${size.toFixed(1)}${units[unitIndex]}`
}

// Error Handling
export function getLocationErrorMessage(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return ERROR_MESSAGES.LOCATION_PERMISSION_DENIED
    case error.POSITION_UNAVAILABLE:
      return ERROR_MESSAGES.LOCATION_UNAVAILABLE
    case error.TIMEOUT:
      return ERROR_MESSAGES.LOCATION_TIMEOUT
    default:
      return 'An unknown location error occurred'
  }
}

export function handleAsyncError(error: unknown, context: string): void {
  const message = error instanceof Error ? error.message : 'Unknown error'
  console.error(`❌ ${context}:`, message)
  
  // In a real app, you might send this to an error tracking service
  // errorTracking.captureException(error, { context })
}

// Debouncing
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}

// Feature Flag Utilities
export function isFeatureEnabled(featureName: keyof typeof import('./constants').FEATURE_FLAGS): boolean {
  try {
    const { FEATURE_FLAGS } = require('./constants')
    return FEATURE_FLAGS[featureName] ?? false
  } catch {
    return false
  }
}

// URL & Media Utilities
export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

export function generateUniqueId(prefix: string = ''): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `${prefix}${timestamp}-${random}`
}

// Platform Detection
export function getPlatformInfo(): {
  isMobile: boolean
  isIOS: boolean
  isAndroid: boolean
  userAgent: string
} {
  return {
    isMobile: isMobileDevice(),
    isIOS: isIOSDevice(),
    isAndroid: isAndroidDevice(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : ''
  }
} 
