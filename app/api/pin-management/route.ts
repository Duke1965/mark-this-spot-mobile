import { NextRequest, NextResponse } from 'next/server'
import { isMapLifecycleEnabled } from '@/lib/mapLifecycle'
import { MAP_LIFECYCLE } from '@/lib/mapLifecycle'
import { daysAgo } from '@/lib/trending'

// GET endpoint for pin management system tabs
export async function GET(request: NextRequest) {
  try {
    // Check if pin management system is enabled
    if (!isMapLifecycleEnabled()) {
      return NextResponse.json(
        { error: 'Pin management system not enabled' },
        { status: 400 }
      )
    }

    const { searchParams } = new URL(request.url)
    const tab = searchParams.get('tab') || 'all'
    const bounds = searchParams.get('bounds')
    const zoom = searchParams.get('zoom')

    // Validate tab parameter
    const validTabs = ['recent', 'trending', 'classics', 'all']
    if (!validTabs.includes(tab)) {
      return NextResponse.json(
        { error: 'Invalid tab parameter. Must be one of: recent, trending, classics, all' },
        { status: 400 }
      )
    }

    // Get pins from localStorage
    const pinsJson = localStorage.getItem('pinit-pins') || '[]'
    const pins = JSON.parse(pinsJson)

    // Filter pins based on tab
    let filteredPins = pins.filter((pin: any) => {
      // Skip hidden places
      if (pin.isHidden) return false
      
      // Skip pins without placeId (not migrated yet)
      if (!pin.placeId) return false

      switch (tab) {
        case 'recent':
          // Recent: lastEndorsedAt within RECENT_WINDOW_DAYS
          return pin.lastEndorsedAt && 
                 daysAgo(pin.lastEndorsedAt) <= MAP_LIFECYCLE.RECENT_WINDOW_DAYS

        case 'trending':
          // Trending: (endorsements + renewals) in TRENDING_WINDOW_DAYS >= TRENDING_MIN_BURST
          return pin.recentEndorsements >= MAP_LIFECYCLE.TRENDING_MIN_BURST

        case 'classics':
          // Classics: old places with many endorsements
          const daysSinceCreation = daysAgo(pin.timestamp)
          return daysSinceCreation >= MAP_LIFECYCLE.CLASSICS_MIN_AGE_DAYS &&
                 pin.totalEndorsements >= MAP_LIFECYCLE.CLASSICS_MIN_TOTAL_ENDORSEMENTS

        case 'all':
        default:
          // All: everything not hidden
          return true
      }
    })

    // Apply bounds filtering if provided
    if (bounds) {
      try {
        const boundsData = JSON.parse(bounds)
        if (boundsData.north && boundsData.south && boundsData.east && boundsData.west) {
          filteredPins = filteredPins.filter((pin: any) => {
            return pin.latitude >= boundsData.south &&
                   pin.latitude <= boundsData.north &&
                   pin.longitude >= boundsData.west &&
                   pin.longitude <= boundsData.east
          })
        }
      } catch (e) {
        console.warn('Invalid bounds parameter:', bounds)
      }
    }

    // Sort based on tab
    switch (tab) {
      case 'trending':
        filteredPins.sort((a: any, b: any) => (b.score || 0) - (a.score || 0))
        break
      case 'recent':
      case 'all':
        filteredPins.sort((a: any, b: any) => 
          new Date(b.lastEndorsedAt || b.timestamp).getTime() - 
          new Date(a.lastEndorsedAt || a.timestamp).getTime()
        )
        break
      case 'classics':
        filteredPins.sort((a: any, b: any) => (b.totalEndorsements || 0) - (a.totalEndorsements || 0))
        break
    }

    // Transform to API response format
    const places = filteredPins.map((pin: any) => ({
      id: pin.placeId || pin.id,
      name: pin.locationName || pin.title,
      lat: pin.latitude,
      lng: pin.longitude,
      category: pin.category || 'general',
      totalEndorsements: pin.totalEndorsements || 1,
      recentEndorsements: pin.recentEndorsements || 1,
      lastEndorsedAt: pin.lastEndorsedAt || pin.timestamp,
      score: pin.score || 1.0,
      downvotes: pin.downvotes || 0,
      isHidden: pin.isHidden || false,
      // Include original pin data for backward compatibility
      originalPin: {
        id: pin.id,
        mediaUrl: pin.mediaUrl,
        mediaType: pin.mediaType,
        title: pin.title,
        description: pin.description,
        tags: pin.tags,
        personalThoughts: pin.personalThoughts
      }
    }))

    console.log(`✅ [${tab.toUpperCase()}] Found ${places.length} places`)

    return NextResponse.json({
      places,
      tab,
      count: places.length,
      bounds: bounds ? JSON.parse(bounds) : null,
      zoom: zoom ? parseInt(zoom) : null
    })

  } catch (error) {
    console.error('❌ Error in pin-management GET endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 
