// Pin Lifecycle Management System
// Automatically manages pin movement between Recent, Trending, Classics, and All tabs
import type { PinData } from '@/lib/types'
import { MAP_LIFECYCLE } from './mapLifecycle'
import { daysAgo, computeTrendingScore } from './trending'

export interface LifecycleStatus {
  tab: 'recent' | 'trending' | 'classics' | 'all'
  reason: string
  score: number
  daysUntilExpiry?: number
  daysUntilClassic?: number
  endorsementsUntilClassic?: number
}

/**
 * Determine which tab a pin should appear in based on lifecycle rules
 * @param pin Pin data to analyze
 * @returns Lifecycle status with tab assignment and reasoning
 */
export function getPinLifecycleStatus(pin: PinData): LifecycleStatus {
  if (!pin.placeId) {
    return {
      tab: 'all',
      reason: 'Not migrated to new system',
      score: 0
    }
  }

  if (pin.isHidden) {
    return {
      tab: 'all',
      reason: 'Hidden due to downvotes',
      score: 0
    }
  }

  const now = new Date()
  const lastEndorsed = pin.lastEndorsedAt ? new Date(pin.lastEndorsedAt) : new Date(pin.timestamp)
  const created = new Date(pin.timestamp)
  
  const daysSinceLastEndorsement = daysAgo(pin.lastEndorsedAt || pin.timestamp)
  const daysSinceCreation = daysAgo(pin.timestamp)
  
  // Check if pin qualifies for Recent tab
  const isRecent = daysSinceLastEndorsement <= MAP_LIFECYCLE.RECENT_WINDOW_DAYS
  
  // Check if pin qualifies for Trending tab
  const isTrending = (pin.recentEndorsements || 0) >= MAP_LIFECYCLE.TRENDING_MIN_BURST
  
  // Check if pin qualifies for Classics tab
  const isClassic = daysSinceCreation >= MAP_LIFECYCLE.CLASSICS_MIN_AGE_DAYS &&
                   (pin.totalEndorsements || 0) >= MAP_LIFECYCLE.CLASSICS_MIN_TOTAL_ENDORSEMENTS

  // Priority order: Trending > Recent > Classics > All
  if (isTrending) {
    return {
      tab: 'trending',
      reason: `Burst activity: ${pin.recentEndorsements} endorsements in ${MAP_LIFECYCLE.TRENDING_WINDOW_DAYS} days`,
      score: pin.score || 0,
      daysUntilExpiry: MAP_LIFECYCLE.TRENDING_WINDOW_DAYS - daysSinceLastEndorsement
    }
  }
  
  if (isRecent) {
    return {
      tab: 'recent',
      reason: `Recently active: ${daysSinceLastEndorsement} days ago`,
      score: pin.score || 0,
      daysUntilExpiry: MAP_LIFECYCLE.RECENT_WINDOW_DAYS - daysSinceLastEndorsement
    }
  }
  
  if (isClassic) {
    return {
      tab: 'classics',
      reason: `Classic: ${pin.totalEndorsements} endorsements over ${daysSinceCreation} days`,
      score: pin.score || 0,
      daysUntilExpiry: undefined // Classics don't expire
    }
  }
  
  // Calculate what's needed to become a classic
  const daysUntilClassic = Math.max(0, MAP_LIFECYCLE.CLASSICS_MIN_AGE_DAYS - daysSinceCreation)
  const endorsementsUntilClassic = Math.max(0, MAP_LIFECYCLE.CLASSICS_MIN_TOTAL_ENDORSEMENTS - (pin.totalEndorsements || 1))
  
  return {
    tab: 'all',
    reason: `General: ${daysSinceCreation} days old, ${pin.totalEndorsements || 1} endorsements`,
    score: pin.score || 0,
    daysUntilClassic,
    endorsementsUntilClassic
  }
}

/**
 * Update pin lifecycle status and move between tabs automatically
 * @param pin Pin to update
 * @returns Updated pin with new lifecycle data
 */
export function updatePinLifecycle(pin: PinData): PinData {
  const lifecycleStatus = getPinLifecycleStatus(pin)
  
  // Update pin with lifecycle information
  return {
    ...pin
    // Remove invented properties - keep original pin structure
  }
}

/**
 * Batch update lifecycle for all pins
 * @param pins Array of pins to update
 * @returns Updated pins array
 */
export function updateAllPinsLifecycle(pins: PinData[]): PinData[] {
  return pins.map(updatePinLifecycle)
}

/**
 * Get pins for a specific tab with lifecycle filtering
 * @param pins All pins
 * @param tab Tab to filter for
 * @returns Filtered pins for the specified tab
 */
export function getPinsForTab(pins: PinData[], tab: 'recent' | 'trending' | 'classics' | 'all'): PinData[] {
  const updatedPins = updateAllPinsLifecycle(pins)
  
  return updatedPins.filter(pin => {
    if (tab === 'all') return !pin.isHidden
    
    // Use lifecycle status calculation instead of non-existent property
    const status = getPinLifecycleStatus(pin)
    return status.tab === tab
  })
}

/**
 * Check if a pin is about to expire from Recent tab
 * @param pin Pin to check
 * @returns True if pin expires soon (within 7 days)
 */
export function isPinExpiringSoon(pin: PinData): boolean {
  const lifecycleStatus = getPinLifecycleStatus(pin)
  return lifecycleStatus.tab === 'recent' && 
         (lifecycleStatus.daysUntilExpiry || 0) <= 7
}

/**
 * Get lifecycle statistics for all pins
 * @param pins All pins
 * @returns Statistics about pin distribution across tabs
 */
export function getLifecycleStatistics(pins: PinData[]): Record<string, number> {
  const updatedPins = updateAllPinsLifecycle(pins)
  
  const stats = {
    recent: 0,
    trending: 0,
    classics: 0,
    all: 0,
    expiringSoon: 0,
    total: updatedPins.length
  }
  
  updatedPins.forEach(pin => {
    // Calculate lifecycle status instead of using non-existent property
    const status = getPinLifecycleStatus(pin)
    stats[status.tab]++
    
    if (isPinExpiringSoon(pin)) {
      stats.expiringSoon++
    }
  })
  
  return stats
}

/**
 * Get recommendations for improving pin lifecycle status
 * @param pin Pin to analyze
 * @returns Array of improvement suggestions
 */
export function getLifecycleRecommendations(pin: PinData): string[] {
  const recommendations: string[] = []
  const lifecycleStatus = getPinLifecycleStatus(pin)
  
  if (lifecycleStatus.tab === 'all') {
    if (lifecycleStatus.daysUntilClassic && lifecycleStatus.daysUntilClassic > 0) {
      recommendations.push(`Wait ${lifecycleStatus.daysUntilClassic} more days to qualify for Classics tab`)
    }
    
    if (lifecycleStatus.endorsementsUntilClassic && lifecycleStatus.endorsementsUntilClassic > 0) {
      recommendations.push(`Need ${lifecycleStatus.endorsementsUntilClassic} more endorsements to qualify for Classics tab`)
    }
  }
  
  if (lifecycleStatus.tab === 'recent' && lifecycleStatus.daysUntilExpiry && lifecycleStatus.daysUntilExpiry <= 7) {
    recommendations.push('Pin expires from Recent tab soon - consider renewing')
  }
  
  if (lifecycleStatus.tab === 'trending') {
    recommendations.push('Pin is trending! Keep the momentum going')
  }
  
  if (pin.downvotes && pin.downvotes > 0) {
    recommendations.push(`Pin has ${pin.downvotes} downvotes - consider community feedback`)
  }
  
  return recommendations
} 