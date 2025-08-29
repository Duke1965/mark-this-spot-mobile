// Performance Optimization Library for PINIT
// Provides lazy loading, caching, monitoring, and optimization utilities

import { log } from './logger'
import { isMobileDevice, debounce } from './helpers'
// Remove non-existent import

// Lazy loading utilities
export class LazyLoader {
  private static instance: LazyLoader
  private loadedComponents = new Set<string>()
  private loadingPromises = new Map<string, Promise<any>>()
  private intersectionObserver?: IntersectionObserver

  static getInstance(): LazyLoader {
    if (!LazyLoader.instance) {
      LazyLoader.instance = new LazyLoader()
    }
    return LazyLoader.instance
  }

  private constructor() {
    this.initIntersectionObserver()
  }

  private initIntersectionObserver() {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      return
    }

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const target = entry.target as HTMLElement
            const componentName = target.dataset.lazyComponent
            if (componentName) {
              this.loadComponent(componentName)
              this.intersectionObserver?.unobserve(target)
            }
          }
        })
      },
      {
        rootMargin: '50px',
        threshold: 0.1
      }
    )
  }

  async loadComponent(componentName: string): Promise<any> {
    if (this.loadedComponents.has(componentName)) {
      return Promise.resolve()
    }

    if (this.loadingPromises.has(componentName)) {
      return this.loadingPromises.get(componentName)
    }

    const timer = log.timer(`Lazy load: ${componentName}`)
    
    const loadPromise = this.getComponentLoader(componentName)()
      .then((module: any) => {
        this.loadedComponents.add(componentName)
        timer()
        log.performance(`Component loaded: ${componentName}`, undefined, 'LazyLoader')
        return module
      })
      .catch((error: Error) => {
        timer()
        log.error(`Failed to load component: ${componentName}`, error, 'LazyLoader')
        throw error
      })
      .finally(() => {
        this.loadingPromises.delete(componentName)
      })

    this.loadingPromises.set(componentName, loadPromise)
    return loadPromise
  }

  private getComponentLoader(componentName: string): () => Promise<any> {
    const loaders: Record<string, () => Promise<any>> = {
      'PinResults': () => import('@/components/PinResults'),
      'PinLibrary': () => import('@/components/PinLibrary'),
      'PinStoryBuilder': () => import('@/components/PinStoryBuilder'),
      'PinStoryMode': () => import('@/components/PinStoryMode'),
      'SettingsPage': () => import('@/components/SettingsPage'),
      'SocialShare': () => import('@/components/SocialShare'),
      'AIRecommendationsHub': () => import('@/components/AIRecommendationsHub'),
      'SystemHealthCheck': () => import('@/components/SystemHealthCheck'),
      'ReliableCamera': () => import('@/components/reliable-camera'),
      'AdvancedPhotoEditor': () => import('@/components/AdvancedPhotoEditor'),
      'ContentEditor': () => import('@/components/ContentEditor'),
    }

    return loaders[componentName] || (() => Promise.reject(new Error(`Unknown component: ${componentName}`)))
  }

  observeElement(element: HTMLElement, componentName: string) {
    if (this.intersectionObserver && !this.loadedComponents.has(componentName)) {
      element.dataset.lazyComponent = componentName
      this.intersectionObserver.observe(element)
    }
  }

  preloadComponent(componentName: string) {
    // Preload on idle or with low priority
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => {
        this.loadComponent(componentName)
      })
    } else {
      setTimeout(() => {
        this.loadComponent(componentName)
      }, 100)
    }
  }

  preloadCriticalComponents() {
    const criticalComponents = ['PinResults', 'SocialShare', 'ReliableCamera']
    criticalComponents.forEach(component => {
      this.preloadComponent(component)
    })
  }
}

// Memory management
export class MemoryManager {
  private static instance: MemoryManager
  private memoryWarningThreshold = 100 // MB
  private cleanupCallbacks: (() => void)[] = []

  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager()
    }
    return MemoryManager.instance
  }

  private constructor() {
    this.startMemoryMonitoring()
  }

  private startMemoryMonitoring() {
    if (typeof window === 'undefined' || !(performance as any).memory) {
      return
    }

    const checkMemory = () => {
      const memory = (performance as any).memory
      const usedMB = memory.usedJSHeapSize / 1024 / 1024

      if (usedMB > this.memoryWarningThreshold) {
        log.warn(`High memory usage detected: ${usedMB.toFixed(1)}MB`, { memory }, 'MemoryManager')
        this.runCleanup()
      }
    }

    // Check memory every 30 seconds
    setInterval(checkMemory, 30000)
  }

  addCleanupCallback(callback: () => void) {
    this.cleanupCallbacks.push(callback)
  }

  runCleanup() {
    log.info('Running memory cleanup', undefined, 'MemoryManager')
    
    this.cleanupCallbacks.forEach((callback, index) => {
      try {
        callback()
      } catch (error) {
        log.error(`Cleanup callback ${index} failed`, error, 'MemoryManager')
      }
    })

    // Force garbage collection if available
    if ('gc' in window) {
      (window as any).gc()
    }
  }

  getMemoryUsage() {
    if (!(performance as any).memory) {
      return null
    }

    const memory = (performance as any).memory
    return {
      used: memory.usedJSHeapSize,
      total: memory.totalJSHeapSize,
      limit: memory.jsHeapSizeLimit,
      usedMB: Math.round(memory.usedJSHeapSize / 1024 / 1024),
      totalMB: Math.round(memory.totalJSHeapSize / 1024 / 1024),
      limitMB: Math.round(memory.jsHeapSizeLimit / 1024 / 1024)
    }
  }
}

