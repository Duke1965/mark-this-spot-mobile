// Analytics System for Pin Management
// Lightweight event tracking for user interactions and system performance
import { isMapLifecycleEnabled } from './mapLifecycle'

export interface AnalyticsEvent {
  event: string
  timestamp: string
  userId?: string
  data?: Record<string, any>
}

export interface AnalyticsConfig {
  enabled: boolean
  endpoint?: string
  batchSize: number
  flushInterval: number
}

// Default configuration
const DEFAULT_CONFIG: AnalyticsConfig = {
  enabled: process.env.NODE_ENV === 'production',
  endpoint: process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT,
  batchSize: 10,
  flushInterval: 30000 // 30 seconds
}

class AnalyticsManager {
  private config: AnalyticsConfig
  private events: AnalyticsEvent[] = []
  private flushTimer: NodeJS.Timeout | null = null
  private isFlushing = false

  constructor(config: Partial<AnalyticsConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.initializeFlushTimer()
  }

  /**
   * Track an analytics event
   */
  track(event: string, data?: Record<string, any>, userId?: string): void {
    if (!this.config.enabled || !isMapLifecycleEnabled()) {
      return
    }

    const analyticsEvent: AnalyticsEvent = {
      event,
      timestamp: new Date().toISOString(),
      userId,
      data
    }

    this.events.push(analyticsEvent)

    // Flush if we've reached batch size
    if (this.events.length >= this.config.batchSize) {
      this.flush()
    }
  }

  /**
   * Track map tab view
   */
  trackTabView(tab: string, pinCount: number): void {
    this.track('map_tab_viewed', {
      tab,
      pinCount,
      timestamp: Date.now()
    })
  }

  /**
   * Track places loaded
   */
  trackPlacesLoaded(tab: string, count: number, bounds?: any): void {
    this.track('map_places_loaded', {
      tab,
      count,
      bounds: bounds ? {
        north: bounds.north,
        south: bounds.south,
        east: bounds.east,
        west: bounds.west
      } : null,
      timestamp: Date.now()
    })
  }

  /**
   * Track place opened
   */
  trackPlaceOpened(placeId: string, tab: string, category: string): void {
    this.track('place_opened', {
      placeId,
      tab,
      category,
      timestamp: Date.now()
    })
  }

  /**
   * Track place renewed
   */
  trackPlaceRenewed(placeId: string, userId?: string): void {
    this.track('place_renewed', {
      placeId,
      timestamp: Date.now()
    }, userId)
  }

  /**
   * Track place downvoted
   */
  trackPlaceDownvoted(placeId: string, userId?: string): void {
    this.track('place_downvoted', {
      placeId,
      timestamp: Date.now()
    }, userId)
  }

  /**
   * Track pin endorsement
   */
  trackPinEndorsed(placeId: string, isNewPlace: boolean, userId?: string): void {
    this.track('pin_endorsed', {
      placeId,
      isNewPlace,
      timestamp: Date.now()
    }, userId)
  }

  /**
   * Track lifecycle changes
   */
  trackLifecycleChange(placeId: string, fromTab: string, toTab: string): void {
    this.track('lifecycle_change', {
      placeId,
      fromTab,
      toTab,
      timestamp: Date.now()
    })
  }

  /**
   * Track maintenance events
   */
  trackMaintenance(operation: string, pinsProcessed: number, duration: number): void {
    this.track('maintenance', {
      operation,
      pinsProcessed,
      duration,
      timestamp: Date.now()
    })
  }

  /**
   * Track system errors
   */
  trackError(error: string, context: string, severity: 'low' | 'medium' | 'high' = 'medium'): void {
    this.track('system_error', {
      error,
      context,
      severity,
      timestamp: Date.now()
    })
  }

  /**
   * Track performance metrics
   */
  trackPerformance(metric: string, value: number, unit: string): void {
    this.track('performance', {
      metric,
      value,
      unit,
      timestamp: Date.now()
    })
  }

  /**
   * Flush events to analytics endpoint
   */
  private async flush(): Promise<void> {
    if (this.isFlushing || this.events.length === 0 || !this.config.endpoint) {
      return
    }

    this.isFlushing = true
    const eventsToSend = [...this.events]
    this.events = []

    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          events: eventsToSend,
          batchId: Date.now().toString(),
          timestamp: new Date().toISOString()
        })
      })

      if (!response.ok) {
        throw new Error(`Analytics endpoint returned ${response.status}`)
      }

      console.log(`✅ Analytics: Sent ${eventsToSend.length} events`)

    } catch (error) {
      console.error('❌ Analytics flush failed:', error)
      
      // Re-add events to queue for retry
      this.events.unshift(...eventsToSend)
      
      // Track the error
      this.trackError(
        error instanceof Error ? error.message : 'Unknown error',
        'analytics_flush',
        'low'
      )
    } finally {
      this.isFlushing = false
    }
  }

  /**
   * Initialize automatic flush timer
   */
  private initializeFlushTimer(): void {
    if (this.config.enabled && this.config.endpoint) {
      this.flushTimer = setInterval(() => {
        this.flush()
      }, this.config.flushInterval)
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
    }
    
    // Final flush
    this.flush()
  }

  /**
   * Get current analytics status
   */
  getStatus(): {
    enabled: boolean
    eventsInQueue: number
    isFlushing: boolean
    hasEndpoint: boolean
  } {
    return {
      enabled: this.config.enabled,
      eventsInQueue: this.events.length,
      isFlushing: this.isFlushing,
      hasEndpoint: !!this.config.endpoint
    }
  }
}

// Create global analytics instance
export const analytics = new AnalyticsManager()

// Convenience functions for common events
export const trackTabView = (tab: string, pinCount: number) => 
  analytics.trackTabView(tab, pinCount)

export const trackPlacesLoaded = (tab: string, count: number, bounds?: any) => 
  analytics.trackPlacesLoaded(tab, count, bounds)

export const trackPlaceOpened = (placeId: string, tab: string, category: string) => 
  analytics.trackPlaceOpened(placeId, tab, category)

export const trackPlaceRenewed = (placeId: string, userId?: string) => 
  analytics.trackPlaceRenewed(placeId, userId)

export const trackPlaceDownvoted = (placeId: string, userId?: string) => 
  analytics.trackPlaceDownvoted(placeId, userId)

export const trackPinEndorsed = (placeId: string, isNewPlace: boolean, userId?: string) => 
  analytics.trackPinEndorsed(placeId, isNewPlace, userId)

export const trackLifecycleChange = (placeId: string, fromTab: string, toTab: string) => 
  analytics.trackLifecycleChange(placeId, fromTab, toTab)

export const trackMaintenance = (operation: string, pinsProcessed: number, duration: number) => 
  analytics.trackMaintenance(operation, pinsProcessed, duration)

export const trackError = (error: string, context: string, severity?: 'low' | 'medium' | 'high') => 
  analytics.trackError(error, context, severity)

export const trackPerformance = (metric: string, value: number, unit: string) => 
  analytics.trackPerformance(metric, value, unit) 
