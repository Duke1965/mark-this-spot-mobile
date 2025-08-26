// Scoring Engine for Pin Management System
// Calculates trending scores based on user activity with time decay
import { PinData } from '@/app/page'
import { MAP_LIFECYCLE } from './mapLifecycle'
import { computeTrendingScore, daysAgo, getEventWeight } from './trending'

export interface ScoringEvent {
  type: 'endorsement' | 'renewal' | 'downvote'
  timestamp: string
  weight: number
  daysAgo: number
}

export interface ScoreCalculation {
  currentScore: number
  previousScore: number
  change: number
  events: ScoringEvent[]
  lastCalculated: string
}

/**
 * Calculate trending score for a pin based on all its activity
 * @param pin Pin to score
 * @returns Calculated score with metadata
 */
export function calculatePinScore(pin: PinData): ScoreCalculation {
  const now = new Date().toISOString()
  const events: ScoringEvent[] = []
  
  // Add creation event (if pin is new)
  const daysSinceCreation = daysAgo(pin.timestamp)
  if (daysSinceCreation <= MAP_LIFECYCLE.TRENDING_WINDOW_DAYS) {
    events.push({
      type: 'endorsement',
      timestamp: pin.timestamp,
      weight: getEventWeight('endorsement'),
      daysAgo: daysSinceCreation
    })
  }
  
  // Add recent endorsement events
  if (pin.lastEndorsedAt && pin.lastEndorsedAt !== pin.timestamp) {
    const daysSinceLastEndorsement = daysAgo(pin.lastEndorsedAt)
    if (daysSinceLastEndorsement <= MAP_LIFECYCLE.TRENDING_WINDOW_DAYS) {
      events.push({
        type: 'endorsement',
        timestamp: pin.lastEndorsedAt,
        weight: getEventWeight('endorsement'),
        daysAgo: daysSinceLastEndorsement
      })
    }
  }
  
  // Add renewal events (simulated based on recent endorsements)
  if (pin.recentEndorsements && pin.recentEndorsements > 1) {
    const renewalCount = Math.min(pin.recentEndorsements - 1, 3) // Cap at 3 renewals
    for (let i = 0; i < renewalCount; i++) {
      const renewalDaysAgo = Math.max(0, daysSinceCreation - (i * 2)) // Spread renewals over time
      if (renewalDaysAgo <= MAP_LIFECYCLE.TRENDING_WINDOW_DAYS) {
        events.push({
          type: 'renewal',
          timestamp: new Date(Date.now() - renewalDaysAgo * 24 * 60 * 60 * 1000).toISOString(),
          weight: getEventWeight('renewal'),
          daysAgo: renewalDaysAgo
        })
      }
    }
  }
  
  // Add downvote events (if any)
  if (pin.downvotes && pin.downvotes > 0) {
    const downvoteDaysAgo = Math.max(0, daysSinceCreation - 7) // Assume downvotes happened recently
    if (downvoteDaysAgo <= MAP_LIFECYCLE.TRENDING_WINDOW_DAYS) {
      events.push({
        type: 'downvote',
        timestamp: new Date(Date.now() - downvoteDaysAgo * 24 * 60 * 60 * 1000).toISOString(),
        weight: getEventWeight('downvote'),
        daysAgo: downvoteDaysAgo
      })
    }
  }
  
  // Calculate new score
  const newScore = computeTrendingScore(events, MAP_LIFECYCLE.DECAY_HALF_LIFE_DAYS)
  const previousScore = pin.score || 0
  const change = newScore - previousScore
  
  return {
    currentScore: newScore,
    previousScore,
    change,
    events,
    lastCalculated: now
  }
}

/**
 * Update pin with new score and metadata
 * @param pin Pin to update
 * @returns Updated pin with new score
 */
export function updatePinScore(pin: PinData): PinData {
  const scoreCalculation = calculatePinScore(pin)
  
  return {
    ...pin,
    score: scoreCalculation.currentScore,
    scoreChange: scoreCalculation.change,
    scoreEvents: scoreCalculation.events,
    scoreLastCalculated: scoreCalculation.lastCalculated
  }
}

/**
 * Batch update scores for all pins
 * @param pins Array of pins to update
 * @returns Updated pins array
 */
export function updateAllPinScores(pins: PinData[]): PinData[] {
  return pins.map(updatePinScore)
}

/**
 * Get trending score percentile for a pin
 * @param pin Pin to analyze
 * @param allPins All pins for comparison
 * @returns Percentile (0-100) of the pin's trending score
 */
export function getScorePercentile(pin: PinData, allPins: PinData[]): number {
  if (!pin.score) return 0
  
  const scores = allPins
    .map(p => p.score || 0)
    .filter(score => score > 0)
    .sort((a, b) => b - a)
  
  if (scores.length === 0) return 0
  
  const pinIndex = scores.findIndex(score => score <= pin.score!)
  if (pinIndex === -1) return 100
  
  return Math.round((pinIndex / scores.length) * 100)
}

/**
 * Check if a pin is trending (in top percentile)
 * @param pin Pin to check
 * @param allPins All pins for comparison
 * @param percentileThreshold Threshold for trending (default: top 25%)
 * @returns True if pin is trending
 */
export function isPinTrending(pin: PinData, allPins: PinData[], percentileThreshold: number = 25): boolean {
  const percentile = getScorePercentile(pin, allPins)
  return percentile <= percentileThreshold
}

/**
 * Get score insights for a pin
 * @param pin Pin to analyze
 * @param allPins All pins for comparison
 * @returns Object with score insights
 */
export function getScoreInsights(pin: PinData, allPins: PinData[]) {
  const percentile = getScorePercentile(pin, allPins)
  const isTrending = isPinTrending(pin, allPins)
  
  let trend: 'rising' | 'falling' | 'stable' = 'stable'
  if (pin.scoreChange && Math.abs(pin.scoreChange) > 0.1) {
    trend = pin.scoreChange > 0 ? 'rising' : 'falling'
  }
  
  return {
    percentile,
    isTrending,
    trend,
    rank: allPins.filter(p => (p.score || 0) > (pin.score || 0)).length + 1,
    totalPins: allPins.length
  }
}

/**
 * Simulate score decay over time for testing
 * @param pin Pin to simulate
 * @param daysInFuture Number of days to simulate
 * @returns Predicted score
 */
export function predictFutureScore(pin: PinData, daysInFuture: number): number {
  if (!pin.score) return 0
  
  // Apply decay formula: score * 0.5^(days / half_life)
  const decayFactor = Math.pow(0.5, daysInFuture / MAP_LIFECYCLE.DECAY_HALF_LIFE_DAYS)
  return pin.score * decayFactor
}

/**
 * Get recommendations for improving pin score
 * @param pin Pin to analyze
 * @returns Array of score improvement suggestions
 */
export function getScoreRecommendations(pin: PinData): string[] {
  const recommendations: string[] = []
  
  if (!pin.score || pin.score < 1.0) {
    recommendations.push('Pin needs more activity to build trending score')
  }
  
  if (pin.score && pin.score < 2.0) {
    recommendations.push('Consider encouraging more endorsements to boost trending')
  }
  
  if (pin.downvotes && pin.downvotes > 0) {
    recommendations.push('Downvotes are reducing trending score - address community concerns')
  }
  
  if (pin.recentEndorsements && pin.recentEndorsements < MAP_LIFECYCLE.TRENDING_MIN_BURST) {
    const needed = MAP_LIFECYCLE.TRENDING_MIN_BURST - pin.recentEndorsements
    recommendations.push(`Need ${needed} more recent endorsements to qualify for Trending tab`)
  }
  
  return recommendations
} 