// Cache management
export class CacheManager {
  private static instance: CacheManager
  private memoryCache = new Map<string, { data: any; timestamp: number; ttl: number }>()
  private maxMemoryCacheSize = isMobileDevice() ? 50 : 100 // Number of items

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager()
    }
    return CacheManager.instance
  }

  set(key: string, data: any, ttl: number = 5 * 60 * 1000) { // 5 minutes default
    // Clean expired entries first
    this.cleanExpired()

    // Remove oldest entries if cache is full
    if (this.memoryCache.size >= this.maxMemoryCacheSize) {
      const oldestKey = Array.from(this.memoryCache.keys())[0]
      this.memoryCache.delete(oldestKey)
    }

    this.memoryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })

    log.debug(`Cache set: ${key}`, { size: this.memoryCache.size }, 'CacheManager')
  }

  get(key: string): any | null {
    const entry = this.memoryCache.get(key)
    
    if (!entry) {
      return null
    }

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.memoryCache.delete(key)
      return null
    }

    log.debug(`Cache hit: ${key}`, undefined, 'CacheManager')
    return entry.data
  }

  has(key: string): boolean {
    const entry = this.memoryCache.get(key)
    if (!entry) return false

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.memoryCache.delete(key)
      return false
    }

    return true
  }

  delete(key: string): boolean {
    return this.memoryCache.delete(key)
  }

  clear() {
    this.memoryCache.clear()
    log.info('Memory cache cleared', undefined, 'CacheManager')
  }

  private cleanExpired() {
    const now = Date.now()
    for (const [key, entry] of this.memoryCache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.memoryCache.delete(key)
      }
    }
  }

  getStats() {
    return {
      size: this.memoryCache.size,
      maxSize: this.maxMemoryCacheSize,
      keys: Array.from(this.memoryCache.keys())
    }
  }

  // Persistent cache using localStorage
  setPersistent(key: string, data: any, ttl: number = 24 * 60 * 60 * 1000) { // 24 hours default
    try {
      const entry = {
        data,
        timestamp: Date.now(),
        ttl
      }
      localStorage.setItem(`pinit-cache-${key}`, JSON.stringify(entry))
    } catch (error) {
      log.warn(`Failed to set persistent cache: ${key}`, error, 'CacheManager')
    }
  }

  getPersistent(key: string): any | null {
    try {
      const item = localStorage.getItem(`pinit-cache-${key}`)
      if (!item) return null

      const entry = JSON.parse(item)
      if (Date.now() - entry.timestamp > entry.ttl) {
        localStorage.removeItem(`pinit-cache-${key}`)
        return null
      }

      return entry.data
    } catch (error) {
      log.warn(`Failed to get persistent cache: ${key}`, error, 'CacheManager')
      return null
    }
  }
}

// Image optimization
export class ImageOptimizer {
  private static instance: ImageOptimizer
  private canvas?: HTMLCanvasElement
  private ctx?: CanvasRenderingContext2D

  static getInstance(): ImageOptimizer {
    if (!ImageOptimizer.instance) {
      ImageOptimizer.instance = new ImageOptimizer()
    }
    return ImageOptimizer.instance
  }

  private constructor() {
    if (typeof window !== 'undefined') {
      this.canvas = document.createElement('canvas')
      this.ctx = this.canvas.getContext('2d') || undefined
    }
  }

  async optimizeImage(
    file: File,
    options: {
      maxWidth?: number
      maxHeight?: number
      quality?: number
      format?: 'jpeg' | 'webp' | 'png'
    } = {}
  ): Promise<Blob> {
    const {
      maxWidth = isMobileDevice() ? 1080 : 1920,
      maxHeight = isMobileDevice() ? 1080 : 1920,
      quality = 0.8,
      format = 'jpeg'
    } = options

    return new Promise((resolve, reject) => {
      const img = new Image()
      
      img.onload = () => {
        try {
          const { width, height } = this.calculateDimensions(
            img.width,
            img.height,
            maxWidth,
            maxHeight
          )

          if (!this.canvas || !this.ctx) {
            throw new Error('Canvas not available')
          }

          this.canvas.width = width
          this.canvas.height = height

          this.ctx.drawImage(img, 0, 0, width, height)

          this.canvas.toBlob(
            (blob) => {
              if (blob) {
                                log.info(`Image optimized: ${file.size} -> ${blob.size} bytes`, 
                  { originalSize: file.size, optimizedSize: blob.size }, 'ImageOptimizer')
                resolve(blob)
              } else {
                reject(new Error('Failed to create blob'))
              }
            },
            `image/${format}`,
            quality
          )
        } catch (error) {
          reject(error)
        }
      }

      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = URL.createObjectURL(file)
    })
  }

