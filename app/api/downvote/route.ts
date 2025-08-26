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

    // Find the place to downvote
    const place = pins.find((pin: any) => pin.placeId === placeId)
    
    if (!place) {
      return NextResponse.json(
        { error: 'Place not found' },
        { status: 404 }
      )
    }

    // Check if user already downvoted this place recently (rate limiting)
    const recentDownvotes = pins.filter((pin: any) => 
      pin.placeId === placeId && 
      pin.originalPinId && 
      pin.originalPinId.includes(userId) &&
      pin.timestamp && 
      daysAgo(pin.timestamp) < 1 // Within 24 hours
    )

    if (recentDownvotes.length > 0) {
      return NextResponse.json(
        { error: 'Already downvoted this place today' },
        { status: 429 }
      )
    }

    // Increment downvotes
    place.downvotes += 1
    place.updatedAt = new Date().toISOString()
    
    // Check if place should be hidden based on downvote threshold
    const shouldHide = place.downvotes >= MAP_LIFECYCLE.DOWNVOTE_HIDE_THRESHOLD ||
                      (place.downvotes > place.recentEndorsements * 0.5) // Hide if downvotes exceed 50% of recent endorsements
    
    if (shouldHide) {
      place.isHidden = true
      console.log(`🚫 Place hidden due to downvotes: ${place.locationName || place.name}`)
    }
    
    // Recompute trending score with downvote event
    const events = [
      { daysAgo: 0, weight: getEventWeight('downvote') }
    ]
    place.score = computeTrendingScore(events, MAP_LIFECYCLE.DECAY_HALF_LIFE_DAYS)
    
    // Update in localStorage
    const updatedPins = pins.map((pin: any) => 
      pin.id === place.id ? place : pin
    )
    localStorage.setItem('pinit-pins', JSON.stringify(updatedPins))
    
    console.log(`👎 Downvoted place: ${place.locationName || place.name} (${place.downvotes} downvotes)`)
    
    return NextResponse.json({
      success: true,
      place: place,
      action: 'downvoted',
      isHidden: place.isHidden
    })
    
  } catch (error) {
    console.error('❌ Error in downvote endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 
