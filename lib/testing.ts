// Testing and Quality Assurance Utilities for PINIT
// Provides automated testing, validation, and debugging tools

import { PinData } from '@/app/client-page'
import { LocationData } from '@/hooks/useLocationServices'
import { logger } from './logger'
import { validatePin } from './validation'
import { 
  isMobileDevice, 
  isValidCoordinates, 
  calculateDistance,
  isOnline,
  formatTimeAgo 
} from './helpers'

export interface TestResult {
  testName: string
  passed: boolean
  duration: number
  errors: string[]
  warnings: string[]
  data?: any
}

export interface TestSuite {
  name: string
  tests: TestResult[]
  passed: number
  failed: number
  duration: number
  coverage?: number
}

// Mock data generators for testing
export const mockData = {
  pin: (overrides?: Partial<PinData>): PinData => ({
    id: `test-pin-${Date.now()}`,
    latitude: 37.7749,
    longitude: -122.4194,
    locationName: "Test Location",
    mediaUrl: null,
    mediaType: null,
    audioUrl: null,
    title: "Test Pin",
    description: "A test pin for quality assurance",
    timestamp: new Date().toISOString(),
    tags: ["test", "qa"],
    category: "restaurant",
    score: 85,
    totalEndorsements: 5,
    recentEndorsements: 2,
    downvotes: 0,
    ...overrides
  }),

  location: (overrides?: Partial<LocationData>): LocationData => ({
    latitude: 37.7749,
    longitude: -122.4194,
    accuracy: 10,
    timestamp: Date.now(),
    ...overrides
  }),

  behavior: (overrides?: any): any => ({
    id: `test-behavior-${Date.now()}`,
    type: 'pin_created',
    data: { category: 'restaurant' },
    timestamp: new Date().toISOString(),
    location: { latitude: 37.7749, longitude: -122.4194 },
    ...overrides
  })
}

// Core functionality tests
export class PINITTestSuite {
  private results: TestResult[] = []

  async runTest(testName: string, testFn: () => Promise<void> | void): Promise<TestResult> {
    const startTime = performance.now()
    const errors: string[] = []
    const warnings: string[] = []
    let passed = false

    logger.debug(`Starting test: ${testName}`, undefined, 'TestSuite')

    try {
      await testFn()
      passed = true
    } catch (error) {
      passed = false
      const errorMessage = error instanceof Error ? error.message : String(error)
      errors.push(errorMessage)
      logger.error(`Test failed: ${testName}`, error, 'TestSuite')
    }

    const duration = performance.now() - startTime
    const result: TestResult = {
      testName,
      passed,
      duration,
      errors,
      warnings
    }

    this.results.push(result)
    return result
  }

