import { NextRequest, NextResponse } from 'next/server'
import { isMapLifecycleEnabled } from '@/lib/mapLifecycle'
import { getLifecycleStatistics, getPinsForTab } from '@/lib/pinLifecycle'
import { getScoreInsights } from '@/lib/scoringEngine'
import { getMaintenanceStatistics } from '@/lib/nightlyMaintenance'

// GET: Get comprehensive dashboard data
export async function GET(request: NextRequest) {
  try {
    // Check if pin management system is enabled
    if (!isMapLifecycleEnabled()) {
      return NextResponse.json(
        { error: 'Pin management system not enabled' },
        { status: 400 }
      )
    }

    // Get pins from localStorage
    const pinsJson = localStorage.getItem('pinit-pins') || '[]'
    const pins = JSON.parse(pinsJson)

    if (pins.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pins found',
        dashboard: {
          totalPins: 0,
          lifecycle: { recent: 0, trending: 0, classics: 0, all: 0, expiringSoon: 0 },
          scoring: { averageScore: 0, topPins: [], trendingPins: [] },
          maintenance: { status: 'up-to-date', nextMaintenance: new Date().toISOString() },
          system: { enabled: true, migrated: false, health: 'healthy' }
        }
      })
    }

    // Get lifecycle statistics
    const lifecycleStats = getLifecycleStatistics(pins)
    
    // Get scoring insights for top pins
    const sortedByScore = [...pins].sort((a, b) => (b.score || 0) - (a.score || 0))
    const topPins = sortedByScore.slice(0, 5).map(pin => ({
      id: pin.id,
      name: pin.locationName || pin.title,
      score: pin.score || 0,
      category: pin.category || 'general',
      totalEndorsements: pin.totalEndorsements || 1,
      insights: getScoreInsights(pin, pins)
    }))
    
    // Get trending pins (pins in trending tab)
    const trendingPins = getPinsForTab(pins, 'trending').slice(0, 5).map(pin => ({
      id: pin.id,
      name: pin.locationName || pin.title,
      score: pin.score || 0,
      recentEndorsements: pin.recentEndorsements || 0,
      category: pin.category || 'general'
    }))
    
    // Calculate average score
    const totalScore = pins.reduce((sum: number, pin) => sum + (pin.score || 0), 0)
    const averageScore = pins.length > 0 ? totalScore / pins.length : 0
    
    // Get maintenance status
    const maintenanceStats = getMaintenanceStatistics(pins)
    
    // Check migration status
    const needsMigration = pins.some(pin => !pin.placeId)
    const migratedPins = pins.filter(pin => pin.placeId).length
    
    // System health assessment
    let systemHealth: 'healthy' | 'warning' | 'critical' = 'healthy'
    if (maintenanceStats.maintenanceStatus === 'overdue') {
      systemHealth = 'critical'
    } else if (maintenanceStats.maintenanceStatus === 'due-soon') {
      systemHealth = 'warning'
    }
    
    // Check for any hidden pins
    const hiddenPins = pins.filter(pin => pin.isHidden).length
    
    // Check for pins with high downvote ratios
    const problematicPins = pins.filter(pin => {
      if (!pin.downvotes || pin.downvotes === 0) return false
      const ratio = pin.downvotes / (pin.totalEndorsements || 1)
      return ratio > 0.5
    }).length

    const dashboard = {
      totalPins: pins.length,
      migratedPins,
      needsMigration,
      
      lifecycle: {
        ...lifecycleStats,
        hiddenPins,
        problematicPins
      },
      
      scoring: {
        averageScore: Math.round(averageScore * 100) / 100,
        topPins,
        trendingPins,
        scoreDistribution: {
          high: pins.filter(p => (p.score || 0) >= 2.0).length,
          medium: pins.filter(p => (p.score || 0) >= 1.0 && (p.score || 0) < 2.0).length,
          low: pins.filter(p => (p.score || 0) < 1.0).length
        }
      },
      
      maintenance: {
        status: maintenanceStats.maintenanceStatus,
        lastMaintenance: maintenanceStats.lastMaintenance,
        nextMaintenance: maintenanceStats.nextMaintenance,
        isOverdue: maintenanceStats.maintenanceStatus === 'overdue'
      },
      
      system: {
        enabled: true,
        migrated: !needsMigration,
        health: systemHealth,
        version: '1.0.0',
        lastUpdated: new Date().toISOString()
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Dashboard data retrieved successfully',
      dashboard
    })

  } catch (error) {
    console.error('❌ Error in dashboard GET endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 
