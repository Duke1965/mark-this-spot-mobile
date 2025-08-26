import React, { useState } from 'react'
import { X, TrendingUp, Clock, Star, ThumbsUp, ThumbsDown, RefreshCw, Info } from 'lucide-react'
import { PinData } from '@/app/page'
import { getPinLifecycleStatus, getLifecycleRecommendations } from '@/lib/pinLifecycle'
import { getScoreInsights, getScoreRecommendations } from '@/lib/scoringEngine'
import { isMapLifecycleEnabled } from '@/lib/mapLifecycle'

interface PinDetailsModalProps {
  pin: PinData | null
  isOpen: boolean
  onClose: () => void
  onRenew?: (pin: PinData) => void
  onDownvote?: (pin: PinData) => void
  allPins: PinData[]
}

export function PinDetailsModal({
  pin,
  isOpen,
  onClose,
  onRenew,
  onDownvote,
  allPins
}: PinDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'lifecycle' | 'scoring' | 'community'>('overview')

  // Check if pin management system is enabled
  const isEnabled = isMapLifecycleEnabled()

  if (!isOpen || !pin || !isEnabled) {
    return null
  }

  // Get lifecycle status
  const lifecycleStatus = getPinLifecycleStatus(pin)
  const lifecycleRecommendations = getLifecycleRecommendations(pin)

  // Get scoring insights
  const scoreInsights = getScoreInsights(pin, allPins)
  const scoreRecommendations = getScoreRecommendations(pin)

  // Calculate days since creation and last activity
  const daysSinceCreation = Math.floor((Date.now() - new Date(pin.timestamp).getTime()) / (1000 * 60 * 60 * 24))
  const daysSinceLastActivity = pin.lastEndorsedAt 
    ? Math.floor((Date.now() - new Date(pin.lastEndorsedAt).getTime()) / (1000 * 60 * 60 * 24))
    : daysSinceCreation

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Info },
    { id: 'lifecycle', label: 'Lifecycle', icon: Clock },
    { id: 'scoring', label: 'Scoring', icon: TrendingUp },
    { id: 'community', label: 'Community', icon: Star }
  ]

  const renderOverview = () => (
    <div className="space-y-4">
      {/* Basic Info */}
      <div className="bg-white/10 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-2">Basic Information</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-white/60">Name:</span>
            <div className="text-white font-medium">{pin.locationName || pin.title}</div>
          </div>
          <div>
            <span className="text-white/60">Category:</span>
            <div className="text-white font-medium capitalize">{pin.category || 'general'}</div>
          </div>
          <div>
            <span className="text-white/60">Created:</span>
            <div className="text-white font-medium">{daysSinceCreation} days ago</div>
          </div>
          <div>
            <span className="text-white/60">Last Active:</span>
            <div className="text-white font-medium">{daysSinceLastActivity} days ago</div>
          </div>
        </div>
      </div>

      {/* Current Status */}
      <div className="bg-white/10 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-2">Current Status</h3>
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
            lifecycleStatus.tab === 'trending' ? 'bg-green-500/20 text-green-300' :
            lifecycleStatus.tab === 'recent' ? 'bg-blue-500/20 text-blue-300' :
            lifecycleStatus.tab === 'classics' ? 'bg-yellow-500/20 text-yellow-300' :
            'bg-gray-500/20 text-gray-300'
          }`}>
            {lifecycleStatus.tab.toUpperCase()}
          </div>
          <div className="text-white/80 text-sm">{lifecycleStatus.reason}</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white/10 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-3">Quick Actions</h3>
        <div className="flex gap-3">
          {onRenew && (
            <button
              onClick={() => onRenew(pin)}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg text-white text-sm font-medium transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Renew
            </button>
          )}
          {onDownvote && (
            <button
              onClick={() => onDownvote(pin)}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg text-white text-sm font-medium transition-colors"
            >
              <ThumbsDown className="w-4 h-4" />
              Not Relevant
            </button>
          )}
        </div>
      </div>
    </div>
  )

  const renderLifecycle = () => (
    <div className="space-y-4">
      {/* Lifecycle Status */}
      <div className="bg-white/10 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-3">Lifecycle Status</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-white/60">Current Tab:</span>
            <span className="text-white font-medium capitalize">{lifecycleStatus.tab}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-white/60">Total Endorsements:</span>
            <span className="text-white font-medium">{pin.totalEndorsements || 1}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-white/60">Recent Endorsements:</span>
            <span className="text-white font-medium">{pin.recentEndorsements || 1}</span>
          </div>
          {lifecycleStatus.daysUntilExpiry && (
            <div className="flex items-center justify-between">
              <span className="text-white/60">Days Until Expiry:</span>
              <span className="text-white font-medium">{lifecycleStatus.daysUntilExpiry}</span>
            </div>
          )}
          {lifecycleStatus.daysUntilClassic && (
            <div className="flex items-center justify-between">
              <span className="text-white/60">Days Until Classic:</span>
              <span className="text-white font-medium">{lifecycleStatus.daysUntilClassic}</span>
            </div>
          )}
          {lifecycleStatus.endorsementsUntilClassic && (
            <div className="flex items-center justify-between">
              <span className="text-white/60">Endorsements Until Classic:</span>
              <span className="text-white font-medium">{lifecycleStatus.endorsementsUntilClassic}</span>
            </div>
          )}
        </div>
      </div>

      {/* Recommendations */}
      {lifecycleRecommendations.length > 0 && (
        <div className="bg-white/10 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-3">Recommendations</h3>
          <div className="space-y-2">
            {lifecycleRecommendations.map((rec, index) => (
              <div key={index} className="flex items-start gap-2 text-sm">
                <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                <span className="text-white/80">{rec}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  const renderScoring = () => (
    <div className="space-y-4">
      {/* Score Overview */}
      <div className="bg-white/10 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-3">Trending Score</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-white/60">Current Score:</span>
            <span className="text-white font-medium text-lg">{pin.score?.toFixed(2) || '0.00'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-white/60">Percentile:</span>
            <span className="text-white font-medium">{scoreInsights.percentile}%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-white/60">Rank:</span>
            <span className="text-white font-medium">#{scoreInsights.rank} of {scoreInsights.totalPins}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-white/60">Trend:</span>
            <span className={`font-medium ${
              scoreInsights.trend === 'rising' ? 'text-green-400' :
              scoreInsights.trend === 'falling' ? 'text-red-400' :
              'text-yellow-400'
            }`}>
              {scoreInsights.trend.charAt(0).toUpperCase() + scoreInsights.trend.slice(1)}
            </span>
          </div>
        </div>
      </div>

      {/* Score Recommendations */}
      {scoreRecommendations.length > 0 && (
        <div className="bg-white/10 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-3">Score Improvement</h3>
          <div className="space-y-2">
            {scoreRecommendations.map((rec, index) => (
              <div key={index} className="flex items-start gap-2 text-sm">
                <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                <span className="text-white/80">{rec}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  const renderCommunity = () => (
    <div className="space-y-4">
      {/* Community Signals */}
      <div className="bg-white/10 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-3">Community Signals</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-white/60">Total Endorsements:</span>
            <span className="text-white font-medium">{pin.totalEndorsements || 1}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-white/60">Recent Endorsements:</span>
            <span className="text-white font-medium">{pin.recentEndorsements || 1}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-white/60">Downvotes:</span>
            <span className="text-white font-medium">{pin.downvotes || 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-white/60">Status:</span>
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              pin.isHidden ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'
            }`}>
              {pin.isHidden ? 'Hidden' : 'Visible'}
            </span>
          </div>
        </div>
      </div>

      {/* Community Actions */}
      <div className="bg-white/10 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-3">Community Actions</h3>
        <div className="flex gap-3">
          {onRenew && (
            <button
              onClick={() => onRenew(pin)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg text-white text-sm font-medium transition-colors"
            >
              <ThumbsUp className="w-4 h-4" />
              Still Good
            </button>
          )}
          {onDownvote && (
            <button
              onClick={() => onDownvote(pin)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg text-white text-sm font-medium transition-colors"
            >
              <ThumbsDown className="w-4 h-4" />
              Not Relevant
            </button>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Pin Details</h2>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <p className="text-white/80 mt-1">{pin.locationName || pin.title}</p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-gray-800 px-6 py-3">
          <div className="flex gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                    ${isActive 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'lifecycle' && renderLifecycle()}
          {activeTab === 'scoring' && renderScoring()}
          {activeTab === 'community' && renderCommunity()}
        </div>
      </div>
    </div>
  )
} 