  // Location Services Tests
  async testLocationServices(): Promise<TestResult> {
    return this.runTest('Location Services', async () => {
      if (!navigator.geolocation) {
        throw new Error('Geolocation not supported')
      }

      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Location timeout'))
        }, 5000)

        navigator.geolocation.getCurrentPosition(
          (position) => {
            clearTimeout(timeout)
            if (!isValidCoordinates(position.coords.latitude, position.coords.longitude)) {
              reject(new Error('Invalid coordinates received'))
            }
            resolve()
          },
          (error) => {
            clearTimeout(timeout)
            reject(new Error(`Geolocation error: ${error.message}`))
          },
          { timeout: 5000 }
        )
      })
    })
  }

  // Camera Access Tests
  async testCameraAccess(): Promise<TestResult> {
    return this.runTest('Camera Access', async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported')
      }

      const devices = await navigator.mediaDevices.enumerateDevices()
      const cameras = devices.filter(device => device.kind === 'videoinput')
      
      if (cameras.length === 0) {
        throw new Error('No cameras found')
      }
    })
  }

  // Storage Tests
  async testLocalStorage(): Promise<TestResult> {
    return this.runTest('Local Storage', async () => {
      const testKey = 'pinit-test-storage'
      const testData = { test: true, timestamp: Date.now() }

      try {
        // Test write
        localStorage.setItem(testKey, JSON.stringify(testData))
        
        // Test read
        const retrieved = localStorage.getItem(testKey)
        if (!retrieved) {
          throw new Error('Failed to retrieve test data')
        }

        const parsed = JSON.parse(retrieved)
        if (parsed.test !== true) {
          throw new Error('Data corruption detected')
        }

        // Test delete
        localStorage.removeItem(testKey)
        
        if (localStorage.getItem(testKey) !== null) {
          throw new Error('Failed to delete test data')
        }
      } catch (error) {
        throw new Error(`Storage test failed: ${error}`)
      }
    })
  }

  // Network Connectivity Tests
  async testNetworkConnectivity(): Promise<TestResult> {
    return this.runTest('Network Connectivity', async () => {
      if (!isOnline()) {
        throw new Error('No network connection')
      }

      // Test API endpoint
      const response = await fetch('/api/places?lat=0&lng=0&test=true', {
        signal: AbortSignal.timeout(5000)
      })

      if (!response.ok) {
        throw new Error(`API test failed: ${response.status}`)
      }
    })
  }

  // Pin Data Validation Tests
  async testPinValidation(): Promise<TestResult> {
    return this.runTest('Pin Validation', async () => {
      // Test valid pin
      const validPin = mockData.pin()
      const validResult = validatePin(validPin)
      if (!validResult.isValid) {
        throw new Error(`Valid pin failed validation: ${validResult.errors.join(', ')}`)
      }

      // Test invalid pin
      const invalidPin = mockData.pin({ 
        latitude: 200, // Invalid latitude
        longitude: -300 // Invalid longitude
      })
      const invalidResult = validatePin(invalidPin)
      if (invalidResult.isValid) {
        throw new Error('Invalid pin passed validation')
      }
    })
  }

  // Performance Tests
  async testPerformance(): Promise<TestResult> {
    return this.runTest('Performance Benchmarks', async () => {
      const tests = [
        {
          name: 'Pin Creation',
          fn: () => {
            const pin = mockData.pin()
            return validatePin(pin)
          },
          maxTime: 50
        },
        {
          name: 'Distance Calculation',
          fn: () => {
            return calculateDistance(37.7749, -122.4194, 37.7849, -122.4094)
          },
          maxTime: 10
        },
        {
          name: 'Local Storage Access',
          fn: () => {
            localStorage.setItem('test', 'value')
            const value = localStorage.getItem('test')
            localStorage.removeItem('test')
            return value
          },
          maxTime: 20
        }
      ]

      for (const test of tests) {
        const start = performance.now()
        test.fn()
        const duration = performance.now() - start
        
        if (duration > test.maxTime) {
          throw new Error(`${test.name} took ${duration.toFixed(2)}ms (max: ${test.maxTime}ms)`)
        }
      }
    })
  }

  // Memory Usage Tests
  async testMemoryUsage(): Promise<TestResult> {
    return this.runTest('Memory Usage', async () => {
      if (!(performance as any).memory) {
        throw new Error('Memory API not available')
      }

      const memory = (performance as any).memory
      const usedMB = memory.usedJSHeapSize / 1024 / 1024
      const limitMB = memory.jsHeapSizeLimit / 1024 / 1024

      if (usedMB > limitMB * 0.9) {
        throw new Error(`High memory usage: ${usedMB.toFixed(1)}MB/${limitMB.toFixed(1)}MB`)
      }

      if (usedMB > 100) { // 100MB threshold for mobile
        throw new Error(`Memory usage too high: ${usedMB.toFixed(1)}MB`)
      }
    })
  }

  // Run all tests
  async runAllTests(): Promise<TestSuite> {
    const startTime = performance.now()
    logger.info('Starting comprehensive test suite', undefined, 'TestSuite')

    this.results = []

    const tests = [
      () => this.testLocalStorage(),
      () => this.testNetworkConnectivity(),
      () => this.testLocationServices(),
      () => this.testCameraAccess(),
      () => this.testPinValidation(),
      () => this.testPerformance(),
      () => this.testMemoryUsage()
    ]

    // Run tests in parallel for speed
    const results = await Promise.allSettled(
      tests.map(test => test())
    )

    const testResults = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value
      } else {
        return {
          testName: `Test ${index + 1}`,
          passed: false,
          duration: 0,
          errors: [result.reason?.message || 'Unknown error'],
          warnings: []
        }
      }
    })

    const duration = performance.now() - startTime
    const passed = testResults.filter(r => r.passed).length
    const failed = testResults.length - passed

    const suite: TestSuite = {
      name: 'PINIT QA Test Suite',
      tests: testResults,
      passed,
      failed,
      duration,
      coverage: (passed / testResults.length) * 100
    }

    logger.info('Test suite completed', {
      passed,
      failed,
      duration: duration.toFixed(2),
      coverage: suite.coverage?.toFixed(1)
    }, 'TestSuite')

    return suite
  }

  getResults(): TestResult[] {
    return this.results
  }

  getLastSuite(): TestSuite | null {
    if (this.results.length === 0) return null

    const passed = this.results.filter(r => r.passed).length
    const failed = this.results.length - passed
    const duration = this.results.reduce((sum, r) => sum + r.duration, 0)

    return {
      name: 'PINIT QA Test Suite',
      tests: this.results,
      passed,
      failed,
      duration,
      coverage: (passed / this.results.length) * 100
    }
  }
}

