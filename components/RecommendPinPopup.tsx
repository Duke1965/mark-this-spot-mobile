"use client"

import React from 'react'

interface RecommendPinPopupProps {
  isOpen: boolean
  onClose: () => void
  onRecommend: () => void
  onNoThanks: () => void
}

export function RecommendPinPopup({ 
  isOpen, 
  onClose, 
  onRecommend, 
  onNoThanks 
}: RecommendPinPopupProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-sm mx-4">
        {/* Modal */}
        <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-2xl p-8 text-center shadow-2xl">
          {/* Emoji */}
          <div className="text-6xl mb-4">🤔</div>
          
          {/* Question */}
          <h2 className="text-2xl font-bold text-green-400 mb-4">
            Do you recommend this pin?
          </h2>
          
          {/* Description */}
          <p className="text-white text-lg mb-8">
            Help others discover amazing places by sharing your experience.
          </p>
          
          {/* Buttons */}
          <div className="flex space-x-4">
            <button
              onClick={onNoThanks}
              className="flex-1 bg-purple-700 hover:bg-purple-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
            >
              No, thanks
            </button>
            <button
              onClick={onRecommend}
              className="flex-1 bg-green-500 hover:bg-green-400 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
            >
              Yes, recommend!
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
