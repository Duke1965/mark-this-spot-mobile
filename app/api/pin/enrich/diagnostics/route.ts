/**
 * PINIT Pin Enrichment Diagnostics Route
 * Debug endpoint for testing website preview parsing
 */

import { NextRequest, NextResponse } from 'next/server'
import { fetchWebsitePreview } from '@/lib/pinEnrich/websitePreview'
import { validateUrl } from '@/lib/pinEnrich/websitePreview'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/pin/enrich/diagnostics?url=...
 * Returns parsed OG/JSON-LD candidates without downloading images (debug only)
 */
export async function GET(request: NextRequest) {
  // Protect this route - only allow in non-production or with auth
  if (process.env.NODE_ENV === 'production') {
    // In production, you might want to add authentication
    // For now, we'll allow it but log access
    console.warn('⚠️ Diagnostics route accessed in production')
  }
  
  try {
    const { searchParams } = new URL(request.url)
    const url = searchParams.get('url')
    
    if (!url) {
      return NextResponse.json(
        { error: 'Missing url parameter' },
        { status: 400 }
      )
    }
    
    // Validate URL
    if (!validateUrl(url)) {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      )
    }
    
    // Fetch preview (this will parse but not download images in the current implementation)
    const preview = await fetchWebsitePreview(url)
    
    if (!preview) {
      return NextResponse.json(
        { error: 'Failed to fetch preview', url },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      url,
      preview: {
        images: preview.images,
        name: preview.name,
        description: preview.description,
        sourceUrl: preview.sourceUrl
      }
    })
  } catch (error) {
    console.error('❌ Error in diagnostics route:', error)
    return NextResponse.json(
      { error: 'Failed to fetch diagnostics', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
