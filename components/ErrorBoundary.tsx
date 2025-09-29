"use client"

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { RefreshCw, Bug, Copy, Download } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorId: string
  retryCount: number
}

export class ErrorBoundary extends Component<Props, State> {
  private maxRetries = 3

  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    errorId: '',
    retryCount: 0
  }

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      errorId: `error-${Date.now()}`,
      retryCount: 0
    }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
      errorId: `error-${Date.now()}`
    })

    // Log error details
    console.error('🚨 ErrorBoundary caught an error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    })

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)

    // Store error in localStorage for debugging
    try {
      const errorLog = {
        id: this.state.errorId,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent
      }
      
      const existingLogs = JSON.parse(localStorage.getItem('pinit-error-logs') || '[]')
      existingLogs.push(errorLog)
      
      // Keep only last 10 error logs
      if (existingLogs.length > 10) {
        existingLogs.splice(0, existingLogs.length - 10)
      }
      
      localStorage.setItem('pinit-error-logs', JSON.stringify(existingLogs))
    } catch (logError) {
      console.error('Failed to log error to localStorage:', logError)
    }
  }

  private handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: this.state.retryCount + 1
      })
    } else {
      // Force page reload after max retries
      window.location.reload()
    }
  }

  private copyErrorDetails = () => {
    const errorDetails = {
      app: 'PINIT',
      version: '1.0.0',
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
      error: this.state.error?.message,
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      retryCount: this.state.retryCount
    }

    navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2))
      .then(() => {
        console.log('Error details copied to clipboard')
      })
      .catch((err) => {
        console.error('Failed to copy error details:', err)
      })
  }

  private downloadErrorLog = () => {
    try {
      const errorLogs = localStorage.getItem('pinit-error-logs') || '[]'
      const blob = new Blob([errorLogs], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      
      const a = document.createElement('a')
      a.href = url
      a.download = `pinit-error-log-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to download error log:', err)
    }
  }

  public render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      const canRetry = this.state.retryCount < this.maxRetries

      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full space-y-4">
            <Alert className="border-red-200 bg-red-50">
              <Bug className="h-4 w-4 text-red-600" />
              <AlertTitle className="text-red-800">
                Something went wrong
              </AlertTitle>
              <AlertDescription className="text-red-700">
                {this.state.error?.message || "Something went wrong. Please try again."}
              </AlertDescription>
            </Alert>

            <div className="bg-white rounded-lg p-6 shadow-lg space-y-4">
              <div className="text-center">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  PINIT Error
                </h2>
                <p className="text-gray-600 text-sm mb-4">
                  Error ID: <code className="bg-gray-100 px-2 py-1 rounded text-xs">{this.state.errorId}</code>
                </p>
              </div>

              <div className="space-y-3">
                {canRetry ? (
                  <Button 
                    onClick={this.handleRetry} 
                    className="w-full"
                    variant="default"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Try Again ({this.maxRetries - this.state.retryCount} attempts left)
                  </Button>
                ) : (
                  <Button 
                    onClick={() => window.location.reload()} 
                    className="w-full"
                    variant="default"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reload App
                  </Button>
                )}

                <div className="flex gap-2">
                  <Button 
                    onClick={this.copyErrorDetails}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Details
                  </Button>
                  
                  <Button 
                    onClick={this.downloadErrorLog}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download Log
                  </Button>
                </div>
              </div>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700">
                    Technical Details
                  </summary>
                  <div className="mt-2 p-3 bg-gray-50 rounded text-xs font-mono overflow-auto max-h-40">
                    <div className="text-red-600 mb-2">
                      <strong>Error:</strong> {this.state.error.message}
                    </div>
                    <div className="text-gray-600 mb-2">
                      <strong>Stack:</strong>
                      <pre className="whitespace-pre-wrap mt-1">{this.state.error.stack}</pre>
                    </div>
                    {this.state.errorInfo && (
                      <div className="text-gray-600">
                        <strong>Component Stack:</strong>
                        <pre className="whitespace-pre-wrap mt-1">{this.state.errorInfo.componentStack}</pre>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Higher-order component for easier usage
export function withErrorBoundary<T extends object>(
  Component: React.ComponentType<T>,
  fallback?: ReactNode
) {
  const WrappedComponent = (props: T) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  )
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  return WrappedComponent
}

export default ErrorBoundary 
