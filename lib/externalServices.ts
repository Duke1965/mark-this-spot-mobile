/**
 * External Services Configuration
 * Manages API keys and configuration for third-party services
 */

// Unsplash API Key (server-side only - do NOT prefix with NEXT_PUBLIC_)
export const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY || ""

// Validate Unsplash configuration (server-side only)
export function validateUnsplashConfig(): { valid: boolean; error?: string } {
  if (!UNSPLASH_ACCESS_KEY) {
    if (typeof window === "undefined") {
      // Server-side: log warning but don't crash
      console.warn("⚠️ Unsplash access key missing. Set UNSPLASH_ACCESS_KEY in your environment variables.")
    }
    return {
      valid: false,
      error: "Unsplash access key not configured"
    }
  }

  return {
    valid: true
  }
}

