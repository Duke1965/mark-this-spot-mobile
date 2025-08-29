// Data Healing System for PINIT
// Automatically detects and fixes common data corruption issues

import type { PinData } from '@/app/client-page'
import { validatePinCollection, validatePin } from './validation'
import { migratePinToNewSystem } from './pinMigration'

export interface HealingResult {
  healed: number
  removed: number
  migrated: number
  issues: string[]
  summary: string
}

export interface DataIssue {
  type: 'corruption' | 'migration' | 'duplicate' | 'orphan' | 'format'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  pin?: PinData
  fixable: boolean
}

/**
 * Comprehensive data healing for pin collections
 */
export function healPinData(pins: PinData[]): {
  healedPins: PinData[]
  removedPins: PinData[]
  issues: DataIssue[]
  result: HealingResult
} {
  const issues: DataIssue[] = []
  const healedPins: PinData[] = []
  const removedPins: PinData[] = []
  let migratedCount = 0

  console.log(`🔧 Starting data healing for ${pins.length} pins...`)

  pins.forEach((pin, index) => {
    try {
      // Step 1: Basic structure validation
      if (!pin || typeof pin !== 'object') {
        issues.push({
          type: 'corruption',
          severity: 'critical',
          description: `Pin at index ${index} is not a valid object`,
          fixable: false
        })
        removedPins.push(pin)
        return
      }

      // Step 2: Required field healing
      let healedPin = { ...pin }

      // Fix missing ID
      if (!healedPin.id || typeof healedPin.id !== 'string') {
        healedPin.id = `healed-${Date.now()}-${index}`
        issues.push({
          type: 'corruption',
          severity: 'high',
          description: 'Generated missing pin ID',
          pin: healedPin,
          fixable: true
        })
      }

      // Fix missing timestamp
      if (!healedPin.timestamp) {
        healedPin.timestamp = new Date().toISOString()
        issues.push({
          type: 'corruption',
          severity: 'high',
          description: 'Generated missing timestamp',
          pin: healedPin,
          fixable: true
        })
      }

      // Fix invalid coordinates
      if (typeof healedPin.latitude !== 'number' || typeof healedPin.longitude !== 'number') {
        issues.push({
          type: 'corruption',
          severity: 'critical',
          description: 'Invalid coordinates - cannot fix',
          pin: healedPin,
          fixable: false
        })
        removedPins.push(healedPin)
        return
      }

      // Fix coordinate ranges
      if (healedPin.latitude < -90 || healedPin.latitude > 90) {
        healedPin.latitude = Math.max(-90, Math.min(90, healedPin.latitude))
        issues.push({
          type: 'format',
          severity: 'medium',
          description: 'Fixed latitude out of range',
          pin: healedPin,
          fixable: true
        })
      }

      if (healedPin.longitude < -180 || healedPin.longitude > 180) {
        healedPin.longitude = Math.max(-180, Math.min(180, healedPin.longitude))
        issues.push({
          type: 'format',
          severity: 'medium',
          description: 'Fixed longitude out of range',
          pin: healedPin,
          fixable: true
        })
      }

      // Step 3: Content healing
      if (!healedPin.title && !healedPin.locationName) {
        healedPin.title = 'Discovered Location'
        issues.push({
          type: 'corruption',
          severity: 'medium',
          description: 'Generated missing title',
          pin: healedPin,
          fixable: true
        })
      }

      // Clean up arrays
      if (healedPin.tags && !Array.isArray(healedPin.tags)) {
        healedPin.tags = []
        issues.push({
          type: 'format',
          severity: 'low',
          description: 'Fixed malformed tags array',
          pin: healedPin,
          fixable: true
        })
      }

      // Step 4: Migration check
      if (!healedPin.placeId) {
        healedPin = migratePinToNewSystem(healedPin)
        migratedCount++
        issues.push({
          type: 'migration',
          severity: 'low',
          description: 'Migrated to new pin management system',
          pin: healedPin,
          fixable: true
        })
      }

      // Step 5: Final validation
      const validation = validatePin(healedPin, {
        requirePlaceId: false,
        requireCategory: false,
        requireScore: false,
        requireEndorsements: false
      })

      if (validation.isValid) {
        healedPins.push(healedPin)
      } else {
        issues.push({
          type: 'corruption',
          severity: 'critical',
          description: `Validation failed: ${validation.errors.join(', ')}`,
          pin: healedPin,
          fixable: false
        })
        removedPins.push(healedPin)
      }

    } catch (error) {
      issues.push({
        type: 'corruption',
        severity: 'critical',
        description: `Processing error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        pin: pin,
        fixable: false
      })
      removedPins.push(pin)
    }
  })

  // Step 6: Remove duplicates
  const uniquePins = healedPins.filter((pin, index, arr) => 
    arr.findIndex(p => p.id === pin.id) === index
  )
  
  const duplicatesRemoved = healedPins.length - uniquePins.length
  if (duplicatesRemoved > 0) {
    issues.push({
      type: 'duplicate',
      severity: 'medium',
      description: `Removed ${duplicatesRemoved} duplicate pins`,
      fixable: true
    })
  }

  const result: HealingResult = {
    healed: uniquePins.length,
    removed: removedPins.length,
    migrated: migratedCount,
    issues: issues.map(i => i.description),
    summary: `Healed ${uniquePins.length} pins, removed ${removedPins.length} corrupted, migrated ${migratedCount}`
  }

  console.log(`🔧 Data healing complete:`, result.summary)

  return {
    healedPins: uniquePins,
    removedPins,
    issues,
    result
  }
}

/**
 * Quick data integrity check without healing
 */
export function checkDataIntegrity(pins: PinData[]): {
  healthy: boolean
  issues: DataIssue[]
  recommendations: string[]
} {
  const issues: DataIssue[] = []
  const recommendations: string[] = []

  // Check for common issues
  pins.forEach((pin, index) => {
    if (!pin.id) {
      issues.push({
        type: 'corruption',
        severity: 'critical',
        description: `Pin at index ${index} missing ID`,
        pin,
        fixable: true
      })
    }

    if (!pin.timestamp) {
      issues.push({
        type: 'corruption',
        severity: 'high',
        description: `Pin ${pin.id} missing timestamp`,
        pin,
        fixable: true
      })
    }

    if (!pin.placeId) {
      issues.push({
        type: 'migration',
        severity: 'low',
        description: `Pin ${pin.id} needs migration to new system`,
        pin,
        fixable: true
      })
    }
  })

  // Generate recommendations
  const criticalIssues = issues.filter(i => i.severity === 'critical').length
  const migrationNeeded = issues.filter(i => i.type === 'migration').length

  if (criticalIssues > 0) {
    recommendations.push(`Fix ${criticalIssues} critical data corruption issues immediately`)
  }

  if (migrationNeeded > 0) {
    recommendations.push(`Migrate ${migrationNeeded} pins to new system`)
  }

  if (pins.length > 1000) {
    recommendations.push('Consider archiving old pins for better performance')
  }

  return {
    healthy: issues.filter(i => i.severity === 'critical' || i.severity === 'high').length === 0,
    issues,
    recommendations
  }
}

/**
 * Automatic data healing that runs on app startup
 */
export function autoHealOnStartup(): boolean {
  try {
    const pinsData = localStorage.getItem('pinit-pins')
    if (!pinsData) return true

    const pins = JSON.parse(pinsData)
    const integrityCheck = checkDataIntegrity(pins)

    // Only auto-heal if there are critical issues
    const criticalIssues = integrityCheck.issues.filter(i => 
      i.severity === 'critical' || i.severity === 'high'
    ).length

    if (criticalIssues > 0) {
      console.log(`🔧 Auto-healing ${criticalIssues} critical data issues...`)
      
      const healingResult = healPinData(pins)
      
      // Create backup before healing
      const backupKey = `pinit-auto-heal-backup-${Date.now()}`
      localStorage.setItem(backupKey, JSON.stringify({
        timestamp: new Date().toISOString(),
        originalPins: pins,
        healingResult: healingResult.result,
        reason: 'Auto-healing backup'
      }))

      // Save healed data
      localStorage.setItem('pinit-pins', JSON.stringify(healingResult.healedPins))
      
      console.log(`🔧 Auto-healing complete: ${healingResult.result.summary}`)
      console.log(`📦 Backup created: ${backupKey}`)
      
      return true
    }

    return true
  } catch (error) {
    console.error('❌ Auto-healing failed:', error)
    return false
  }
} 
