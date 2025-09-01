// Data Synchronization System for PINIT
// Handles data consistency, conflict resolution, and sync between devices

import type { PinData } from '@/lib/types'
import { validatePinCollection } from './validation'

export interface SyncResult {
  success: boolean
  synced: number
  conflicts: number
  errors: string[]
}

export interface DataConflict {
  localPin: PinData
  remotePin: PinData
  conflictType: 'timestamp' | 'content' | 'duplicate'
}

export class DataSyncManager {
  private syncKey = 'pinit-sync-timestamp'
  
  /**
   * Get the last sync timestamp
   */
  getLastSyncTime(): Date | null {
    try {
      const timestamp = localStorage.getItem(this.syncKey)
      return timestamp ? new Date(timestamp) : null
    } catch {
      return null
    }
  }

  /**
   * Update the last sync timestamp
   */
  updateSyncTime(timestamp: Date = new Date()): void {
    try {
      localStorage.setItem(this.syncKey, timestamp.toISOString())
    } catch (error) {
      console.error('Failed to update sync timestamp:', error)
    }
  }

  /**
   * Detect conflicts between local and remote data
   */
  detectConflicts(localPins: PinData[], remotePins: PinData[]): DataConflict[] {
    const conflicts: DataConflict[] = []
    const localPinMap = new Map(localPins.map(pin => [pin.id, pin]))
    
    remotePins.forEach(remotePin => {
      const localPin = localPinMap.get(remotePin.id)
      
      if (localPin) {
        // Check for timestamp conflicts
        const localTime = new Date(localPin.timestamp)
        const remoteTime = new Date(remotePin.timestamp)
        
        if (localTime.getTime() !== remoteTime.getTime()) {
          conflicts.push({
            localPin,
            remotePin,
            conflictType: 'timestamp'
          })
        }
        
        // Check for content conflicts
        else if (JSON.stringify(localPin) !== JSON.stringify(remotePin)) {
          conflicts.push({
            localPin,
            remotePin,
            conflictType: 'content'
          })
        }
      }
    })
    
    return conflicts
  }

  /**
   * Resolve conflicts using a strategy
   */
  resolveConflicts(
    conflicts: DataConflict[], 
    strategy: 'latest' | 'local' | 'remote' | 'merge' = 'latest'
  ): PinData[] {
    return conflicts.map(conflict => {
      switch (strategy) {
        case 'latest':
          const localTime = new Date(conflict.localPin.timestamp)
          const remoteTime = new Date(conflict.remotePin.timestamp)
          return localTime > remoteTime ? conflict.localPin : conflict.remotePin
          
        case 'local':
          return conflict.localPin
          
        case 'remote':
          return conflict.remotePin
          
        case 'merge':
          // Merge strategy: combine data intelligently
          return {
            ...conflict.remotePin,
            ...conflict.localPin,
            // Use latest timestamp
            timestamp: new Date(Math.max(
              new Date(conflict.localPin.timestamp).getTime(),
              new Date(conflict.remotePin.timestamp).getTime()
            )).toISOString(),
            // Merge tags if both exist
            tags: [
              ...(conflict.localPin.tags || []),
              ...(conflict.remotePin.tags || [])
            ].filter((tag, index, arr) => arr.indexOf(tag) === index)
          }
          
        default:
          return conflict.localPin
      }
    })
  }

  /**
   * Merge local and remote pins with conflict resolution
   */
  mergePins(
    localPins: PinData[], 
    remotePins: PinData[], 
    conflictStrategy: 'latest' | 'local' | 'remote' | 'merge' = 'latest'
  ): { merged: PinData[], conflicts: DataConflict[] } {
    const conflicts = this.detectConflicts(localPins, remotePins)
    const resolvedConflicts = this.resolveConflicts(conflicts, conflictStrategy)
    
    // Create maps for efficient lookup
    const localPinMap = new Map(localPins.map(pin => [pin.id, pin]))
    const remotePinMap = new Map(remotePins.map(pin => [pin.id, pin]))
    const conflictIds = new Set(conflicts.map(c => c.localPin.id))
    
    // Start with resolved conflicts
    const merged = [...resolvedConflicts]
    
    // Add non-conflicting local pins
    localPins.forEach(pin => {
      if (!conflictIds.has(pin.id) && !remotePinMap.has(pin.id)) {
        merged.push(pin)
      }
    })
    
    // Add non-conflicting remote pins
    remotePins.forEach(pin => {
      if (!conflictIds.has(pin.id) && !localPinMap.has(pin.id)) {
        merged.push(pin)
      }
    })
    
    return { merged, conflicts }
  }

  /**
   * Validate and clean merged data
   */
  validateMergedData(pins: PinData[]): { valid: PinData[], invalid: PinData[] } {
    const validationResult = validatePinCollection(pins, {
      requirePlaceId: false,
      requireCategory: false,
      requireScore: false,
      requireEndorsements: false
    })
    
    return {
      valid: validationResult.validPins,
      invalid: validationResult.invalidPins.map(item => item.pin)
    }
  }

  /**
   * Create a data snapshot for backup/sync purposes
   */
  createSnapshot(pins: PinData[]): {
    timestamp: string
    version: string
    pins: PinData[]
    checksum: string
  } {
    const snapshot = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      pins: pins,
      checksum: this.generateChecksum(pins)
    }
    
    return snapshot
  }

  /**
   * Generate a simple checksum for data integrity
   */
  private generateChecksum(pins: PinData[]): string {
    const dataString = JSON.stringify(pins.map(pin => ({
      id: pin.id,
      timestamp: pin.timestamp,
      latitude: pin.latitude,
      longitude: pin.longitude
    })))
    
    // Simple hash function
    let hash = 0
    for (let i = 0; i < dataString.length; i++) {
      const char = dataString.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    
    return hash.toString(36)
  }

  /**
   * Verify data integrity using checksum
   */
  verifyIntegrity(snapshot: { pins: PinData[], checksum: string }): boolean {
    const calculatedChecksum = this.generateChecksum(snapshot.pins)
    return calculatedChecksum === snapshot.checksum
  }
}

// Export singleton instance
export const dataSyncManager = new DataSyncManager()

// Utility functions for common sync operations
export function createDataBackup(pins: PinData[]): string {
  const backup = dataSyncManager.createSnapshot(pins)
  return JSON.stringify(backup, null, 2)
}

export function restoreFromBackup(backupData: string): PinData[] | null {
  try {
    const snapshot = JSON.parse(backupData)
    
    if (!dataSyncManager.verifyIntegrity(snapshot)) {
      console.warn('⚠️ Backup data integrity check failed')
    }
    
    const validation = dataSyncManager.validateMergedData(snapshot.pins)
    
    if (validation.invalid.length > 0) {
      console.warn(`⚠️ ${validation.invalid.length} invalid pins in backup`)
    }
    
    return validation.valid
  } catch (error) {
    console.error('❌ Failed to restore from backup:', error)
    return null
  }
} 