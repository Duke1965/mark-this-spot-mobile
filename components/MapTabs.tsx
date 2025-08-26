import React, { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, TrendingUp, Clock, Star, Map } from 'lucide-react'
import { isMapLifecycleEnabled } from '@/lib/mapLifecycle'

export type TabType = 'recent' | 'trending' | 'classics' | 'all'

interface MapTabsProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  pinCounts?: {
    recent: number
    trending: number
    classics: number
    all: number
  }
  className?: string
}

export function MapTabs({ 
  activeTab, 
  onTabChange, 
  pinCounts, 
  className = '' 
}: MapTabsProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [showScrollButtons, setShowScrollButtons] = useState(false)

  // Check if pin management system is enabled
  const isEnabled = isMapLifecycleEnabled()

  useEffect(() => {
    // Animate in after mount
    const timer = setTimeout(() => setIsVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    // Check if we need scroll buttons on mobile
    const checkScroll = () => {
      const container = document.getElementById('map-tabs-container')
      if (container) {
        setShowScrollButtons(container.scrollWidth > container.clientWidth)
      }
    }

    checkScroll()
    window.addEventListener('resize', checkScroll)
    return () => window.removeEventListener('resize', checkScroll)
  }, [])

  const tabs = [
    {
      id: 'recent' as TabType,
      label: 'Recent',
      icon: Clock,
      description: 'Recently active places',
      color: 'from-blue-500 to-blue-600'
    },
    {
      id: 'trending' as TabType,
      label: 'Trending',
      icon: TrendingUp,
      description: 'Bursting with activity',
      color: 'from-green-500 to-green-600'
    },
    {
      id: 'classics' as TabType,
      label: 'Classics',
      icon: Star,
      description: 'Timeless favorites',
      color: 'from-yellow-500 to-yellow-600'
    },
    {
      id: 'all' as TabType,
      label: 'All',
      icon: Map,
      description: 'Complete collection',
      color: 'from-gray-500 to-gray-600'
    }
  ]

  const scrollTabs = (direction: 'left' | 'right') => {
    const container = document.getElementById('map-tabs-container')
    if (container) {
      const scrollAmount = direction === 'left' ? -200 : 200
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  if (!isEnabled) {
    return null // Don't render if system is disabled
  }

  return (
    <div className={`relative ${className}`}>
      {/* Tab Navigation */}
      <div className="relative bg-white/10 backdrop-blur-md rounded-2xl p-2 shadow-lg border border-white/20">
        {/* Scroll Buttons (Mobile) */}
        {showScrollButtons && (
          <>
            <button
              onClick={() => scrollTabs('left')}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white/20 hover:bg-white/30 rounded-full p-1.5 transition-all duration-200 backdrop-blur-sm"
            >
              <ChevronLeft className="w-4 h-4 text-white" />
            </button>
            <button
              onClick={() => scrollTabs('right')}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-white/20 hover:bg-white/30 rounded-full p-1.5 transition-all duration-200 backdrop-blur-sm"
            >
              <ChevronRight className="w-4 h-4 text-white" />
            </button>
          </>
        )}

        {/* Tabs Container */}
        <div
          id="map-tabs-container"
          className="flex gap-2 overflow-x-auto scrollbar-hide scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            const count = pinCounts?.[tab.id] || 0

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`
                  flex flex-col items-center gap-2 px-4 py-3 rounded-xl transition-all duration-300
                  ${isActive 
                    ? `bg-gradient-to-r ${tab.color} text-white shadow-lg scale-105` 
                    : 'bg-white/10 hover:bg-white/20 text-white/80 hover:text-white hover:scale-102'
                  }
                  min-w-[80px] flex-shrink-0
                `}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-white/80'}`} />
                <div className="text-center">
                  <div className="font-semibold text-sm">{tab.label}</div>
                  {count > 0 && (
                    <div className="text-xs opacity-80">
                      {count} {count === 1 ? 'pin' : 'pins'}
                    </div>
                  )}
                </div>
                
                {/* Active Indicator */}
                {isActive && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full shadow-lg" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Active Tab Description */}
      <div className={`
        mt-3 text-center transition-all duration-300
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
      `}>
        <div className="text-white/80 text-sm">
          {tabs.find(t => t.id === activeTab)?.description}
        </div>
      </div>
    </div>
  )
}

// Hide scrollbar for webkit browsers
const style = document.createElement('style')
style.textContent = `
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
`
document.head.appendChild(style) 
