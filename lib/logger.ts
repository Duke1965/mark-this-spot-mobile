// Enhanced Logging System for PINIT
// Provides structured logging with different levels and persistence

// Remove imports from deleted files

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'performance'

export interface LogEntry {
  id: string
  level: LogLevel
  message: string
  data?: any
  timestamp: string
  component?: string
  userId?: string
  sessionId: string
  url: string
  userAgent: string
  isMobile: boolean
}

class Logger {
  private sessionId: string
  private maxLogs = 100
  private isEnabled = true
  private logBuffer: LogEntry[] = []
  private flushInterval: NodeJS.Timeout | null = null

  constructor() {
    this.sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
    this.initializeLogging()
  }

  private initializeLogging() {
    // Start periodic log flushing
    this.flushInterval = setInterval(() => {
      this.flushLogs()
    }, 30000) // Flush every 30 seconds

    // Flush logs before page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flushLogs()
      })
    }
  }

  private createLogEntry(level: LogLevel, message: string, data?: any, component?: string): LogEntry {
    return {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
      component,
      sessionId: this.sessionId,
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      isMobile: typeof navigator !== 'undefined' ? /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) : false
    }
  }

  private addToBuffer(entry: LogEntry) {
    this.logBuffer.push(entry)
    
    // Keep buffer size manageable
    if (this.logBuffer.length > this.maxLogs) {
      this.logBuffer.shift()
    }

    // Immediate flush for errors
    if (entry.level === 'error') {
      this.flushLogs()
    }
  }

  private flushLogs() {
    if (this.logBuffer.length === 0) return

    try {
      const existingLogs = JSON.parse(localStorage.getItem('pinit-logs') || '[]')
      existingLogs.push(...this.logBuffer)
      
      // Keep only recent logs
      if (existingLogs.length > this.maxLogs * 2) {
        existingLogs.splice(0, existingLogs.length - this.maxLogs * 2)
      }
      
      localStorage.setItem('pinit-logs', JSON.stringify(existingLogs))
      this.logBuffer = []
    } catch (error) {
      console.error('Failed to flush logs to localStorage:', error)
    }
  }

  public debug(message: string, data?: any, component?: string) {
    if (!this.isEnabled) return
    
    const entry = this.createLogEntry('debug', message, data, component)
    console.debug(`🐛 [${component || 'App'}] ${message}`, data)
    this.addToBuffer(entry)
  }

  public info(message: string, data?: any, component?: string) {
    if (!this.isEnabled) return
    
    const entry = this.createLogEntry('info', message, data, component)
    console.info(`ℹ️ [${component || 'App'}] ${message}`, data)
    this.addToBuffer(entry)
  }

  public warn(message: string, data?: any, component?: string) {
    if (!this.isEnabled) return
    
    const entry = this.createLogEntry('warn', message, data, component)
    console.warn(`⚠️ [${component || 'App'}] ${message}`, data)
    this.addToBuffer(entry)
  }

  public error(message: string, error?: Error | any, component?: string) {
    if (!this.isEnabled) return
    
    const errorData = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : error
    
    const entry = this.createLogEntry('error', message, errorData, component)
    console.error(`🚨 [${component || 'App'}] ${message}`, errorData)
    this.addToBuffer(entry)
  }

  public performance(message: string, duration?: number, component?: string) {
    if (!this.isEnabled) return
    
    const entry = this.createLogEntry('performance', message, { duration }, component)
    console.log(`⚡ [${component || 'App'}] ${message}${duration ? ` (${duration}ms)` : ''}`)
    this.addToBuffer(entry)
  }

  // Utility methods
  public startTimer(label: string): () => void {
    const startTime = performance.now()
    return () => {
      const duration = performance.now() - startTime
      this.performance(`${label} completed`, duration)
      return duration
    }
  }

  public async logAsyncOperation<T>(
    operation: () => Promise<T>,
    label: string,
    component?: string
  ): Promise<T> {
    const timer = this.startTimer(label)
    
    try {
      this.debug(`Starting ${label}`, undefined, component)
      const result = await operation()
      timer()
      this.debug(`${label} succeeded`, undefined, component)
      return result
    } catch (error) {
      timer()
      this.error(`${label} failed`, error, component)
      throw error
    }
  }

  public getLogs(level?: LogLevel, component?: string): LogEntry[] {
    try {
      const allLogs = JSON.parse(localStorage.getItem('pinit-logs') || '[]')
      let filteredLogs = [...this.logBuffer, ...allLogs]
      
      if (level) {
        filteredLogs = filteredLogs.filter(log => log.level === level)
      }
      
      if (component) {
        filteredLogs = filteredLogs.filter(log => log.component === component)
      }
      
      return filteredLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    } catch (error) {
      console.error('Failed to retrieve logs:', error)
      return []
    }
  }

  public exportLogs(): string {
    const allLogs = this.getLogs()
    return JSON.stringify({
      app: 'PINIT',
      version: '1.0.0',
      sessionId: this.sessionId,
      exportedAt: new Date().toISOString(),
      totalLogs: allLogs.length,
      logs: allLogs
    }, null, 2)
  }

  public clearLogs() {
    this.logBuffer = []
    try {
      localStorage.removeItem('pinit-logs')
      this.info('Log history cleared')
    } catch (error) {
      console.error('Failed to clear logs:', error)
    }
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled
    this.info(`Logging ${enabled ? 'enabled' : 'disabled'}`)
  }

  public getStats(): { total: number; byLevel: Record<LogLevel, number>; byComponent: Record<string, number> } {
    const logs = this.getLogs()
    const stats = {
      total: logs.length,
      byLevel: {
        debug: 0,
        info: 0,
        warn: 0,
        error: 0,
        performance: 0
      } as Record<LogLevel, number>,
      byComponent: {} as Record<string, number>
    }

    logs.forEach(log => {
      stats.byLevel[log.level]++
      const component = log.component || 'Unknown'
      stats.byComponent[component] = (stats.byComponent[component] || 0) + 1
    })

    return stats
  }

  public destroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval)
      this.flushInterval = null
    }
    this.flushLogs()
  }
}

// Singleton instance
export const logger = new Logger()

// Convenience functions
export const log = {
  debug: (message: string, data?: any, component?: string) => logger.debug(message, data, component),
  info: (message: string, data?: any, component?: string) => logger.info(message, data, component),
  warn: (message: string, data?: any, component?: string) => logger.warn(message, data, component),
  error: (message: string, error?: Error | any, component?: string) => logger.error(message, error, component),
  performance: (message: string, duration?: number, component?: string) => logger.performance(message, duration, component),
  timer: (label: string) => logger.startTimer(label),
  async: <T>(operation: () => Promise<T>, label: string, component?: string) => logger.logAsyncOperation(operation, label, component)
}

export default logger 
