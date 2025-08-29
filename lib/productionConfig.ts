// Production Configuration for Pin Management System
// Production-ready settings, performance optimizations, and deployment configs
import { isMapLifecycleEnabled } from './mapLifecycle'

export interface ProductionConfig {
  // Performance settings
  performance: {
    maxPinsPerRequest: number
    cacheTimeout: number
    batchSize: number
    debounceDelay: number
  }
  
  // Security settings
  security: {
    rateLimitEnabled: boolean
    maxRequestsPerMinute: number
    allowedOrigins: string[]
    requireAuthentication: boolean
  }
  
  // Monitoring settings
  monitoring: {
    healthCheckInterval: number
    errorReportingEnabled: boolean
    performanceMonitoringEnabled: boolean
    logLevel: 'debug' | 'info' | 'warn' | 'error'
  }
  
  // Feature flags
  features: {
    analyticsEnabled: boolean
    clusteringEnabled: boolean
    lifecycleManagementEnabled: boolean
    maintenanceEnabled: boolean
    validationEnabled: boolean
  }
}

// Default production configuration
const DEFAULT_PRODUCTION_CONFIG: ProductionConfig = {
  performance: {
    maxPinsPerRequest: 1000,
    cacheTimeout: 300000, // 5 minutes
    batchSize: 50,
    debounceDelay: 250
  },
  
  security: {
    rateLimitEnabled: true,
    maxRequestsPerMinute: 100,
    allowedOrigins: ['*'],
    requireAuthentication: false
  },
  
  monitoring: {
    healthCheckInterval: 60000, // 1 minute
    errorReportingEnabled: true,
    performanceMonitoringEnabled: true,
    logLevel: 'warn'
  },
  
  features: {
    analyticsEnabled: process.env.NODE_ENV === 'production',
    clusteringEnabled: true,
    lifecycleManagementEnabled: true,
    maintenanceEnabled: true,
    validationEnabled: true
  }
}

// Environment-specific overrides
const ENV_OVERRIDES: Record<string, Partial<ProductionConfig>> = {
  development: {
    performance: {
      maxPinsPerRequest: 100,
      cacheTimeout: 60000, // 1 minute
      batchSize: 10,
      debounceDelay: 100
    },
    security: {
      rateLimitEnabled: false,
      maxRequestsPerMinute: 1000,
      allowedOrigins: ['*'],
      requireAuthentication: false
    },
    monitoring: {
      healthCheckInterval: 30000, // 30 seconds
      errorReportingEnabled: false,
      performanceMonitoringEnabled: false,
      logLevel: 'debug' as const
    },
    features: {
      analyticsEnabled: false,
      clusteringEnabled: true,
      lifecycleManagementEnabled: true,
      maintenanceEnabled: true,
      validationEnabled: true
    }
  },
  
  staging: {
    performance: {
      maxPinsPerRequest: 500,
      cacheTimeout: 180000, // 3 minutes
      batchSize: 25,
      debounceDelay: 200
    },
    security: {
      rateLimitEnabled: true,
      maxRequestsPerMinute: 200,
      allowedOrigins: ['https://pinit.app'],
      requireAuthentication: true
    },
    monitoring: {
      healthCheckInterval: 120000, // 2 minutes
      errorReportingEnabled: true,
      performanceMonitoringEnabled: true,
      logLevel: 'info' as const
    }
  },
  
  production: {
    performance: {
      maxPinsPerRequest: 2000,
      cacheTimeout: 600000, // 10 minutes
      batchSize: 100,
      debounceDelay: 500
    },
    security: {
      rateLimitEnabled: true,
      maxRequestsPerMinute: 50,
      allowedOrigins: ['https://pinit.app'],
      requireAuthentication: true
    },
    monitoring: {
      healthCheckInterval: 300000, // 5 minutes
      errorReportingEnabled: true,
      performanceMonitoringEnabled: true,
      logLevel: 'error' as const
    }
  }
}

// Get current environment
const getCurrentEnvironment = (): string => {
  if (process.env.NODE_ENV === 'production') {
    return process.env.NEXT_PUBLIC_DEPLOYMENT_ENV === 'staging' ? 'staging' : 'production'
  }
  return process.env.NODE_ENV || 'development'
}