// Singleton test suite instance
export const testSuite = new PINITTestSuite()

// Debugging utilities
export const debugUtils = {
  // Log current app state
  logAppState: () => {
    const state = {
      url: window.location.href,
      userAgent: navigator.userAgent,
      online: navigator.onLine,
      mobile: isMobileDevice(),
      memory: (performance as any).memory ? {
        used: Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024),
        limit: Math.round((performance as any).memory.jsHeapSizeLimit / 1024 / 1024)
      } : 'Not available',
      storage: (() => {
        try {
          const keys = Object.keys(localStorage)
          const sizes = keys.map(key => {
            const value = localStorage.getItem(key) || ''
            return { key, size: new Blob([value]).size }
          })
          return {
            totalKeys: keys.length,
            totalSize: sizes.reduce((sum, item) => sum + item.size, 0),
            largestKey: sizes.sort((a, b) => b.size - a.size)[0]
          }
        } catch {
          return 'Access denied'
        }
      })(),
      timestamp: new Date().toISOString()
    }

    logger.debug('Current app state', state, 'DebugUtils')
    return state
  },

  // Test specific functionality
  testPinCreation: async (location: { lat: number; lng: number }) => {
    const timer = logger.startTimer('Pin Creation Test')
    try {
      const pin = mockData.pin({
        latitude: location.lat,
        longitude: location.lng
      })
      
      const validation = validatePin(pin)
      if (!validation.isValid) {
        throw new Error(`Pin validation failed: ${validation.errors.join(', ')}`)
      }

      timer()
      logger.info('Pin creation test passed', { pin }, 'DebugUtils')
      return { success: true, pin }
    } catch (error) {
      timer()
      logger.error('Pin creation test failed', error, 'DebugUtils')
      return { success: false, error }
    }
  },

  // Simulate user journey
  simulateUserJourney: async () => {
    const timer = logger.startTimer('User Journey Simulation')
    const steps = [
      'App Launch',
      'Location Permission',
      'Pin Creation',
      'AI Recommendations',
      'Social Sharing',
      'Pin Library Access'
    ]

    try {
      for (const step of steps) {
        logger.debug(`Simulating: ${step}`, undefined, 'UserJourney')
        await new Promise(resolve => setTimeout(resolve, 100)) // Simulate delay
      }
      
      timer()
      logger.info('User journey simulation completed', { steps }, 'DebugUtils')
      return { success: true, steps }
    } catch (error) {
      timer()
      logger.error('User journey simulation failed', error, 'DebugUtils')
      return { success: false, error }
    }
  },

  // Generate performance report
  generatePerformanceReport: () => {
    const report = {
      timestamp: new Date().toISOString(),
      platform: {
        mobile: isMobileDevice(),
        online: isOnline(),
        userAgent: navigator.userAgent,
        language: navigator.language
      },
      performance: {
        memory: (performance as any).memory ? {
          used: Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024),
          total: Math.round((performance as any).memory.totalJSHeapSize / 1024 / 1024),
          limit: Math.round((performance as any).memory.jsHeapSizeLimit / 1024 / 1024)
        } : null,
        navigation: performance.getEntriesByType('navigation')[0],
        resources: performance.getEntriesByType('resource').length
      },
      storage: (() => {
        try {
          const keys = Object.keys(localStorage)
          return {
            keys: keys.length,
            totalSize: keys.reduce((sum, key) => {
              const value = localStorage.getItem(key) || ''
              return sum + new Blob([value]).size
            }, 0)
          }
        } catch {
          return { error: 'Storage access denied' }
        }
      })(),
      logs: logger.getStats()
    }

    logger.info('Performance report generated', report, 'DebugUtils')
    return report
  }
}

