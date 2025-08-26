import { NextRequest, NextResponse } from 'next/server'
import { isMapLifecycleEnabled } from '@/lib/mapLifecycle'
import { needsPinMigration, migrateAllPins } from '@/lib/pinMigration'

// Test endpoint to verify pin management system
export async function GET(request: NextRequest) {
  try {
    const systemStatus = {
      enabled: isMapLifecycleEnabled(),
      needsMigration: needsPinMigration(),
      timestamp: new Date().toISOString()
    }

    if (systemStatus.enabled && systemStatus.needsMigration) {
      console.log('🔄 Auto-migrating pins...')
      const migratedPins = migrateAllPins()
      systemStatus.migratedPins = migratedPins.length
    }

    return NextResponse.json({
      success: true,
      systemStatus,
      message: systemStatus.enabled 
        ? 'Pin management system is enabled and ready' 
        : 'Pin management system is disabled. Set NEXT_PUBLIC_FEATURE_MAP_LIFECYCLE=true to enable.'
    })

  } catch (error) {
    console.error('❌ Error in test endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 
