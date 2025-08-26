import { NextRequest, NextResponse } from 'next/server'
import { isMapLifecycleEnabled } from '@/lib/mapLifecycle'
import { performNightlyMaintenance, getMaintenanceStatistics, saveMaintenanceTimestamp } from '@/lib/nightlyMaintenance'

// GET: Get maintenance status and statistics
export async function GET(request: NextRequest) {
  try {
    // Check if pin management system is enabled
    if (!isMapLifecycleEnabled()) {
      return NextResponse.json(
        { error: 'Pin management system not enabled' },
        { status: 400 }
      )
    }

    // Get pins from localStorage to calculate statistics
    const pinsJson = localStorage.getItem('pinit-pins') || '[]'
    const pins = JSON.parse(pinsJson)
    
    const maintenanceStats = getMaintenanceStatistics(pins)
    
    return NextResponse.json({
      success: true,
      maintenance: maintenanceStats,
      message: 'Maintenance system status retrieved'
    })

  } catch (error) {
    console.error('❌ Error in maintenance GET endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST: Trigger manual maintenance
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
    const { force = false } = body

    // Get pins from localStorage
    const pinsJson = localStorage.getItem('pinit-pins') || '[]'
    const pins = JSON.parse(pinsJson)

    if (pins.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pins to maintain',
        maintenance: {
          pinsProcessed: 0,
          scoresUpdated: 0,
          lifecycleUpdated: 0,
          expiredPins: 0,
          newClassics: 0,
          newTrending: 0,
          hiddenPins: 0,
          errors: []
        }
      })
    }

    console.log('🔧 Manual maintenance triggered...')
    
    // Perform maintenance
    const { pins: updatedPins, report } = performNightlyMaintenance(pins)
    
    // Save updated pins back to localStorage
    localStorage.setItem('pinit-pins', JSON.stringify(updatedPins))
    
    // Save maintenance timestamp
    saveMaintenanceTimestamp(report.timestamp)
    
    console.log('✅ Manual maintenance completed')
    
    return NextResponse.json({
      success: true,
      message: 'Maintenance completed successfully',
      maintenance: report,
      pinsUpdated: updatedPins.length
    })

  } catch (error) {
    console.error('❌ Error in maintenance POST endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 
