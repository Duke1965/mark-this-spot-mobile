import React, { useState, useEffect, useRef, useCallback } from 'react'
import { MapTabs, TabType } from './MapTabs'
import { isMapLifecycleEnabled } from '@/lib/mapLifecycle'
import { getPinsForTab } from '@/lib/pinLifecycle'
import { getScoreInsights } from '@/lib/scoringEngine'
import { PinData } from '@/app/client-page'

interface EnhancedMapViewProps {
  pins: PinData[]
  onPinSelect: (pin: PinData) => void
  userLocation?: { lat: number; lng: number }
  className?: string
}

interface MapPin {
  id: string
  lat: number
  lng: number
  name: string
  category: string
  score: number
  totalEndorsements: number
  recentEndorsements: number
  isTrending: boolean
  isClassic: boolean
  isExpiringSoon: boolean
  originalPin: PinData
}

export function EnhancedMapView({ 
  pins, 
  onPinSelect, 
  userLocation, 
  className = '' 
}: EnhancedMapViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>('recent')
  const [filteredPins, setFilteredPins] = useState<MapPin[]>([])
  const [pinCounts, setPinCounts] = useState({
    recent: 0,
    trending: 0,
    classics: 0,
    all: 0
  })
  const [isLoading, setIsLoading] = useState(false)
  const [mapBounds, setMapBounds] = useState<any>(null)
  const [zoom, setZoom] = useState(12)

  // Check if pin management system is enabled
  const isEnabled = isMapLifecycleEnabled()

  // Filter pins based on active tab
  useEffect(() => {
    if (!isEnabled) {
      setFilteredPins([])
      return
    }

    setIsLoading(true)
    
    try {
      // Get pins for the active tab
      const tabPins = getPinsForTab(pins, activeTab)
      
      // Transform to MapPin format
      const mapPins: MapPin[] = tabPins.map(pin => {
        const insights = getScoreInsights(pin, pins)
        const isExpiringSoon = false
        
        return {
          id: pin.placeId || pin.id,
          lat: pin.latitude,
          lng: pin.longitude,
          name: pin.locationName || pin.title,
          category: pin.category || 'general',
          score: pin.score || 0,
          totalEndorsements: pin.totalEndorsements || 1,
          recentEndorsements: pin.recentEndorsements || 1,
          isTrending: insights.isTrending,
          isClassic: false,
          isExpiringSoon,
          originalPin: pin
        }
      })

      setFilteredPins(mapPins)
      
      // Update pin counts
      setPinCounts({
        recent: getPinsForTab(pins, 'recent').length,
        trending: getPinsForTab(pins, 'trending').length,
        classics: getPinsForTab(pins, 'classics').length,
        all: getPinsForTab(pins, 'all').length
      })
      
    } catch (error) {
      console.error('Error filtering pins:', error)
      setFilteredPins([])
    } finally {
      setIsLoading(false)
    }
  }, [pins, activeTab, isEnabled])

  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab)
  }, [])

  const handleMapBoundsChange = useCallback((bounds: any) => {
    setMapBounds(bounds)
  }, [])

  const handleZoomChange = useCallback((newZoom: number) => {
    setZoom(newZoom)
  }, [])

  // Render map pins with clustering
  const renderMapPins = () => {
    if (!isEnabled || filteredPins.length === 0) {
      return null
    }

    return (
      <div className="absolute inset-0 pointer-events-none">
        {filteredPins.map((pin) => (
          <MapPinMarker
            key={pin.id}
            pin={pin}
            onClick={() => onPinSelect(pin.originalPin)}
            zoom={zoom}
          />
        ))}
      </div>
    )
  }

  // Render clustering info
  const renderClusteringInfo = () => {
    if (!isEnabled || zoom >= 14) return null

    const clusterCount = filteredPins.length
    if (clusterCount === 0) return null

    return (
      <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md rounded-lg px-3 py-2 text-white text-sm">
        <div className="font-semibold">{clusterCount} {clusterCount === 1 ? 'place' : 'places'}</div>
        <div className="text-xs opacity-80">
          {zoom < 12 ? 'Zoom in to see details' : 'Tap pins for more info'}
        </div>
      </div>
    )
  }

  // Render tab-specific insights
  const renderTabInsights = () => {
    if (!isEnabled) return null

    const insights = {
      recent: {
        title: 'Recently Active',
        description: `${pinCounts.recent} places with recent activity`,
        icon: '⏰'
      },
      trending: {
        title: 'Trending Now',
        description: `${pinCounts.trending} places with burst activity`,
        icon: '📈'
      },
      classics: {
        title: 'Timeless Favorites',
        description: `${pinCounts.classics} places with lasting appeal`,
        icon: '🏆'
      },
      all: {
        title: 'Complete Collection',
        description: `${pinCounts.all} places in your collection`,
        icon: '🗺️'
      }
    }

    const currentInsight = insights[activeTab]

    return (
      <div className="absolute top-4 left-4 bg-white/20 backdrop-blur-md rounded-lg px-3 py-2 text-white max-w-xs">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">{currentInsight.icon}</span>
          <div className="font-semibold text-sm">{currentInsight.title}</div>
        </div>
        <div className="text-xs opacity-80">{currentInsight.description}</div>
      </div>
    )
  }

  if (!isEnabled) {
    return (
      <div className={`relative ${className}`}>
        <div className="bg-gray-800 rounded-lg p-8 text-center text-white">
          <div className="text-lg font-semibold mb-2">Pin Management System</div>
          <div className="text-sm opacity-80">
            Enable the feature flag to use the new pin management system
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      {/* Map Tabs */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
        <MapTabs
          activeTab={activeTab}
          onTabChange={handleTabChange}
          pinCounts={pinCounts}
        />
      </div>

      {/* Tab Insights */}
      {renderTabInsights()}

      {/* Clustering Info */}
      {renderClusteringInfo()}

      {/* Map Container */}
      <div className="relative w-full h-full bg-gray-900 rounded-lg overflow-hidden">
        {/* Placeholder for Google Maps */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="text-2xl mb-2">🗺️</div>
            <div className="text-lg font-semibold mb-1">Google Maps Integration</div>
            <div className="text-sm opacity-80">
              Map will be integrated here with clustering support
            </div>
          </div>
        </div>

        {/* Map Pins Overlay */}
        {renderMapPins()}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
            <div className="bg-white/20 backdrop-blur-md rounded-lg px-4 py-2 text-white">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto mb-2"></div>
              <div className="text-sm">Loading {activeTab} pins...</div>
            </div>
          </div>
        )}

        {/* No Pins Message */}
        {!isLoading && filteredPins.length === 0 && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
            <div className="bg-white/20 backdrop-blur-md rounded-lg px-6 py-4 text-white text-center">
              <div className="text-2xl mb-2">📍</div>
              <div className="text-lg font-semibold mb-1">No {activeTab} pins</div>
              <div className="text-sm opacity-80">
                {activeTab === 'recent' && 'Create some pins to see them here'}
                {activeTab === 'trending' && 'Pins need more activity to trend'}
                {activeTab === 'classics' && 'Pins need time and endorsements to become classics'}
                {activeTab === 'all' && 'No pins found in your collection'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Debug Info (Development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute bottom-4 left-4 bg-black/50 text-white text-xs p-2 rounded">
          <div>Tab: {activeTab}</div>
          <div>Pins: {filteredPins.length}</div>
          <div>Zoom: {zoom}</div>
        </div>
      )}
    </div>
  )
}

// Individual Map Pin Marker Component
interface MapPinMarkerProps {
  pin: MapPin
  onClick: () => void
  zoom: number
}

function MapPinMarker({ pin, onClick, zoom }: MapPinMarkerProps) {
  const [isHovered, setIsHovered] = useState(false)

  const getPinStyle = () => {
    let baseStyle = 'absolute w-8 h-8 rounded-full border-2 border-white shadow-lg cursor-pointer transition-all duration-200 transform hover:scale-110'
    
    if (pin.isTrending) {
      baseStyle += ' bg-gradient-to-r from-green-400 to-green-500 animate-pulse'
    } else if (pin.isClassic) {
      baseStyle += ' bg-gradient-to-r from-yellow-400 to-yellow-500'
    } else if (pin.isExpiringSoon) {
      baseStyle += ' bg-gradient-to-r from-orange-400 to-orange-500 animate-bounce'
    } else {
      baseStyle += ' bg-gradient-to-r from-blue-400 to-blue-500'
    }
    
    return baseStyle
  }

  const getPinSize = () => {
    if (zoom >= 16) return 'w-10 h-10'
    if (zoom >= 14) return 'w-8 h-8'
    if (zoom >= 12) return 'w-6 h-6'
    return 'w-4 h-4'
  }

  return (
    <div
      className={`${getPinStyle()} ${getPinSize()}`}
      style={{
        left: `${((pin.lng + 180) / 360) * 100}%`,
        top: `${((90 - pin.lat) / 180) * 100}%`,
        transform: 'translate(-50%, -50%)'
      }}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Pin Content */}
      <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
        {pin.totalEndorsements > 1 ? pin.totalEndorsements : '•'}
      </div>

      {/* Hover Tooltip */}
      {isHovered && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
          <div className="font-semibold">{pin.name}</div>
          <div className="opacity-80">{pin.category}</div>
          <div className="opacity-80">{pin.totalEndorsements} endorsements</div>
        </div>
      )}
    </div>
  )
} 
