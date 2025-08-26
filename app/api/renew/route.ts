import { NextRequest, NextResponse } from 'next/server'
import { isMapLifecycleEnabled } from '@/lib/mapLifecycle'
import { computeTrendingScore, getEventWeight, daysAgo } from '@/lib/trending'
import { MAP_LIFECYCLE } from '@/lib/mapLifecycle'

export async function POST(request: NextRequest) {
  try {
    // Check if pin management system is enabled
    if (!isMapLifecycleEnabled()) {
      return NextResponse.json(
        { error: 'Pin management system not enabled' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { placeId, userId } = body

    // Validate required fields
    if (!placeId || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: placeId, userId' },
        { status: 400 }
      )
    }

    // Get existing pins from localStorage
    const pinsJson = localStorage.getItem('pinit-pins') || '[]'
    const pins = JSON.parse(pinsJson)

    // Find the place to renew
    const place = pins.find((pin: any) => pin.placeId === placeId)
    
    if (!place) {
      return NextResponse.json(
        { error: 'Place not found' },
        { status: 404 }
      )
    }

    // Check if user already renewed this place recently (rate limiting)
    const recentRenewals = pins.filter((pin: any) => 
      pin.placeId === placeId && 
      pin.originalPinId && 
      pin.originalPinId.includes(userId) &&
      pin.timestamp && 
      daysAgo(pin.timestamp) < 1 // Within 24 hours
    )

    if (recentRenewals.length > 0) {
      return NextResponse.json(
        { error: 'Already renewed this place today' },
        { status: 429 }
      )
    }

    // Update place with renewal
    const now = new Date().toISOString()
    place.lastEndorsedAt = now
    place.updatedAt = now
    
    // Increment recent endorsements if within window
    const daysSinceLastEndorsement = daysAgo(place.lastEndorsedAt)
    if (daysSinceLastEndorsement <= MAP_LIFECYCLE.RECENT_WINDOW_DAYS) {
      place.recentEndorsements += 1
    }
    
    // Recompute trending score with renewal event
    const events = [
      { daysAgo: 0, weight: getEventWeight('renewal') }
    ]
    place.score = computeTrendingScore(events, MAP_LIFECYCLE.DECAY_HALF_LIFE_DAYS)
    
    // Update in localStorage
    const updatedPins = pins.map((pin: any) => 
      pin.id === place.id ? place : pin
    )
    localStorage.setItem('pinit-pins', JSON.stringify(updatedPins))
    
    console.log(`✅ Renewed place: ${place.locationName || place.name}`)
    
    return NextResponse.json({
      success: true,
      place: place,
      action: 'renewed'
    })
    
  } catch (error) {
    console.error('❌ Error in renew endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 
