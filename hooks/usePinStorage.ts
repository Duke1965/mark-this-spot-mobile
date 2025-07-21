"use client"

import { useState, useEffect, useCallback } from "react"

export interface PinData {
  id: string
  title: string
  mediaUrl: string
  mediaType: "photo" | "video"
  location: string
  coordinates: { lat: number; lng: number }
  timestamp: number
  audioUrl?: string
  effects: string[]
  stickers: any[]
  canvasData: any
  description?: string
  tags?: string[]
}

export function usePinStorage() {
  const [pins, setPins] = useState<PinData[]>([])

  // Load pins from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("pinit-pins")
      if (saved) {
        setPins(JSON.parse(saved))
      }
    } catch (error) {
      console.error("Failed to load pins:", error)
    }
  }, [])

  // Save pins to localStorage whenever pins change
  useEffect(() => {
    try {
      localStorage.setItem("pinit-pins", JSON.stringify(pins))
    } catch (error) {
      console.error("Failed to save pins:", error)
    }
  }, [pins])

  const addPin = useCallback((pin: PinData) => {
    setPins((prev) => [pin, ...prev])
  }, [])

  const removePin = useCallback((pinId: string) => {
    setPins((prev) => prev.filter((pin) => pin.id !== pinId))
  }, [])

  const clearPins = useCallback(() => {
    setPins([])
  }, [])

  const updatePin = useCallback((pinId: string, updates: Partial<PinData>) => {
    setPins((prev) => prev.map((pin) => (pin.id === pinId ? { ...pin, ...updates } : pin)))
  }, [])

  return {
    pins,
    addPin,
    removePin,
    clearPins,
    updatePin,
  }
}
