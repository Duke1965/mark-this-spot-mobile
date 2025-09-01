// Nightly Maintenance System for Pin Management
// Automatically updates scores, lifecycle status, and performs cleanup
import type { PinData } from '@/lib/types'
import { updateAllPinsLifecycle } from './pinLifecycle'
import { updateAllPinScores } from './scoringEngine'
import { MAP_LIFECYCLE } from './mapLifecycle'
import { daysAgo } from './trending'

export interface MaintenanceReport {
  timestamp: string
  pinsProcessed: number
  scoresUpdated: number
  lifecycleUpdated: number
  expiredPins: number
  newClassics: number
  newTrending: number
  hiddenPins: number
  errors: string[]
}

/**
 * Perform nightly maintenance on all pins
 * @param pins Array of pins to maintain
 * @returns Maintenance report and updated pins
 */
export function performNightlyMaintenance(pins: PinData[]): { pins: PinData[], report: MaintenanceReport } {
  const startTime = Date.now()
  const report: MaintenanceReport = {
    timestamp: new Date().toISOString(),
    pinsProcessed: pins.length,
    scoresUpdated: 0,
    lifecycleUpdated: 0,
    expiredPins: 0,
    newClassics: 0,
    newTrending: 0,
    hiddenPins: 0,
    errors: []
  }

  try {
    console.log('🌙 Starting nightly maintenance...')
    
    // Step 1: Update all pin scores
    console.log('📊 Updating pin scores...')
    const pinsWithScores = updateAllPinScores(pins)
    report.scoresUpdated = pinsWithScores.length
    
    // Step 2: Update lifecycle status
    console.log('🔄 Updating lifecycle status...')
    const pinsWithLifecycle = updateAllPinsLifecycle(pinsWithScores)
    report.lifecycleUpdated = pinsWithLifecycle.length
    
    // Step 3: Check for expired pins (moved out of Recent tab)
    console.log('⏰ Checking for expired pins...')
    const now = new Date()
    const expiredPins = pinsWithLifecycle.filter(pin => {
      if (!pin.lastEndorsedAt) return false
      const daysSinceLastActivity = daysAgo(pin.lastEndorsedAt)
      return daysSinceLastActivity > MAP_LIFECYCLE.RECENT_WINDOW_DAYS
    })
    report.expiredPins = expiredPins.length
    
    // Step 4: Identify new classics
    console.log('🏆 Identifying new classics...')
    const newClassics = pinsWithLifecycle.filter(pin => {
      const daysSinceCreation = daysAgo(pin.timestamp)
      const wasClassic = false // Remove non-existent property
      const isNowClassic = daysSinceCreation >= MAP_LIFECYCLE.CLASSICS_MIN_AGE_DAYS &&
                          (pin.totalEndorsements || 1) >= MAP_LIFECYCLE.CLASSICS_MIN_TOTAL_ENDORSEMENTS
      return !wasClassic && isNowClassic
    })
    report.newClassics = newClassics.length
    
    // Step 5: Identify new trending pins
    console.log('📈 Identifying new trending pins...')
    const newTrending = pinsWithLifecycle.filter(pin => {
      const wasTrending = false // Remove non-existent property
      const isNowTrending = (pin.recentEndorsements || 0) >= MAP_LIFECYCLE.TRENDING_MIN_BURST
      return !wasTrending && isNowTrending
    })
    report.newTrending = newTrending.length
    
    // Step 6: Check for pins that should be hidden
    console.log('🚫 Checking for pins to hide...')
    const pinsToHide = pinsWithLifecycle.filter(pin => {
      if (pin.isHidden) return false
      
      const shouldHide = (pin.downvotes || 0) >= MAP_LIFECYCLE.DOWNVOTE_HIDE_THRESHOLD ||
                        ((pin.downvotes || 0) > (pin.recentEndorsements || 1) * 0.5)
      
      if (shouldHide) {
        pin.isHidden = true
        return true
      }
      
      return false
    })
    report.hiddenPins = pinsToHide.length
    
    // Step 7: Clean up old data and optimize
    console.log('🧹 Cleaning up old data...')
    const optimizedPins = optimizePinData(pinsWithLifecycle)
    
    const endTime = Date.now()
    const duration = endTime - startTime
    
    console.log(`✅ Nightly maintenance completed in ${duration}ms`)
    console.log(`📊 Report: ${JSON.stringify(report, null, 2)}`)
    
    return {
      pins: optimizedPins,
      report
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    report.errors.push(errorMessage)
    console.error('❌ Error during nightly maintenance:', error)
    
    return {
      pins: pins,
      report
    }
  }
}

/**
 * Optimize pin data by removing unnecessary fields and compressing data
 * @param pins Array of pins to optimize
 * @returns Optimized pins array
 */
function optimizePinData(pins: PinData[]): PinData[] {
  return pins.map(pin => {
    const optimized: PinData = { ...pin }
    
    // Remove temporary fields that aren't needed for storage
    delete (optimized as any).scoreChange
    delete (optimized as any).scoreEvents
    delete (optimized as any).scoreLastCalculated
    
    // Remove any non-existent properties that may have been added
    delete (optimized as any).lifecycleTab
    delete (optimized as any).lifecycleReason
    delete (optimized as any).daysUntilExpiry
    
    return optimized
  })
}

/**
 * Check if nightly maintenance is needed
 * @param lastMaintenanceTimestamp Last maintenance timestamp
 * @returns True if maintenance is needed
 */
export function isMaintenanceNeeded(lastMaintenanceTimestamp?: string): boolean {
  if (!lastMaintenanceTimestamp) return true
  
  const lastMaintenance = new Date(lastMaintenanceTimestamp)
  const now = new Date()
  const hoursSinceLastMaintenance = (now.getTime() - lastMaintenance.getTime()) / (1000 * 60 * 60)
  
  // Run maintenance every 24 hours
  return hoursSinceLastMaintenance >= 24
}

/**
 * Get maintenance schedule information
 * @returns Object with maintenance timing details
 */
export function getMaintenanceSchedule(): {
  nextMaintenance: string
  lastMaintenance?: string
  isOverdue: boolean
} {
  const now = new Date()
  const nextMaintenance = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours from now
  
  // Try to get last maintenance from localStorage
  let lastMaintenance: string | undefined
  try {
    const lastMaintenanceJson = localStorage.getItem('pinit-last-maintenance')
    if (lastMaintenanceJson) {
      lastMaintenance = JSON.parse(lastMaintenanceJson)
    }
  } catch (e) {
    console.warn('Could not parse last maintenance timestamp')
  }
  
  const isOverdue = lastMaintenance ? 
    new Date(lastMaintenance).getTime() < (now.getTime() - 24 * 60 * 60 * 1000) : 
    true
  
  return {
    nextMaintenance: nextMaintenance.toISOString(),
    lastMaintenance,
    isOverdue
  }
}

/**
 * Save maintenance timestamp to localStorage
 * @param timestamp Maintenance timestamp to save
 */
export function saveMaintenanceTimestamp(timestamp: string): void {
  try {
    localStorage.setItem('pinit-last-maintenance', JSON.stringify(timestamp))
  } catch (e) {
    console.error('Could not save maintenance timestamp:', e)
  }
}

/**
 * Get maintenance statistics
 * @param pins All pins
 * @returns Object with maintenance statistics
 */
export function getMaintenanceStatistics(pins: PinData[]): {
  totalPins: number
  needsMaintenance: number
  lastMaintenance?: string
  nextMaintenance: string
  maintenanceStatus: 'overdue' | 'due-soon' | 'up-to-date'
} {
  const schedule = getMaintenanceSchedule()
  const now = new Date()
  const nextMaintenance = new Date(schedule.nextMaintenance)
  const hoursUntilNext = (nextMaintenance.getTime() - now.getTime()) / (1000 * 60 * 60)
  
  let maintenanceStatus: 'overdue' | 'due-soon' | 'up-to-date'
  if (schedule.isOverdue) {
    maintenanceStatus = 'overdue'
  } else if (hoursUntilNext <= 6) {
    maintenanceStatus = 'due-soon'
  } else {
    maintenanceStatus = 'up-to-date'
  }
  
  return {
    totalPins: pins.length,
    needsMaintenance: schedule.isOverdue ? pins.length : 0,
    lastMaintenance: schedule.lastMaintenance,
    nextMaintenance: schedule.nextMaintenance,
    maintenanceStatus
  }
} 