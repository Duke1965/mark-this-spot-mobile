/**
 * PINIT Facebook Page Preview Fetcher
 * Fetches only basic OG metadata from a Facebook page URL (no scraping of albums).
 */

import { validateUrl } from './websitePreview'

export interface FacebookPreview {
  images: string[]
  name?: string
  description?: string
  sourceUrl: string
}

// Per-domain throttle tracking
const domainThrottle = new Map<string, number>()
const THROTTLE_MS = 1000

function checkThrottle(domain: string): boolean {
  const lastFetch = domainThrottle.get(domain) || 0
  const now = Date.now()
  if (now - lastFetch < THROTTLE_MS) return false
  domainThrottle.set(domain, now)
  return true
}

function isAllowedFacebookHost(hostname: string): boolean {
  const host = hostname.toLowerCase()
  return host === 'facebook.com' || host === 'm.facebook.com' || host.endsWith('.facebook.com')
}

export function validateFacebookUrl(url: string): boolean {
  if (!validateUrl(url)) return false
  try {
    const parsed = new URL(url)
    return isAllowedFacebookHost(parsed.hostname)
  } catch {
    return false
  }
}

function resolveOg(html: string): FacebookPreview {
  const images = new Set<string>()
  let name: string | undefined
  let description: string | undefined

  const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i)
  if (ogImageMatch?.[1]) images.add(ogImageMatch[1])

  const ogImageSecureMatch = html.match(/<meta\s+property=["']og:image:secure_url["']\s+content=["']([^"']+)["']/i)
  if (ogImageSecureMatch?.[1]) images.add(ogImageSecureMatch[1])

  const ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i)
  if (ogTitleMatch?.[1]) name = ogTitleMatch[1]

  const ogDescMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i)
  if (ogDescMatch?.[1]) description = ogDescMatch[1]

  const filteredImages = Array.from(images)
    .filter(u => {
      const lower = u.toLowerCase()
      if (!validateUrl(u)) return false
      if (lower.startsWith('data:') || lower.endsWith('.svg') || lower.endsWith('.ico')) return false
      if (lower.includes('logo') || lower.includes('icon') || lower.includes('favicon') || lower.includes('sprite') || lower.includes('badge')) return false
      return true
    })
    .slice(0, 1)

  return { images: filteredImages, name, description, sourceUrl: '' }
}

export async function fetchFacebookPreview(facebookPageUrl: string): Promise<FacebookPreview | null> {
  if (!validateFacebookUrl(facebookPageUrl)) return null

  try {
    const parsed = new URL(facebookPageUrl)
    const domain = parsed.hostname

    if (!checkThrottle(domain)) return null

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    try {
      const response = await fetch(facebookPageUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'PINITPreviewBot/1.0',
          'Accept': 'text/html,application/xhtml+xml'
        }
      })

      clearTimeout(timeout)
      if (!response.ok) return null

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let html = ''
      let bytesRead = 0
      const maxBytes = 1024 * 512 // 512KB is enough for OG tags

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

      const preview = resolveOg(html)
      preview.sourceUrl = response.url || facebookPageUrl

      if (preview.images.length === 0 && !preview.description && !preview.name) return null
      return preview
    } catch (error) {
      clearTimeout(timeout)
      if (error instanceof Error && error.name === 'AbortError') return null
      throw error
    }
  } catch (error) {
    console.error('❌ Error fetching Facebook preview:', error)
    return null
  }
}

