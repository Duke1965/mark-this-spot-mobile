"use client"

import { useState, useEffect } from "react"
import { MapPin, X, Settings } from "lucide-react"

interface LocationPermissionPromptProps {
  onRequestPermission: () => Promise<boolean>
  permissionStatus: PermissionState | null
}

export function LocationPermissionPrompt({ 
  onRequestPermission, 
  permissionStatus 
}: LocationPermissionPromptProps) {
  const [showPrompt, setShowPrompt] = useState(false)
  const [isRequesting, setIsRequesting] = useState(false)
  const [hasRequestedBefore, setHasRequestedBefore] = useState(false)

  useEffect(() => {
    // Check if user has already made a permission decision
    const hasRequested = localStorage.getItem('pinit_location_requested')
    setHasRequestedBefore(!!hasRequested)

    // Show prompt only if:
    // 1. Permission is not granted
    // 2. Haven't shown prompt in this session
    if (permissionStatus !== 'granted' && !hasRequested) {
      // Show prompt after a brief delay for better UX
      const timer = setTimeout(() => {
        setShowPrompt(true)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [permissionStatus])

  const handleRequestPermission = async () => {
    setIsRequesting(true)
    try {
      const granted = await onRequestPermission()
      
      // Mark that we've requested permission
      localStorage.setItem('pinit_location_requested', 'true')
      
      if (granted) {
        setShowPrompt(false)
      } else {
        // Permission denied - keep prompt open with instructions
        setHasRequestedBefore(true)
      }
    } catch (error) {
      console.error('Permission request failed:', error)
    } finally {
      setIsRequesting(false)
    }
  }

  const handleDismiss = () => {
    localStorage.setItem('pinit_location_requested', 'true')
    setShowPrompt(false)
  }

  // Don't show if permission already granted or prompt is dismissed
  if (!showPrompt || permissionStatus === 'granted') {
    return null
  }

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(5px)',
          zIndex: 9998,
          animation: 'fadeIn 0.3s ease-in-out'
        }}
        onClick={handleDismiss}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '90%',
          maxWidth: '400px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '20px',
          padding: '30px 25px',
          zIndex: 9999,
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          animation: 'slideUp 0.3s ease-out'
        }}
      >
        {/* Close button */}
        <button
          onClick={handleDismiss}
          style={{
            position: 'absolute',
            top: '15px',
            right: '15px',
            background: 'rgba(255, 255, 255, 0.2)',
            border: 'none',
            borderRadius: '50%',
            width: '30px',
            height: '30px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'white'
          }}
        >
          <X size={18} />
        </button>

        {/* Icon */}
        <div
          style={{
            width: '60px',
            height: '60px',
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px'
          }}
        >
          <MapPin size={30} color="white" />
        </div>

        {/* Title */}
        <h2
          style={{
            color: 'white',
            fontSize: '22px',
            fontWeight: '700',
            textAlign: 'center',
            margin: '0 0 15px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
          }}
        >
          Enable Location Access
        </h2>

        {/* Description */}
        <p
          style={{
            color: 'rgba(255, 255, 255, 0.9)',
            fontSize: '15px',
            lineHeight: '1.6',
            textAlign: 'center',
            margin: '0 0 25px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
          }}
        >
          {!hasRequestedBefore ? (
            <>
              PINIT needs access to your location to help you discover and pin amazing places near you! 📍
            </>
          ) : (
            <>
              <strong>Location access was denied.</strong><br />
              To use PINIT, please enable location in your browser settings.
            </>
          )}
        </p>

        {/* Buttons */}
        {!hasRequestedBefore ? (
          <button
            onClick={handleRequestPermission}
            disabled={isRequesting}
            style={{
              width: '100%',
              background: 'white',
              color: '#667eea',
              border: 'none',
              borderRadius: '12px',
              padding: '15px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: isRequesting ? 'not-allowed' : 'pointer',
              opacity: isRequesting ? 0.7 : 1,
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
              transition: 'transform 0.2s ease',
              marginBottom: '10px'
            }}
            onMouseDown={(e) => {
              if (!isRequesting) {
                e.currentTarget.style.transform = 'scale(0.95)'
              }
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
            }}
          >
            {isRequesting ? 'Requesting...' : 'Allow Location Access'}
          </button>
        ) : (
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              padding: '15px',
              marginBottom: '15px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <Settings size={20} color="white" />
              <strong style={{ color: 'white', fontSize: '14px' }}>How to Enable:</strong>
            </div>
            <ol
              style={{
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: '13px',
                lineHeight: '1.6',
                margin: 0,
                paddingLeft: '20px'
              }}
            >
              <li>Go to your browser settings</li>
              <li>Find &quot;Site permissions&quot; or &quot;Location&quot;</li>
              <li>Allow location for this site</li>
              <li>Refresh the page</li>
            </ol>
          </div>
        )}

        {/* Skip button */}
        <button
          onClick={handleDismiss}
          style={{
            width: '100%',
            background: 'transparent',
            color: 'rgba(255, 255, 255, 0.8)',
            border: 'none',
            padding: '10px',
            fontSize: '14px',
            cursor: 'pointer',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
          }}
        >
          {hasRequestedBefore ? 'Close' : 'Maybe Later'}
        </button>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translate(-50%, -40%);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%);
          }
        }
      `}</style>
    </>
  )
}