  private calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
  ) {
    let { width, height } = { width: originalWidth, height: originalHeight }

    if (width > maxWidth) {
      height = (height * maxWidth) / width
      width = maxWidth
    }

    if (height > maxHeight) {
      width = (width * maxHeight) / height
      height = maxHeight
    }

    return { width: Math.round(width), height: Math.round(height) }
  }

  async createThumbnail(file: File, size: number = 150): Promise<Blob> {
    return this.optimizeImage(file, {
      maxWidth: size,
      maxHeight: size,
      quality: 0.7,
      format: 'jpeg'
    })
  }
}

// Performance monitoring
export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private metrics: Map<string, number[]> = new Map()
  private observers: PerformanceObserver[] = []

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  private constructor() {
    this.initObservers()
  }

  private initObservers() {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      return
    }

    try {
      // Observe navigation timing
      const navObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry) => {
          log.performance(`Navigation: ${entry.name}`, entry.duration, 'PerformanceMonitor')
        })
      })
      navObserver.observe({ entryTypes: ['navigation'] })
      this.observers.push(navObserver)

      // Observe resource loading
      const resourceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry) => {
          if (entry.duration > 1000) { // Log slow resources
            log.warn(`Slow resource: ${entry.name}`, entry.duration, 'PerformanceMonitor')
          }
        })
      })
      resourceObserver.observe({ entryTypes: ['resource'] })
      this.observers.push(resourceObserver)

      // Observe largest contentful paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1]
        log.performance('Largest Contentful Paint', lastEntry.startTime, 'PerformanceMonitor')
      })
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
      this.observers.push(lcpObserver)

    } catch (error) {
      log.warn('Failed to initialize performance observers', error, 'PerformanceMonitor')
    }
  }

  recordMetric(name: string, value: number) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, [])
    }
    
    const values = this.metrics.get(name)!
    values.push(value)
    
    // Keep only last 100 values
    if (values.length > 100) {
      values.shift()
    }
  }

  getMetricStats(name: string) {
    const values = this.metrics.get(name)
    if (!values || values.length === 0) {
      return null
    }

    const sorted = [...values].sort((a, b) => a - b)
    return {
      count: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((sum, val) => sum + val, 0) / values.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)]
    }
  }

  getAllMetrics() {
    const result: Record<string, any> = {}
    for (const [name] of this.metrics) {
      result[name] = this.getMetricStats(name)
    }
    return result
  }

  measureFunction<T>(name: string, fn: () => T): T {
    const start = performance.now()
    try {
      const result = fn()
      const duration = performance.now() - start
      this.recordMetric(name, duration)
      return result
    } catch (error) {
      const duration = performance.now() - start
      this.recordMetric(`${name}_error`, duration)
      throw error
    }
  }

  async measureAsyncFunction<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now()
    try {
      const result = await fn()
      const duration = performance.now() - start
      this.recordMetric(name, duration)
      return result
    } catch (error) {
      const duration = performance.now() - start
      this.recordMetric(`${name}_error`, duration)
      throw error
    }
  }

  destroy() {
    this.observers.forEach(observer => observer.disconnect())
    this.observers = []
  }
}

// Export singleton instances
export const lazyLoader = LazyLoader.getInstance()
export const memoryManager = MemoryManager.getInstance()
export const cacheManager = CacheManager.getInstance()
export const imageOptimizer = ImageOptimizer.getInstance()
export const performanceMonitor = PerformanceMonitor.getInstance()

// Utility functions
export const optimizeForMobile = () => {
  if (!isMobileDevice()) return

  // Reduce animation frame rate on mobile
  const originalRAF = window.requestAnimationFrame
  let throttledRAF = originalRAF
  
  if (isMobileDevice()) {
    throttledRAF = originalRAF // Keep original for now
  }

  // Preload critical components
  lazyLoader.preloadCriticalComponents()

  // Setup memory management
  memoryManager.addCleanupCallback(() => {
    cacheManager.clear()
    // Clear any large arrays or objects
    if ('gc' in window) {
      (window as any).gc()
    }
  })
}

// Initialize performance optimizations
export const initPerformanceOptimizations = () => {
  log.info('Initializing performance optimizations', undefined, 'Performance')
  
  // Mobile optimizations
  if (isMobileDevice()) {
    optimizeForMobile()
  }

  // Preload critical resources
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(() => {
      lazyLoader.preloadCriticalComponents()
    })
  }

  // Setup cleanup on page unload
  window.addEventListener('beforeunload', () => {
    performanceMonitor.destroy()
    memoryManager.runCleanup()
  })

  log.info('Performance optimizations initialized', undefined, 'Performance')
} 
