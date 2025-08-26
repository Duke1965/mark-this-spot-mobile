// Trending Score Calculation Helper Functions
// Implements the scoring formula: score = Σ (event_weight * decay(days_since_event, half_life))

export interface TrendingEvent {
  daysAgo: number
  weight: number
}

/**
 * Calculate decay factor for an event based on how long ago it happened
 * @param daysAgo Number of days since the event
 * @param halfLifeDays Half-life period in days
 * @returns Decay factor between 0 and 1
 */
export function decay(daysAgo: number, halfLifeDays: number): number {
  if (daysAgo <= 0) return 1
  return Math.pow(0.5, daysAgo / halfLifeDays)
}

/**
 * Compute trending score from a list of events
 * @param events Array of events with days ago and weight
 * @param halfLifeDays Half-life period for decay calculation
 * @returns Computed trending score
 */
export function computeTrendingScore(
  events: TrendingEvent[],
  halfLifeDays: number
): number {
  return events.reduce((sum, e) => sum + e.weight * decay(e.daysAgo, halfLifeDays), 0)
}

/**
 * Calculate days between two dates
 * @param date1 First date
 * @param date2 Second date
 * @returns Number of days between dates
 */
export function daysBetween(date1: Date, date2: Date): number {
  const timeDiff = Math.abs(date2.getTime() - date1.getTime())
  return Math.ceil(timeDiff / (1000 * 3600 * 24))
}

/**
 * Calculate days ago from a timestamp
 * @param timestamp ISO timestamp string
 * @returns Number of days ago
 */
export function daysAgo(timestamp: string): number {
  const eventDate = new Date(timestamp)
  const now = new Date()
  return daysBetween(eventDate, now)
}

/**
 * Get event weight based on type
 * @param eventType Type of event ('endorsement' | 'renewal' | 'downvote')
 * @returns Weight value for scoring
 */
export function getEventWeight(eventType: 'endorsement' | 'renewal' | 'downvote'): number {
  switch (eventType) {
    case 'endorsement':
      return 1.0
    case 'renewal':
      return 0.6
    case 'downvote':
      return -0.3 // Negative weight for downvotes
    default:
      return 0
  }
} 
