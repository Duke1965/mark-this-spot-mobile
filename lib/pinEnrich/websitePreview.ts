/**
 * PINIT Website Preview Fetcher
 * Safely fetches and parses website metadata (OG tags, JSON-LD, etc.)
 */

export interface WebsitePreview {
  images: string[]
  name?: string
  description?: string
  sourceUrl: string
  discovered: {
    facebookUrl?: string
    instagramUrl?: string
  }
}

// Per-domain throttle tracking
const domainThrottle = new Map<string, number>()
const THROTTLE_MS = 1000 // 1 second between requests per domain

// In-memory cache for robots.txt decisions and preview results (24h)
const robotsCache = new Map<string, { allowed: boolean; expiresAt: number }>()
const previewCache = new Map<string, { data: WebsitePreview; expiresAt: number }>()
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

/**
 * Validate URL and block unsafe schemes
 */
export function validateUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    
    // Only allow http and https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false
    }
    
    // Block localhost and private IPs
    const hostname = parsed.hostname.toLowerCase()
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.16.') ||
      hostname.startsWith('172.17.') ||
      hostname.startsWith('172.18.') ||
      hostname.startsWith('172.19.') ||
      hostname.startsWith('172.20.') ||
      hostname.startsWith('172.21.') ||
      hostname.startsWith('172.22.') ||
      hostname.startsWith('172.23.') ||
      hostname.startsWith('172.24.') ||
      hostname.startsWith('172.25.') ||
      hostname.startsWith('172.26.') ||
      hostname.startsWith('172.27.') ||
      hostname.startsWith('172.28.') ||
      hostname.startsWith('172.29.') ||
      hostname.startsWith('172.30.') ||
      hostname.startsWith('172.31.')
    ) {
      return false
    }
    
    return true
  } catch {
    return false
  }
}

/**
 * Strip tracking parameters from URL
 */
function cleanUrl(url: string): string {
  try {
    const parsed = new URL(url)
    // Remove common tracking params
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ref', 'fbclid', 'gclid']
    trackingParams.forEach(param => parsed.searchParams.delete(param))
    return parsed.toString()
  } catch {
    return url
  }
}

/**
 * Normalize "website" URLs so we fetch the canonical homepage first.
 * - ensure http/https
 * - drop fragments and query params
 * - normalize common "leaf" paths back to origin (/contact, /about, /index.html, etc.)
 */
export function normalizeWebsiteUrl(url: string): string {
  const trimmed = (url || '').trim()
  if (!trimmed) return url

  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`

  try {
    const parsed = new URL(withScheme)
    parsed.hash = ''
    parsed.search = ''

    const path = (parsed.pathname || '/').toLowerCase()
    const leafPaths = [
      '/',
      '/index.html',
      '/index.htm',
      '/home',
      '/contact',
      '/contact-us',
      '/about',
      '/about-us'
    ]

    if (leafPaths.includes(path) || path.endsWith('/index.html') || path.endsWith('/index.htm')) {
      parsed.pathname = '/'
    }

    return parsed.toString()
  } catch {
    return withScheme
  }
}

/**
 * Check robots.txt (simplified parser)
 */
async function checkRobotsAllowed(url: string): Promise<boolean> {
  try {
    const parsed = new URL(url)
    const origin = `${parsed.protocol}//${parsed.hostname}`
    const cacheKey = `robots:${origin}`
    
    // Check cache
    const cached = robotsCache.get(cacheKey)
    if (cached && Date.now() < cached.expiresAt) {
      return cached.allowed
    }
    
    // Fetch robots.txt with timeout
    const robotsUrl = `${origin}/robots.txt`
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 2000)
    
    try {
      const response = await fetch(robotsUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'PINITPreviewBot/1.0'
        }
      })
      
      clearTimeout(timeout)
      
      if (!response.ok) {
        // If robots.txt doesn't exist or fails, default to allowed
        robotsCache.set(cacheKey, { allowed: true, expiresAt: Date.now() + CACHE_TTL })
        return true
      }
      
      const text = await response.text()
      
      // Simple parser: look for User-agent: * block
      let inUniversalBlock = false
      let disallowAll = false
      
      for (const line of text.split('\n')) {
        const trimmed = line.trim()
        if (trimmed.startsWith('User-agent:')) {
          const ua = trimmed.substring(11).trim()
          inUniversalBlock = ua === '*'
        } else if (inUniversalBlock && trimmed.startsWith('Disallow:')) {
          const path = trimmed.substring(9).trim()
          if (path === '/') {
            disallowAll = true
            break
          }
        }
      }
      
      const allowed = !disallowAll
      robotsCache.set(cacheKey, { allowed, expiresAt: Date.now() + CACHE_TTL })
      return allowed
    } catch (error) {
      clearTimeout(timeout)
      // On error, default to allowed but still throttle
      robotsCache.set(cacheKey, { allowed: true, expiresAt: Date.now() + CACHE_TTL })
      return true
    }
  } catch {
    return true // Default allow on error
  }
}

