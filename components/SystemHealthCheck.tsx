"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Activity, 
  Database, 
  Wifi, 
  MapPin, 
  Camera, 
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react'
import { logger, LogLevel } from '@/lib/logger'
import { APP_CONFIG, STORAGE_CONFIG } from '@/lib/constants'
import { 
  isMobileDevice, 
  isOnline, 
  getTotalStorageUsage, 
  formatStorageSize,
  getPlatformInfo 
} from '@/lib/helpers'

interface HealthStatus {
  status: 'healthy' | 'warning' | 'error'
  message: string
  details?: any
}

interface SystemHealth {
  overall: HealthStatus
  storage: HealthStatus
  network: HealthStatus
  location: HealthStatus
  camera: HealthStatus
  apis: HealthStatus
}

export default function SystemHealthCheck() {
  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [logs, setLogs] = useState<any[]>([])
  const [logLevel, setLogLevel] = useState<LogLevel>('info')

  useEffect(() => {
    runHealthCheck()
    loadLogs()
  }, [])

  const runHealthCheck = async () => {
    setIsChecking(true)
    logger.info('Starting system health check', undefined, 'SystemHealthCheck')

    try {
      const [storage, network, location, camera, apis] = await Promise.all([
        checkStorageHealth(),
        checkNetworkHealth(),
        checkLocationHealth(),
        checkCameraHealth(),
        checkAPIHealth()
      ])

      const overall = determineOverallHealth([storage, network, location, camera, apis])

      const healthResult = { overall, storage, network, location, camera, apis }
      setHealth(healthResult)
      
      logger.info('System health check completed', healthResult, 'SystemHealthCheck')
    } catch (error) {
      logger.error('Health check failed', error, 'SystemHealthCheck')
    } finally {
      setIsChecking(false)
    }
  }

  const checkStorageHealth = async (): Promise<HealthStatus> => {
    try {
      const usage = await getTotalStorageUsage()
      const quota = STORAGE_CONFIG.MAX_STORAGE_MB * 1024 * 1024
      const usagePercent = (usage / quota) * 100

      if (usagePercent > 90) {
        return {
          status: 'error',
          message: 'Storage almost full',
          details: { usage: formatStorageSize(usage), percent: usagePercent.toFixed(1) }
        }
      } else if (usagePercent > 70) {
        return {
          status: 'warning',
          message: 'Storage usage high',
          details: { usage: formatStorageSize(usage), percent: usagePercent.toFixed(1) }
        }
      }

      return {
        status: 'healthy',
        message: 'Storage healthy',
        details: { usage: formatStorageSize(usage), percent: usagePercent.toFixed(1) }
      }
    } catch (error) {
      return {
        status: 'error',
        message: 'Storage check failed',
        details: error
      }
    }
  }

  const checkNetworkHealth = async (): Promise<HealthStatus> => {
    try {
      const online = isOnline()
      
      if (!online) {
        return {
          status: 'error',
          message: 'No network connection',
          details: { online: false }
        }
      }

      // Test API connectivity
      const startTime = Date.now()
      const response = await fetch('/api/places?lat=0&lng=0&test=true')
      const duration = Date.now() - startTime

      if (response.ok) {
        return {
          status: 'healthy',
          message: `Network healthy (${duration}ms)`,
          details: { online: true, apiLatency: duration }
        }
      } else {
        return {
          status: 'warning',
          message: 'API connectivity issues',
          details: { online: true, apiStatus: response.status }
        }
      }
    } catch (error) {
      return {
        status: 'warning',
        message: 'Network check failed',
        details: error
      }
    }
  }

  const checkLocationHealth = async (): Promise<HealthStatus> => {
    try {
      if (!navigator.geolocation) {
        return {
          status: 'error',
          message: 'Geolocation not supported',
          details: { supported: false }
        }
      }

      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          resolve({
            status: 'warning',
            message: 'Location timeout',
            details: { timeout: true }
          })
        }, 5000)

        navigator.geolocation.getCurrentPosition(
          (position) => {
            clearTimeout(timeout)
            resolve({
              status: 'healthy',
              message: 'Location services working',
              details: {
                accuracy: position.coords.accuracy,
                timestamp: new Date(position.timestamp).toISOString()
              }
            })
          },
          (error) => {
            clearTimeout(timeout)
            resolve({
              status: 'error',
              message: `Location error: ${error.message}`,
              details: { code: error.code, message: error.message }
            })
          },
          { timeout: 5000 }
        )
      })
    } catch (error) {
      return {
        status: 'error',
        message: 'Location check failed',
        details: error
      }
    }
  }

  const checkCameraHealth = async (): Promise<HealthStatus> => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return {
          status: 'error',
          message: 'Camera not supported',
          details: { supported: false }
        }
      }

      const devices = await navigator.mediaDevices.enumerateDevices()
      const cameras = devices.filter(device => device.kind === 'videoinput')

      if (cameras.length === 0) {
        return {
          status: 'warning',
          message: 'No cameras found',
          details: { cameraCount: 0 }
        }
      }

      return {
        status: 'healthy',
        message: `${cameras.length} camera(s) available`,
        details: { 
          cameraCount: cameras.length,
          cameras: cameras.map(c => ({ id: c.deviceId, label: c.label }))
        }
      }
    } catch (error) {
      return {
        status: 'error',
        message: 'Camera check failed',
        details: error
      }
    }
  }

  const checkAPIHealth = async (): Promise<HealthStatus> => {
    const issues = []
    
    // Check environment variables
    if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
      issues.push('Google Maps API key missing')
    }
    
    if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
      issues.push('Firebase API key missing')
    }

    if (issues.length > 0) {
      return {
        status: 'warning',
        message: `API configuration issues (${issues.length})`,
        details: { issues }
      }
    }

    return {
      status: 'healthy',
      message: 'API configuration healthy',
      details: { configured: true }
    }
  }

  const determineOverallHealth = (checks: HealthStatus[]): HealthStatus => {
    const errors = checks.filter(c => c.status === 'error').length
    const warnings = checks.filter(c => c.status === 'warning').length

    if (errors > 0) {
      return {
        status: 'error',
        message: `${errors} critical issue(s) found`,
        details: { errors, warnings }
      }
    } else if (warnings > 0) {
      return {
        status: 'warning',
        message: `${warnings} warning(s) found`,
        details: { errors, warnings }
      }
    }

    return {
      status: 'healthy',
      message: 'All systems healthy',
      details: { errors, warnings }
    }
  }

  const loadLogs = () => {
    const recentLogs = logger.getLogs(logLevel).slice(0, 50)
    setLogs(recentLogs)
  }

  const downloadHealthReport = () => {
    const report = {
      app: APP_CONFIG.NAME,
      version: APP_CONFIG.VERSION,
      timestamp: new Date().toISOString(),
      platform: getPlatformInfo(),
      health,
      logs: logger.getLogs().slice(0, 100),
      stats: logger.getStats()
    }

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = `pinit-health-report-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const getStatusIcon = (status: HealthStatus['status']) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case 'error': return <XCircle className="h-4 w-4 text-red-600" />
    }
  }

  const getStatusColor = (status: HealthStatus['status']) => {
    switch (status) {
      case 'healthy': return 'bg-green-100 text-green-800 border-green-200'
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'error': return 'bg-red-100 text-red-800 border-red-200'
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">System Health</h1>
        <div className="flex gap-2">
          <Button 
            onClick={runHealthCheck} 
            disabled={isChecking}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
            {isChecking ? 'Checking...' : 'Refresh'}
          </Button>
          <Button 
            onClick={downloadHealthReport}
            variant="outline"
            size="sm"
          >
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {health && (
        <Alert className={getStatusColor(health.overall.status)}>
          {getStatusIcon(health.overall.status)}
          <div className="ml-2">
            <h3 className="font-semibold">{health.overall.message}</h3>
            <p className="text-sm opacity-90">
              Last checked: {new Date().toLocaleTimeString()}
            </p>
          </div>
        </Alert>
      )}

      <Tabs defaultValue="health" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="health">Health Status</TabsTrigger>
          <TabsTrigger value="logs">Recent Logs</TabsTrigger>
          <TabsTrigger value="system">System Info</TabsTrigger>
        </TabsList>

        <TabsContent value="health" className="space-y-4">
          {health && (
            <div className="grid gap-4 md:grid-cols-2">
              {Object.entries(health).filter(([key]) => key !== 'overall').map(([key, status]) => (
                <Card key={key}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      {key === 'storage' && <Database className="h-4 w-4" />}
                      {key === 'network' && <Wifi className="h-4 w-4" />}
                      {key === 'location' && <MapPin className="h-4 w-4" />}
                      {key === 'camera' && <Camera className="h-4 w-4" />}
                      {key === 'apis' && <Activity className="h-4 w-4" />}
                      {key.charAt(0).toUpperCase() + key.slice(1)}
                      <Badge variant={status.status === 'healthy' ? 'default' : status.status === 'warning' ? 'secondary' : 'destructive'}>
                        {status.status}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-2">{status.message}</p>
                    {status.details && (
                      <details className="text-xs text-gray-500">
                        <summary className="cursor-pointer">Details</summary>
                        <pre className="mt-2 p-2 bg-gray-50 rounded overflow-auto">
                          {JSON.stringify(status.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <div className="flex items-center gap-2">
            <select 
              value={logLevel} 
              onChange={(e) => setLogLevel(e.target.value as LogLevel)}
              className="px-3 py-1 border rounded text-sm"
            >
              <option value="debug">Debug</option>
              <option value="info">Info</option>
              <option value="warn">Warning</option>
              <option value="error">Error</option>
              <option value="performance">Performance</option>
            </select>
            <Button onClick={loadLogs} variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Logs
            </Button>
          </div>

          <div className="space-y-2 max-h-96 overflow-auto">
            {logs.map((log, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded text-xs font-mono">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={log.level === 'error' ? 'destructive' : log.level === 'warn' ? 'secondary' : 'outline'}>
                    {log.level}
                  </Badge>
                  <span className="text-gray-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  {log.component && (
                    <span className="text-blue-600">[{log.component}]</span>
                  )}
                </div>
                <div className="text-gray-800">{log.message}</div>
                {log.data && (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-gray-600">Data</summary>
                    <pre className="mt-1 p-2 bg-white rounded overflow-auto max-h-20">
                      {JSON.stringify(log.data, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Application</CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-2">
                <div><strong>Name:</strong> {APP_CONFIG.NAME}</div>
                <div><strong>Version:</strong> {APP_CONFIG.VERSION}</div>
                <div><strong>Environment:</strong> {process.env.NODE_ENV || 'production'}</div>
                <div><strong>Mobile:</strong> {isMobileDevice() ? 'Yes' : 'No'}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Platform</CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-2">
                <div><strong>User Agent:</strong> {navigator.userAgent.slice(0, 50)}...</div>
                <div><strong>Language:</strong> {navigator.language}</div>
                <div><strong>Cookies:</strong> {navigator.cookieEnabled ? 'Enabled' : 'Disabled'}</div>
                <div><strong>Online:</strong> {navigator.onLine ? 'Yes' : 'No'}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Performance</CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-2">
                <div><strong>Memory:</strong> {(performance as any).memory ? `${Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024)}MB` : 'Unknown'}</div>
                <div><strong>Connection:</strong> {(navigator as any).connection?.effectiveType || 'Unknown'}</div>
                <div><strong>Hardware:</strong> {navigator.hardwareConcurrency || 'Unknown'} cores</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Logs</CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-2">
                {(() => {
                  const stats = logger.getStats()
                  return (
                    <>
                      <div><strong>Total:</strong> {stats.total}</div>
                      <div><strong>Errors:</strong> {stats.byLevel.error}</div>
                      <div><strong>Warnings:</strong> {stats.byLevel.warn}</div>
                      <div><strong>Session:</strong> {logger.sessionId.slice(0, 8)}...</div>
                    </>
                  )
                })()}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
} 
