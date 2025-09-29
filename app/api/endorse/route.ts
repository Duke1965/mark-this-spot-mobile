import { NextRequest, NextResponse } from 'next/server'
import { isMapLifecycleEnabled } from '@/lib/mapLifecycle'
import { migrateAllPins, needsPinMigration } from '@/lib/pinMigration'
import { computeTrendingScore, getEventWeight, daysAgo } from '@/lib/trending'
import { MAP_LIFECYCLE } from '@/lib/mapLifecycle'
import { getItem, setItem, removeItem } from '@/lib/serverStore'

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
    const { googlePlaceId, name, lat, lng, category, userId } = body

    // Validate required fields
    if (!googlePlaceId || !name || lat === undefined || lng === undefined || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: googlePlaceId, name, lat, lng, userId' },
        { status: 400 }
      )
    }

    // Migrate existing pins if needed
    if (needsPinMigration()) {
      console.log('?? Migrating existing pins...')
      migrateAllPins()
    }

    // Get existing pins from server store
    const pinsJson = getItem('pinit-pins') || '[]'
    const pins = JSON.parse(pinsJson)

    // Find existing place by Google Place ID
    let existingPlace = pins.find((pin: any) => 
      pin.googlePlaceId === googlePlaceId && pin.placeId
    )

    if (existingPlace) {
      // Check if user already endorsed this place
      const existingEndorsement = pins.find((pin: any) => 
        pin.placeId === existingPlace.placeId && 
        pin.originalPinId && 
        pin.originalPinId.includes(userId)
      )

      if (existingEndorsement) {
        return NextResponse.json(
          { error: 'User already endorsed this place' },
          { status: 409 }
        )
      }

      // Increment endorsements and update place
      existingPlace.totalEndorsements += 1
      
      const daysSinceLastEndorsement = daysAgo(existingPlace.lastEndorsedAt)
      if (daysSinceLastEndorsement <= MAP_LIFECYCLE.RECENT_WINDOW_DAYS) {
        existingPlace.recentEndorsements += 1
      }
      
      existingPlace.lastEndorsedAt = new Date().toISOString()
      
      // Recompute trending score
      const events = [
        { daysAgo: 0, weight: getEventWeight('endorsement') }
      ]
      existingPlace.score = computeTrendingScore(events, MAP_LIFECYCLE.DECAY_HALF_LIFE_DAYS)
      
      // Update in server store
      const updatedPins = pins.map((pin: any) => 
        pin.id === existingPlace.id ? existingPlace : pin
      )
      setItem('pinit-pins', JSON.stringify(updatedPins))
      
      console.log("Updated existing place:", existingPlace.locationName)
      
      return NextResponse.json({
        success: true,
        place: existingPlace,
        action: 'updated'
      })
    } else {
      // Create new place
      const now = new Date().toISOString()
      const newPlace = {
        id: `place_${Date.now()}`,
        googlePlaceId,
        name,
        lat,
        lng,
        category: category || 'general',
        createdAt: now,
        updatedAt: now,
        totalEndorsements: 1,
        recentEndorsements: 1, // Within recent window
        lastEndorsedAt: now,
        score: 1.0, // Initial score
        downvotes: 0,
        isHidden: false
      }
      
      // Add to pins array
      pins.push(newPlace)
      setItem('pinit-pins', JSON.stringify(pins))
      
      console.log("Created new place:", newPlace.name)
      
      return NextResponse.json({
        success: true,
        place: newPlace,
        action: 'created'
      })
    }
  } catch (error) {
    console.error('? Error in endorse endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
