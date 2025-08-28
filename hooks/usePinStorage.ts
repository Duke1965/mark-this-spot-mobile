"use client"

import { useState, useEffect, useCallback } from "react"
import type { PinData } from "@/app/client-page"

export function usePinStorage() {
  const [pins, setPins] = useState<PinData[]>([])

  // Load pins from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("pinit-pins")
      if (saved) {
        const parsedPins = JSON.parse(saved)
        
        // Validate and clean the data
        const validPins = parsedPins.filter((pin: any) => {
          return pin && 
                 typeof pin.id === 'string' && 
                 typeof pin.latitude === 'number' && 
                 typeof pin.longitude === 'number' &&
                 typeof pin.title === 'string'
        })
        
        if (validPins.length !== parsedPins.length) {
          console.warn(`⚠️ Cleaned ${parsedPins.length - validPins.length} invalid pins from storage`)
        }
        
        setPins(validPins)
        console.log(`📌 Loaded ${validPins.length} pins from localStorage`)
      }
    } catch (error) {
      console.error("❌ Failed to load pins:", error)
      // Try to recover by clearing corrupted data
      try {
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
      
      localStorage.setItem("pinit-pins", JSON.stringify(pinsWithMetadata))
      console.log(`💾 Saved ${pins.length} pins to localStorage`)
    } catch (error) {
      console.error("❌ Failed to save pins:", error)
    }
  }, [pins])

  const addPin = useCallback((pin: PinData) => {
    // Ensure pin has required fields
    const validatedPin: PinData = {
      ...pin,
      id: pin.id || Date.now().toString(),
      timestamp: pin.timestamp || new Date().toISOString(),
      isRecommended: pin.isRecommended || false,
      isAISuggestion: pin.isAISuggestion || false
    }
    
    setPins((prev) => [validatedPin, ...prev])
    console.log("📌 Pin added:", validatedPin)
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
  }
}
