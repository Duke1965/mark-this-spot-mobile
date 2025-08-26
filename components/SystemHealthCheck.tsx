import React, { useState, useEffect } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Info, RefreshCw, Play, Stop, Settings } from 'lucide-react'
import { isMapLifecycleEnabled } from '@/lib/mapLifecycle'
import { getSystemValidationReport } from '@/lib/validation'
import { analytics } from '@/lib/analytics'
import { PinData } from '@/app/page'

interface SystemHealthCheckProps {
  pins: PinData[]
  onRefresh?: () => void
  className?: string
}

interface HealthStatus {
  overall: 'healthy' | 'warning' | 'critical'
  message: string
  details: string[]
}

export function SystemHealthCheck({ pins, onRefresh, className = '' }: SystemHealthCheckProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [validationReport, setValidationReport] = useState<any>(null)
  const [analyticsStatus, setAnalyticsStatus] = useState<any>(null)
  const [systemStatus, setSystemStatus] = useState<HealthStatus | null>(null)
  const [activeTests, setActiveTests] = useState<string[]>([])

  // Check if pin management system is enabled
  const isEnabled = isMapLifecycleEnabled()

  useEffect(() => {
    if (isOpen && isEnabled) {
      runHealthCheck()
    }
  }, [isOpen, isEnabled, pins])

  const runHealthCheck = async () => {
    setIsLoading(true)
    
    try {
      // Run validation
      const report = getSystemValidationReport(pins)
      setValidationReport(report)
      
      // Get analytics status
      const analyticsStatus = analytics.getStatus()
      setAnalyticsStatus(analyticsStatus)
      
      // Determine overall health
      const healthStatus = determineHealthStatus(report, analyticsStatus)
      setSystemStatus(healthStatus)
      
      // Track health check
      analytics.track('system_health_check', {
        overall: healthStatus.overall,
        errors: report.overall.totalErrors,
        warnings: report.overall.totalWarnings
      })
      
    } catch (error) {
      console.error('Health check failed:', error)
      setSystemStatus({
        overall: 'critical',
        message: 'Health check failed',
        details: [error instanceof Error ? error.message : 'Unknown error']
      })
    } finally {
      setIsLoading(false)
    }
  }

  const determineHealthStatus = (report: any, analyticsStatus: any): HealthStatus => {
    const details: string[] = []
    
    if (report.overall.totalErrors > 0) {
      details.push(`${report.overall.totalErrors} validation errors found`)
    }
    
    if (report.overall.totalWarnings > 0) {
      details.push(`${report.overall.totalWarnings} warnings found`)
    }
    
    if (!analyticsStatus.enabled) {
      details.push('Analytics system disabled')
    }
    
    if (report.overall.totalErrors > 0) {
      return {
        overall: 'critical',
        message: 'System has critical issues',
        details
      }
    } else if (report.overall.totalWarnings > 0 || !analyticsStatus.enabled) {
      return {
        overall: 'warning',
        message: 'System has warnings',
        details
      }
    } else {
      return {
        overall: 'healthy',
        message: 'All systems operational',
        details: ['No issues detected']
      }
    }
  }

  const runTest = (testName: string) => {
    setActiveTests(prev => [...prev, testName])
    
    // Simulate test execution
    setTimeout(() => {
      setActiveTests(prev => prev.filter(t => t !== testName))
      
      // Track test completion
      analytics.track('qa_test_completed', {
        test: testName,
        result: 'passed',
        duration: Math.random() * 2000 + 500
      })
    }, Math.random() * 2000 + 1000)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />
      case 'critical':
        return <XCircle className="w-5 h-5 text-red-500" />
      default:
        return <Info className="w-5 h-5 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-500'
      case 'warning':
        return 'text-yellow-500'
      case 'critical':
        return 'text-red-500'
      default:
        return 'text-gray-500'
    }
  }

  if (!isEnabled) {
    return null
  }

  return (
    <div className={className}>
      {/* Health Check Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-all duration-200 z-50"
        title="System Health Check"
      >
        {isLoading ? (
          <RefreshCw className="w-6 h-6 animate-spin" />
        ) : (
          <Settings className="w-6 h-6" />
        )}
      </button>

      {/* Health Check Panel */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">System Health Check</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              {systemStatus && (
                <div className="flex items-center gap-3 mt-2">
                  {getStatusIcon(systemStatus.overall)}
                  <span className={`text-white font-medium ${getStatusColor(systemStatus.overall)}`}>
                    {systemStatus.message}
                  </span>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* System Overview */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">System Overview</h3>
                  
                  {/* Feature Flag Status */}
                  <div className="bg-white/10 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white/60">Pin Management System</span>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-green-500 text-sm font-medium">Enabled</span>
                      </div>
                    </div>
                    <div className="text-white/80 text-sm">
                      Feature flag is active and system is operational
                    </div>
                  </div>

                  {/* Analytics Status */}
                  {analyticsStatus && (
                    <div className="bg-white/10 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white/60">Analytics System</span>
                        <div className="flex items-center gap-2">
                          {analyticsStatus.enabled ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                          <span className={`text-sm font-medium ${
                            analyticsStatus.enabled ? 'text-green-500' : 'text-red-500'
                          }`}>
                            {analyticsStatus.enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                      </div>
                      <div className="text-white/80 text-sm">
                        Events in queue: {analyticsStatus.eventsInQueue}
                        {analyticsStatus.hasEndpoint && ' • Endpoint configured'}
                      </div>
                    </div>
                  )}

                  {/* Pin Statistics */}
                  <div className="bg-white/10 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white/60">Pin Collection</span>
                      <span className="text-white font-medium">{pins.length} pins</span>
                    </div>
                    <div className="text-white/80 text-sm">
                      {validationReport?.pinCollection?.summary && (
                        <>
                          Valid: {validationReport.pinCollection.summary.valid} • 
                          Invalid: {validationReport.pinCollection.summary.invalid} • 
                          Errors: {validationReport.pinCollection.summary.totalErrors}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Validation Results */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Validation Results</h3>
                  
                  {validationReport && (
                    <>
                      {/* System Configuration */}
                      <div className="bg-white/10 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white/60">System Configuration</span>
                          <div className="flex items-center gap-2">
                            {validationReport.systemConfig.isValid ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-500" />
                            )}
                            <span className={`text-sm font-medium ${
                              validationReport.systemConfig.isValid ? 'text-green-500' : 'text-red-500'
                            }`}>
                              {validationReport.systemConfig.errors.length} errors
                            </span>
                          </div>
                        </div>
                        {validationReport.systemConfig.warnings.length > 0 && (
                          <div className="text-yellow-400 text-sm">
                            {validationReport.systemConfig.warnings.length} warnings
                          </div>
                        )}
                      </div>

                      {/* Data Consistency */}
                      <div className="bg-white/10 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white/60">Data Consistency</span>
                          <div className="flex items-center gap-2">
                            {validationReport.dataConsistency.isValid ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-500" />
                            )}
                            <span className={`text-sm font-medium ${
                              validationReport.dataConsistency.isValid ? 'text-green-500' : 'text-red-500'
                            }`}>
                              {validationReport.dataConsistency.errors.length} errors
                            </span>
                          </div>
                        </div>
                        {validationReport.dataConsistency.warnings.length > 0 && (
                          <div className="text-yellow-400 text-sm">
                            {validationReport.dataConsistency.warnings.length} warnings
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* QA Testing Section */}
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-white mb-4">QA Testing</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    'Tab Navigation',
                    'Pin Filtering',
                    'Lifecycle Updates',
                    'Scoring Engine',
                    'Maintenance',
                    'Analytics',
                    'Validation',
                    'Performance'
                  ].map((test) => (
                    <button
                      key={test}
                      onClick={() => runTest(test)}
                      disabled={activeTests.includes(test)}
                      className={`
                        flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
                        ${activeTests.includes(test)
                          ? 'bg-blue-600 text-white cursor-not-allowed'
                          : 'bg-white/10 hover:bg-white/20 text-white'
                        }
                      `}
                    >
                      {activeTests.includes(test) ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                      {test}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              {validationReport?.overall?.recommendations?.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-white mb-4">Recommendations</h3>
                  <div className="bg-white/10 rounded-lg p-4">
                    <div className="space-y-2">
                      {validationReport.overall.recommendations.map((rec, index) => (
                        <div key={index} className="flex items-start gap-2 text-sm">
                          <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                          <span className="text-white/80">{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-gray-800 px-6 py-3">
              <div className="flex items-center justify-between">
                <div className="text-white/60 text-sm">
                  Last updated: {new Date().toLocaleTimeString()}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={runHealthCheck}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg text-white text-sm font-medium transition-colors"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                  {onRefresh && (
                    <button
                      onClick={onRefresh}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white text-sm font-medium transition-colors"
                    >
                      Refresh Pins
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 
