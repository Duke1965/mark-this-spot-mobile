import { useState, useEffect, useCallback } from 'react'
import { TabType } from '@/components/MapTabs'
import { isMapLifecycleEnabled } from '@/lib/mapLifecycle'
import { getPinsForTab, getLifecycleStatistics, updateAllPinsLifecycle } from '@/lib/pinLifecycle'
import { updateAllPinScores, getScoreInsights } from '@/lib/scoringEngine'
import { getMaintenanceStatistics, performNightlyMaintenance } from '@/lib/nightlyMaintenance'
import type { PinData } from '@/lib/types'

interface PinManagementState {
  isEnabled: boolean
  activeTab: TabType
  pins: PinData[]
  filteredPins: PinData[]
  pinCounts: {
    recent: number
    trending: number
    classics: number
    all: number
  }
  lifecycleStats: any
  maintenanceStats: any
  isLoading: boolean
  error: string | null
}

interface PinManagementActions {
  setActiveTab: (tab: TabType) => void
  refreshPins: () => void
  triggerMaintenance: () => Promise<void>
  getPinInsights: (pin: PinData) => any
  getTabPins: (tab: TabType) => PinData[]
}

export function usePinManagement(initialPins: PinData[] = []): PinManagementState & PinManagementActions {
  const [state, setState] = useState<PinManagementState>({
    isEnabled: false,
    activeTab: 'recent',
    pins: [],
    filteredPins: [],
    pinCounts: { recent: 0, trending: 0, classics: 0, all: 0 },
    lifecycleStats: {},
    maintenanceStats: {},
    isLoading: false,
    error: null
  })

  // Check if system is enabled
  useEffect(() => {
    const enabled = isMapLifecycleEnabled()
    setState(prev => ({ ...prev, isEnabled: enabled }))
  }, [])

  // Initialize pins
  useEffect(() => {
    if (state.isEnabled && initialPins.length > 0) {
      setState(prev => ({ ...prev, pins: initialPins }))
    }
  }, [state.isEnabled, initialPins])

  // Update filtered pins when active tab or pins change
  useEffect(() => {
    if (!state.isEnabled || state.pins.length === 0) {
      setState(prev => ({ ...prev, filteredPins: [] }))
      return
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))

      // Update lifecycle and scores for all pins
      const updatedPins = updateAllPinScores(state.pins)
      const lifecyclePins = updateAllPinsLifecycle(updatedPins)

      // Get pins for active tab
      const filteredPins = getPinsForTab(lifecyclePins, state.activeTab)

      // Calculate pin counts for all tabs
      const pinCounts = {
        recent: getPinsForTab(lifecyclePins, 'recent').length,
        trending: getPinsForTab(lifecyclePins, 'trending').length,
        classics: getPinsForTab(lifecyclePins, 'classics').length,
        all: getPinsForTab(lifecyclePins, 'all').length
      }

      // Get lifecycle statistics
      const lifecycleStats = getLifecycleStatistics(lifecyclePins)

      // Get maintenance statistics
      const maintenanceStats = getMaintenanceStatistics(lifecyclePins)

      setState(prev => ({
        ...prev,
        pins: lifecyclePins,
        filteredPins,
        pinCounts,
        lifecycleStats,
        maintenanceStats,
        isLoading: false
      }))

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false
      }))
      console.error('Error updating pin management state:', error)
    }
  }, [state.isEnabled, state.activeTab, state.pins])

  // Set active tab
  const setActiveTab = useCallback((tab: TabType) => {
    setState(prev => ({ ...prev, activeTab: tab }))
  }, [])

  // Refresh pins from localStorage
  const refreshPins = useCallback(() => {
    try {
      const pinsJson = localStorage.getItem('pinit-pins') || '[]'
      const pins: PinData[] = JSON.parse(pinsJson)
      setState(prev => ({ ...prev, pins }))
    } catch (error) {
      console.error('Error refreshing pins:', error)
      setState(prev => ({ ...prev, error: 'Failed to refresh pins' }))
    }
  }, [])

  // Trigger manual maintenance
  const triggerMaintenance = useCallback(async () => {
    if (!state.isEnabled) return

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))

      // Perform maintenance
      const { pins: updatedPins, report } = performNightlyMaintenance(state.pins)

      // Save updated pins back to localStorage
      localStorage.setItem('pinit-pins', JSON.stringify(updatedPins))

      // Update state
      setState(prev => ({
        ...prev,
        pins: updatedPins,
        isLoading: false
      }))

      console.log('Maintenance completed:', report)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false
      }))
      console.error('Error during maintenance:', error)
    }
  }, [state.isEnabled, state.pins])

  // Get insights for a specific pin
  const getPinInsights = useCallback((pin: PinData) => {
    if (!state.isEnabled) return null
    return getScoreInsights(pin, state.pins)
  }, [state.isEnabled, state.pins])

  // Get pins for a specific tab
  const getTabPins = useCallback((tab: TabType) => {
    if (!state.isEnabled) return []
    return getPinsForTab(state.pins, tab)
  }, [state.isEnabled, state.pins])

  // Auto-refresh pins periodically
  useEffect(() => {
    if (!state.isEnabled) return

    const interval = setInterval(() => {
      refreshPins()
    }, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [state.isEnabled, refreshPins])

  // Auto-maintenance check
  useEffect(() => {
    if (!state.isEnabled || !state.maintenanceStats.isOverdue) return

    const checkMaintenance = async () => {
      if (state.maintenanceStats.maintenanceStatus === 'overdue') {
        console.log('Auto-triggering overdue maintenance...')
        await triggerMaintenance()
      }
    }

    checkMaintenance()
  }, [state.isEnabled, state.maintenanceStats.isOverdue, triggerMaintenance])

  return {
    ...state,
    setActiveTab,
    refreshPins,
    triggerMaintenance,
    getPinInsights,
    getTabPins
  }
} 
