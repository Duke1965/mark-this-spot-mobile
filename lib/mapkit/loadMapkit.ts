/**
 * Apple MapKit JS Loader
 * Dynamically loads MapKit JS library and resolves when ready
 */

declare global {
  interface Window {
    mapkit?: any
    __mapkitInitialized?: boolean
  }
}

let mapkitLoadPromise: Promise<void> | null = null

/**
 * Load MapKit JS library dynamically
 * Idempotent - won't load twice
 */
export async function loadMapkit(): Promise<void> {
  // Return existing promise if already loading/loaded
  if (mapkitLoadPromise) {
    return mapkitLoadPromise
  }

  // If already loaded, resolve immediately
  if (typeof window !== 'undefined' && window.mapkit) {
    return Promise.resolve()
  }

  // Create new load promise
  mapkitLoadPromise = new Promise<void>((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('MapKit can only be loaded in browser environment'))
      return
    }

    // Check if already loaded (race condition check)
    if (window.mapkit) {
      resolve()
      return
    }

    // Create script element
    const script = document.createElement('script')
    script.src = 'https://cdn.apple-mapkit.com/mk/5.x.x/mapkit.js'
    script.async = true
    script.crossOrigin = 'anonymous'

    // Handle script load
    script.onload = () => {
      // Wait for mapkit to be available
      const checkMapkit = () => {
        if (window.mapkit) {
          console.log('✅ MapKit JS loaded successfully')
          resolve()
        } else {
          // Retry after short delay
          setTimeout(checkMapkit, 50)
        }
      }
      checkMapkit()
    }

    // Handle script error
    script.onerror = () => {
      const error = new Error('Failed to load MapKit JS library')
      console.error('❌ MapKit load error:', error)
      mapkitLoadPromise = null // Reset so we can retry
      reject(error)
    }

    // Append to document head
    document.head.appendChild(script)
  })

  return mapkitLoadPromise
}

