"use client"

import { useState, useEffect, useCallback } from "react"
import type { PinData } from "@/lib/types"
import { validatePin, validatePinCollection } from "@/lib/validation"

export function usePinStorage() {
  const [pins, setPins] = useState<PinData[]>([])

  // Enhanced data loading with validation and backup
  useEffect(() => {
    try {
      const saved = localStorage.getItem("pinit-pins")
      if (saved) {
        const parsedPins = JSON.parse(saved)
        
        // Enhanced validation using the validation system
        const validationResult = validatePinCollection(parsedPins, { 
          requirePlaceId: false, // Allow pins without place IDs
          requireCategory: false, // Allow pins without categories
          requireScore: false, // Allow pins without scores
          requireEndorsements: false // Allow pins without endorsements
        })
        
        if (validationResult.invalidPins.length > 0) {
          console.warn(`⚠️ Found ${validationResult.invalidPins.length} invalid pins, cleaning...`)
          
          // Create backup of invalid pins for potential recovery
          const backupKey = `pinit-pins-backup-${Date.now()}`
          localStorage.setItem(backupKey, JSON.stringify({
            timestamp: new Date().toISOString(),
            invalidPins: validationResult.invalidPins,
            reason: "Data validation cleanup"
          }))
          
          console.log(`📦 Created backup: ${backupKey}`)
        }
        
        // Use only valid pins
        setPins(validationResult.validPins)
        console.log(`📌 Loaded ${validationResult.validPins.length} valid pins from localStorage`)
        
        if (validationResult.summary.totalWarnings > 0) {
          console.warn(`⚠️ ${validationResult.summary.totalWarnings} validation warnings found`)
        }
      }
    } catch (error) {
      console.error("❌ Failed to load pins:", error)
      
      // Enhanced recovery with backup attempt
      try {
        // Try to create emergency backup before clearing
        const corruptedData = localStorage.getItem("pinit-pins")
        if (corruptedData) {
          const emergencyBackup = `pinit-pins-emergency-${Date.now()}`
          localStorage.setItem(emergencyBackup, JSON.stringify({
            timestamp: new Date().toISOString(),
            data: corruptedData,
            reason: "Emergency backup before clearing corrupted data"
          }))
          console.log(`🆘 Created emergency backup: ${emergencyBackup}`)
        }
        
        localStorage.removeItem("pinit-pins")
        console.log("🧹 Cleared corrupted pin data")
      } catch (clearError) {
        console.error("❌ Failed to clear corrupted data:", clearError)
      }
    }
  }, [])

  // Save pins to localStorage whenever pins change
  useEffect(() => {
    try {
      // Add metadata to help with debugging
      const pinsWithMetadata = pins.map(pin => ({
        ...pin,
        _lastSaved: new Date().toISOString(),
        _version: "1.0"
      }))
      
      const dataToSave = JSON.stringify(pinsWithMetadata)
      
      // Check storage quota before saving
      if (typeof window !== "undefined" && 'storage' in navigator && 'estimate' in navigator.storage) {
        navigator.storage.estimate().then(estimate => {
          const usage = estimate.usage || 0
          const quota = estimate.quota || 0
          const usagePercent = quota > 0 ? (usage / quota) * 100 : 0
          
          if (usagePercent > 90) {
            console.warn(`💾 Storage usage high: ${usagePercent.toFixed(1)}% - consider clearing old data`)
          }
        }).catch(() => {
          // Storage estimate not supported, continue anyway
        })
      }
      
      localStorage.setItem("pinit-pins", dataToSave)
      console.log(`💾 Saved ${pins.length} pins to localStorage`)
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.error("❌ Storage quota exceeded - clearing old pins to make space")
        try {
          // Keep only the most recent 50 pins when quota exceeded
          const recentPins = pins.slice(0, 50)
          localStorage.setItem("pinit-pins", JSON.stringify(recentPins))
          console.log(`💾 Saved ${recentPins.length} recent pins after quota cleanup`)
        } catch (fallbackError) {
          console.error("❌ Failed to save even after cleanup:", fallbackError)
        }
      } else {
        console.error("❌ Failed to save pins:", error)
      }
    }
  }, [pins])

  const addPin = useCallback((pin: PinData) => {
    // Ensure pin has required fields and validate
    const validatedPin: PinData = {
      ...pin,
      id: pin.id || Date.now().toString(),
      timestamp: pin.timestamp || new Date().toISOString(),
      isRecommended: pin.isRecommended || false,
      isAISuggestion: pin.isAISuggestion || false
    }
    
    // Validate the pin before adding
    const validation = validatePin(validatedPin, {
      requirePlaceId: false,
      requireCategory: false,
      requireScore: false,
      requireEndorsements: false
    })
    
    if (!validation.isValid) {
      console.error("❌ Cannot add invalid pin:", validation.errors)
      return false
    }
    
    if (validation.warnings.length > 0) {
      console.warn("⚠️ Pin validation warnings:", validation.warnings)
    }
    
    setPins((prev) => [validatedPin, ...prev])
    console.log("📌 Pin added with validation:", validatedPin)
    return true
  }, [])

  const removePin = useCallback((pinId: string) => {
    setPins((prev) => prev.filter((pin) => pin.id !== pinId))
    console.log("🗑️ Pin removed:", pinId)
  }, [])

  const clearPins = useCallback(() => {
    setPins([])
    console.log("🧹 All pins cleared")
  }, [])

  const updatePin = useCallback((pinId: string, updates: Partial<PinData>) => {
    setPins((prev) => prev.map((pin) => 
      pin.id === pinId ? { ...pin, ...updates, _lastUpdated: new Date().toISOString() } : pin
    ))
    console.log("✏️ Pin updated:", pinId, updates)
  }, [])

  // Enhanced functions for recommendations
  const markPinAsRecommended = useCallback((pinId: string, recommended: boolean = true) => {
    updatePin(pinId, { isRecommended: recommended })
  }, [updatePin])

  const markPinAsAISuggestion = useCallback((pinId: string, isAI: boolean = true) => {
    updatePin(pinId, { isAISuggestion: isAI })
  }, [updatePin])

  const getRecommendedPins = useCallback(() => {
    return pins.filter(pin => pin.isRecommended)
  }, [pins])

  const getAISuggestions = useCallback(() => {
    return pins.filter(pin => pin.isAISuggestion)
  }, [pins])

  const getCommunityPins = useCallback(() => {
    return pins.filter(pin => !pin.isAISuggestion)
  }, [pins])

  // Data management utilities
  const exportPins = useCallback(() => {
    const exportData = {
      version: "1.0",
      timestamp: new Date().toISOString(),
      pins: pins,
      metadata: {
        totalPins: pins.length,
        exportedBy: "PINIT",
        format: "JSON"
      }
    }
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pinit-export-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    
    console.log(`📤 Exported ${pins.length} pins`)
  }, [pins])

  const importPins = useCallback((jsonData: string, mergeMode: boolean = false) => {
    try {
      const importData = JSON.parse(jsonData)
      const importedPins = importData.pins || importData // Support both formats
      
      // Validate imported pins
      const validationResult = validatePinCollection(importedPins, {
        requirePlaceId: false,
        requireCategory: false,
        requireScore: false,
        requireEndorsements: false
      })
      
      if (validationResult.invalidPins.length > 0) {
        console.warn(`⚠️ ${validationResult.invalidPins.length} invalid pins in import, skipping them`)
      }
      
      if (mergeMode) {
        // Merge with existing pins, avoiding duplicates by ID
        const existingIds = new Set(pins.map(p => p.id))
        const newPins = validationResult.validPins.filter(p => !existingIds.has(p.id))
        setPins(prev => [...newPins, ...prev])
        console.log(`📥 Imported and merged ${newPins.length} new pins`)
      } else {
        // Replace all pins
        setPins(validationResult.validPins)
        console.log(`📥 Imported ${validationResult.validPins.length} pins (replaced all)`)
      }
      
      return {
        success: true,
        imported: validationResult.validPins.length,
        skipped: validationResult.invalidPins.length
      }
    } catch (error) {
      console.error("❌ Failed to import pins:", error)
      return {
        success: false,
        imported: 0,
        skipped: 0,
        error: error instanceof Error ? error.message : "Unknown error"
      }
    }
  }, [pins])

  const createBackup = useCallback(() => {
    const backupKey = `pinit-manual-backup-${Date.now()}`
    const backupData = {
      timestamp: new Date().toISOString(),
      pins: pins,
      reason: "Manual backup",
      version: "1.0"
    }
    
    try {
      localStorage.setItem(backupKey, JSON.stringify(backupData))
      console.log(`📦 Manual backup created: ${backupKey}`)
      return backupKey
    } catch (error) {
      console.error("❌ Failed to create backup:", error)
      return null
    }
  }, [pins])

  const getDataStats = useCallback(() => {
    const stats = {
      totalPins: pins.length,
      aiSuggestions: pins.filter(p => p.isAISuggestion).length,
      userPins: pins.filter(p => !p.isAISuggestion).length,
      recommendedPins: pins.filter(p => p.isRecommended).length,
      pinsWithMedia: pins.filter(p => p.mediaUrl).length,
      oldestPin: pins.length > 0 ? pins.reduce((oldest, pin) => 
        new Date(pin.timestamp) < new Date(oldest.timestamp) ? pin : oldest
      ) : null,
      newestPin: pins.length > 0 ? pins.reduce((newest, pin) => 
        new Date(pin.timestamp) > new Date(newest.timestamp) ? pin : newest
      ) : null
    }
    
    return stats
  }, [pins])

  return {
    pins,
    addPin,
    removePin,
    clearPins,
    updatePin,
    markPinAsRecommended,
    markPinAsAISuggestion,
    getRecommendedPins,
    getAISuggestions,
    getCommunityPins,
    // Data management utilities
    exportPins,
    importPins,
    createBackup,
    getDataStats,
  }
}
