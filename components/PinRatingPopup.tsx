"use client"

import React, { useState } from 'react'

interface PinRatingPopupProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (rating: number, note: string) => void
}

export function PinRatingPopup({ 
  isOpen, 
  onClose, 
  onSubmit 
}: PinRatingPopupProps) {
  const [rating, setRating] = useState(0)
  const [note, setNote] = useState('')

  if (!isOpen) return null

  const handleSubmit = () => {
    if (rating > 0) {
      onSubmit(rating, note)
      setRating(0)
      setNote('')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-sm mx-4">
        {/* Modal */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-8 text-center shadow-2xl">
          {/* Title */}
          <h2 className="text-2xl font-bold text-white mb-6">
            Rate This Pin
          </h2>
          
          {/* Pin Rating */}
          <div className="mb-6">
            <p className="text-white text-lg mb-4">How would you rate this place?</p>
            <div className="flex justify-center space-x-2">
              {[1, 2, 3, 4, 5].map((pin) => (
                <button
                  key={pin}
                  onClick={() => setRating(pin)}
                  className="w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-colors"
                >
                  📍
                </button>
              ))}
            </div>
            <p className="text-gray-300 text-sm mt-2">
              {rating === 0 ? 'Select a rating' : ${rating} pin - }
            </p>
          </div>

          {/* Note */}
          <div className="mb-6">
            <label className="block text-white text-lg mb-2">
              Add a note (optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Why do you recommend this place?"
              className="w-full p-3 rounded-lg bg-white/10 text-white placeholder-gray-300 border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400"
              rows={3}
            />
          </div>

          {/* Buttons */}
          <div className="flex space-x-4">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-600 hover:bg-gray-500 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={rating === 0}
              className="flex-1 bg-green-500 hover:bg-green-400 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-colors"
            >
              Submit Rating
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function getRatingText(rating: number): string {
  switch (rating) {
    case 1: return 'Not recommended'
    case 2: return 'Okay'
    case 3: return 'Good'
    case 4: return 'Great'
    case 5: return 'Amazing!'
    default: return ''
  }
}