// Get production configuration
export function getProductionConfig(): ProductionConfig {
  const env = getCurrentEnvironment()
  const envOverrides = ENV_OVERRIDES[env] || {}
  
  return {
    ...DEFAULT_PRODUCTION_CONFIG,
    ...envOverrides
  }
}

// Performance optimization helpers
export class PerformanceOptimizer {
  private static instance: PerformanceOptimizer
  private config: ProductionConfig
  private cache = new Map<string, { data: any; timestamp: number }>()
  private requestCounts = new Map<string, number>()
  private lastReset = Date.now()

  private constructor() {
    this.config = getProductionConfig()
  }

  static getInstance(): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer()
    }
    return PerformanceOptimizer.instance
  }

  /**
   * Check if request should be rate limited
   */
  isRateLimited(identifier: string): boolean {
    if (!this.config.security.rateLimitEnabled) return false
    
    const now = Date.now()
    if (now - this.lastReset > 60000) { // Reset every minute
      this.requestCounts.clear()
      this.lastReset = now
    }
    
    const count = this.requestCounts.get(identifier) || 0
    if (count >= this.config.security.maxRequestsPerMinute) {
      return true
    }
    
    this.requestCounts.set(identifier, count + 1)
    return false
  }

  /**
   * Get cached data if available and not expired
   */
  getCachedData<T>(key: string): T | null {
    const cached = this.cache.get(key)
    if (!cached) return null
    
    if (Date.now() - cached.timestamp > this.config.performance.cacheTimeout) {
      this.cache.delete(key)
      return null
    }
    
    return cached.data
  }

  /**
   * Cache data with timestamp
   */
  cacheData<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    })
    
    // Clean up old cache entries
    if (this.cache.size > 100) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey) {
        this.cache.delete(oldestKey)
      }
    }
  }

  /**
   * Debounce function calls
   */
  debounce<T extends (...args: any[]) => any>(
    func: T,
    delay?: number
  ): (...args: Parameters<T>) => void {
    const debounceDelay = delay || this.config.performance.debounceDelay
    let timeoutId: NodeJS.Timeout
    
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => func(...args), debounceDelay)
    }
  }

  /**
   * Batch operations for better performance
   */
  batchOperations<T>(
    items: T[],
    operation: (batch: T[]) => Promise<void>
  ): Promise<void> {
    const batchSize = this.config.performance.batchSize
    const batches: T[][] = []
    
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize))
    }
    
    return Promise.all(
      batches.map(batch => operation(batch))
    ).then(() => {})
  }

  /**
   * Get performance metrics
   */
  getMetrics(): {
    cacheSize: number
    requestCounts: Record<string, number>
    uptime: number
  } {
    return {
      cacheSize: this.cache.size,
      requestCounts: Object.fromEntries(this.requestCounts),
      uptime: Date.now() - this.lastReset
    }
  }
}

// Production readiness checks
export function checkProductionReadiness(): {
  isReady: boolean
  issues: string[]
  warnings: string[]
  recommendations: string[]
} {
  const issues: string[] = []
  const warnings: string[] = []
  const recommendations: string[] = []
  
  // Check if pin management system is enabled
  if (!isMapLifecycleEnabled()) {
    issues.push('Pin management system is not enabled')
  }
  
  // Check environment variables
  if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
    warnings.push('Google Maps API key not configured')
  }
  
  if (!process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT) {
    warnings.push('Analytics endpoint not configured')
  }
  
  // Check configuration values
  const config = getProductionConfig()
  
  if (config.performance.maxPinsPerRequest > 5000) {
    warnings.push('High pin limit may impact performance')
  }
  
  if (config.security.maxRequestsPerMinute > 200) {
    warnings.push('High rate limit may impact security')
  }
  
  // Recommendations
  if (process.env.NODE_ENV === 'production') {
    recommendations.push('Enable error reporting and monitoring')
    recommendations.push('Configure proper rate limiting')
    recommendations.push('Set up analytics endpoint')
    recommendations.push('Enable authentication if required')
  }
  
  return {
    isReady: issues.length === 0,
    issues,
    warnings,
    recommendations
  }
}

// Export singleton instance
export const performanceOptimizer = PerformanceOptimizer.getInstance()

// Export configuration getter
export const productionConfig = getProductionConfig() 