/**
 * Check and enforce per-domain throttle
 */
function checkThrottle(domain: string): boolean {
  const lastFetch = domainThrottle.get(domain) || 0
  const now = Date.now()
  
  if (now - lastFetch < THROTTLE_MS) {
    return false // Throttled
  }
  
  domainThrottle.set(domain, now)
  return true
}

/**
 * Parse HTML and extract meta tags and JSON-LD
 * Uses regex as fallback (cheerio would be better but not required)
 */
function parseHtml(html: string, baseUrl: string): WebsitePreview {
  const images = new Set<string>()
  let name: string | undefined
  let description: string | undefined
  let facebookUrl: string | undefined
  let instagramUrl: string | undefined
  
  // Extract OG image
  const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i)
  if (ogImageMatch?.[1]) {
    images.add(resolveUrl(ogImageMatch[1], baseUrl))
  }
  
  // Extract OG image secure URL
  const ogImageSecureMatch = html.match(/<meta\s+property=["']og:image:secure_url["']\s+content=["']([^"']+)["']/i)
  if (ogImageSecureMatch?.[1]) {
    images.add(resolveUrl(ogImageSecureMatch[1], baseUrl))
  }
  
  // Extract Twitter image
  const twitterImageMatch = html.match(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i)
  if (twitterImageMatch?.[1]) {
    images.add(resolveUrl(twitterImageMatch[1], baseUrl))
  }
  
  // Extract OG title/name
  const ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i)
  if (ogTitleMatch?.[1]) {
    name = ogTitleMatch[1]
  }
  
  // Extract OG description
  const ogDescMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i)
  if (ogDescMatch?.[1]) {
    description = ogDescMatch[1]
  }
  
  // Extract JSON-LD (simplified - looks for image and logo)
  const jsonLdMatches = html.matchAll(/<script\s+type=["']application\/ld\+json["']>([^<]+)<\/script>/gi)
  for (const match of jsonLdMatches) {
    try {
      const json = JSON.parse(match[1])
      const processJsonLd = (obj: any) => {
        if (typeof obj !== 'object' || obj === null) return
        
        if (obj['@type'] && (obj.image || obj.logo)) {
          if (obj.image) {
            const img = typeof obj.image === 'string' ? obj.image : obj.image.url || obj.image['@id']
            if (img) images.add(resolveUrl(img, baseUrl))
          }
          if (obj.logo) {
            const logo = typeof obj.logo === 'string' ? obj.logo : obj.logo.url || obj.logo['@id']
            if (logo) images.add(resolveUrl(logo, baseUrl))
          }
          if (obj.name && !name) name = obj.name
          if (obj.description && !description) description = obj.description
        }
        
        // Recurse
        Object.values(obj).forEach(val => {
          if (typeof val === 'object' && val !== null) processJsonLd(val)
        })
      }
      
      if (Array.isArray(json)) {
        json.forEach(processJsonLd)
      } else {
        processJsonLd(json)
      }
    } catch {
      // Invalid JSON, skip
    }
  }
  
  // Filter images - exclude non-photo files and logos/icons
  const filteredImages = Array.from(images)
    .filter(img => {
      const imgLower = img.toLowerCase()
      // Exclude file types
      if (imgLower.endsWith('.svg') || 
          imgLower.endsWith('.ico') || 
          imgLower.startsWith('data:')) {
        return false
      }
      // Exclude logos, icons, sprites, badges
      if (imgLower.includes('logo') ||
          imgLower.includes('icon') ||
          imgLower.includes('favicon') ||
          imgLower.includes('sprite') ||
          imgLower.includes('badge')) {
        return false
      }
      return true
    })
    .slice(0, 3) // Max 3 images

  // Discover social links from anchors (conservative)
  try {
    const anchorMatches = html.matchAll(/<a[^>]+href=["']([^"'#]+)["'][^>]*>/gi)
    for (const match of anchorMatches) {
      const hrefRaw = (match[1] || '').trim()
      if (!hrefRaw) continue

      const href = resolveUrl(hrefRaw, baseUrl)
      if (!validateUrl(href)) continue

      const u = new URL(href)
      const host = u.hostname.toLowerCase()
      const path = u.pathname.toLowerCase()
      const full = href.toLowerCase()

      // Skip obvious non-page links
      if (
        full.includes('sharer.php') ||
        full.includes('/share') ||
        full.includes('/plugins/') ||
        full.includes('intent/') ||
        full.includes('oauth')
      ) {
        continue
      }

      if (!facebookUrl && (host === 'facebook.com' || host.endsWith('.facebook.com') || host === 'm.facebook.com')) {
        // Prefer /{page} style URLs (not groups/events/people)
        if (!path.startsWith('/share') && !path.startsWith('/groups') && !path.startsWith('/events') && !path.startsWith('/people')) {
          facebookUrl = href
        }
      }

      if (!instagramUrl && (host === 'instagram.com' || host.endsWith('.instagram.com'))) {
        // Prefer profile URLs like /{handle}/
        if (!path.startsWith('/p/') && !path.startsWith('/reel/') && !path.startsWith('/explore') && path.split('/').filter(Boolean).length <= 2) {
          instagramUrl = href
        }
      }

      if (facebookUrl && instagramUrl) break
    }
  } catch {
    // ignore
  }

  // If no OG/JSON-LD images, try a conservative "hero" <img> near the top
  let finalImages = filteredImages
  if (finalImages.length === 0) {
    const scanWindow = html.slice(0, 25000) // near top of document
    const imgMatches = scanWindow.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)
    for (const match of imgMatches) {
      const srcRaw = (match[1] || '').trim()
      if (!srcRaw) continue
      const src = resolveUrl(srcRaw, baseUrl)
      const lower = src.toLowerCase()

      if (!validateUrl(src)) continue
      if (lower.startsWith('data:') || lower.endsWith('.svg') || lower.endsWith('.ico')) continue
      if (lower.includes('logo') || lower.includes('icon') || lower.includes('favicon') || lower.includes('sprite') || lower.includes('badge')) continue
      if (!(/\.(jpe?g|png|webp)(\?|$)/i.test(src) || lower.includes('format=webp'))) continue

      finalImages = [src]
      break
    }
  }
  
  return {
    images: finalImages,
    name,
    description,
    sourceUrl: baseUrl,
    discovered: {
      facebookUrl,
      instagramUrl
    }
  }
}

/**
 * Resolve relative URL against base
 */
function resolveUrl(url: string, base: string): string {
  try {
    return new URL(url, base).toString()
  } catch {
    return url
  }
}

/**
 * Fetch website preview
 */
export async function fetchWebsitePreview(url: string): Promise<WebsitePreview | null> {
  const normalizedUrl = normalizeWebsiteUrl(url)

  // Validate URL
  if (!validateUrl(normalizedUrl)) {
    return null
  }
  
  // Clean URL (tracking params) after normalization
  const cleanedUrl = cleanUrl(normalizedUrl)
  
  // Check cache
  const cached = previewCache.get(cleanedUrl)
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data
  }
  
  try {
    const parsed = new URL(cleanedUrl)
    const domain = parsed.hostname
    
    // Check throttle
    if (!checkThrottle(domain)) {
      return null // Throttled
    }
    
    // Check robots.txt
    const robotsAllowed = await checkRobotsAllowed(cleanedUrl)
    if (!robotsAllowed) {
      return null // Disallowed by robots.txt
    }
    
    // Fetch HTML with timeout
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000) // 5 second timeout
    
    try {
      const response = await fetch(cleanedUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'PINITPreviewBot/1.0',
          'Accept': 'text/html,application/xhtml+xml'
        }
      })
      
      clearTimeout(timeout)
      
      if (!response.ok) {
        return null
      }
      
      // Limit response size (abort after ~1MB)
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let html = ''
      let bytesRead = 0
      const maxBytes = 1024 * 1024 // 1MB
      
      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          bytesRead += value.length
          if (bytesRead > maxBytes) break
          html += decoder.decode(value, { stream: true })
        }
      } else {
        html = await response.text()
      }
      
      // Parse HTML
      const finalUrl = response.url || cleanedUrl
      const preview = parseHtml(html, finalUrl)
      
      // Cache result
      previewCache.set(cleanedUrl, {
        data: preview,
        expiresAt: Date.now() + CACHE_TTL
      })
      
      return preview
    } catch (error) {
      clearTimeout(timeout)
      if (error instanceof Error && error.name === 'AbortError') {
        return null // Timeout
      }
      throw error
    }
  } catch (error) {
    console.error('❌ Error fetching website preview:', error)
    return null
  }
}