// Automated quality checks
export const qualityChecks = {
  // Check for common issues
  runBasicChecks: () => {
    const issues: string[] = []
    const warnings: string[] = []

    // Check browser compatibility
    if (!navigator.geolocation) {
      issues.push('Geolocation API not supported')
    }

    if (!navigator.mediaDevices) {
      issues.push('MediaDevices API not supported')
    }

    if (!localStorage) {
      issues.push('localStorage not available')
    }

    // Check performance
    if ((performance as any).memory) {
      const memory = (performance as any).memory
      const usedMB = memory.usedJSHeapSize / 1024 / 1024
      if (usedMB > 50) {
        warnings.push(`High memory usage: ${usedMB.toFixed(1)}MB`)
      }
    }

    // Check network
    if (!navigator.onLine) {
      warnings.push('Device appears to be offline')
    }

    return { issues, warnings }
  },

  // Validate app configuration
  validateConfiguration: () => {
    const config = {
      googleMapsKey: !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
      firebaseKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      nodeEnv: process.env.NODE_ENV
    }

    const issues = []
    if (!config.googleMapsKey) issues.push('Google Maps API key missing')
    if (!config.firebaseKey) issues.push('Firebase API key missing')

    return { config, issues }
  },

  // Check data integrity
  validateStoredData: () => {
    try {
      const pins = JSON.parse(localStorage.getItem('pinit-pins') || '[]')
      const invalidPins = pins.filter((pin: any) => !validatePin(pin).isValid)
      
      return {
        totalPins: pins.length,
        validPins: pins.length - invalidPins.length,
        invalidPins: invalidPins.length,
        issues: invalidPins.map((pin: any) => `Pin ${pin.id}: ${validatePin(pin).errors.join(', ')}`)
      }
    } catch (error) {
      return {
        error: 'Failed to validate stored data',
        details: error instanceof Error ? error.message : String(error)
      }
    }
  }
}

// Export test runner for easy access
export const runQualityAssurance = async () => {
  const suite = new PINITTestSuite()
  const results = await suite.runAllTests()
  const basicChecks = qualityChecks.runBasicChecks()
  const configValidation = qualityChecks.validateConfiguration()
  const dataValidation = qualityChecks.validateStoredData()

  const report = {
    timestamp: new Date().toISOString(),
    testSuite: results,
    basicChecks,
    configValidation,
    dataValidation,
    overallHealth: results.failed === 0 && basicChecks.issues.length === 0 ? 'healthy' : 
                   results.failed > 0 || basicChecks.issues.length > 0 ? 'critical' : 'warning'
  }

  logger.info('Quality assurance completed', report, 'QA')
  return report
} 
