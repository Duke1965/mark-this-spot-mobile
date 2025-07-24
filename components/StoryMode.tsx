"use client"

import { useState, useCallback } from "react"
import { ArrowLeft, Play, Share, MapPin } from "lucide-react"
import type { PinData } from "@/app/page"

interface StoryModeProps {
  pins: PinData[]
  onBackToCapture: () => void
  onCreatePin: () => Promise<PinData | null>
}

export function StoryMode({ pins, onBackToCapture, onCreatePin }: StoryModeProps) {
  const [selectedPins, setSelectedPins] = useState<string[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)

  const togglePinSelection = useCallback((pinId: string) => {
    setSelectedPins((prev) => (prev.includes(pinId) ? prev.filter((id) => id !== pinId) : [...prev, pinId]))
  }, [])

  const playStory = useCallback(() => {
    if (selectedPins.length === 0) return

    setIsPlaying(true)
    setCurrentIndex(0)

    // Auto-advance through pins
    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev >= selectedPins.length - 1) {
          setIsPlaying(false)
          clearInterval(interval)
          return 0
        }
        return prev + 1
      })
    }, 3000)
  }, [selectedPins])

  const shareStory = useCallback(() => {
    const storyText = `Check out my PINIT story with ${selectedPins.length} amazing moments! 📍✨`

    if (navigator.share) {
      navigator.share({
        title: "My PINIT Story",
        text: storyText,
        url: window.location.href,
      })
    } else {
      navigator.clipboard.writeText(storyText)
      alert("Story description copied to clipboard!")
    }
  }, [selectedPins.length])

  return (
    <div className="flex-1 flex flex-col bg-gradient-to-b from-purple-900 to-blue-900 text-white">
      {/* Header */}
      <div className="bg-black/50 p-4 flex items-center justify-between">
        <button onClick={onBackToCapture} className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors">
          <ArrowLeft size={20} />
        </button>

        <h1 className="text-xl font-bold">📖 Story Mode</h1>

        <div className="flex gap-2">
          {selectedPins.length > 0 && (
            <>
              <button
                onClick={playStory}
                className="p-2 rounded-lg bg-green-500 hover:bg-green-600 transition-colors"
                title="Play Story"
              >
                <Play size={20} />
              </button>

              <button
                onClick={shareStory}
                className="p-2 rounded-lg bg-blue-500 hover:bg-blue-600 transition-colors"
                title="Share Story"
              >
                <Share size={20} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Story Player */}
      {isPlaying && selectedPins.length > 0 && (
        <div className="bg-black/80 p-6 text-center">
          <div className="mb-4 text-sm opacity-80">
            {currentIndex + 1} of {selectedPins.length}
          </div>

          {(() => {
            const currentPin = pins.find((p) => p.id === selectedPins[currentIndex])
            if (!currentPin) return null

            return (
              <div>
                <div className="mb-4">
                  {currentPin.mediaType === "photo" ? (
                    <img
                      src={currentPin.mediaUrl || "/placeholder.svg"}
                      alt={currentPin.title}
                      className="max-w-full max-h-64 mx-auto rounded-lg"
                    />
                  ) : (
                    <video
                      src={currentPin.mediaUrl}
                      autoPlay
                      muted
                      className="max-w-full max-h-64 mx-auto rounded-lg"
                    />
                  )}
                </div>

                <h3 className="text-lg font-bold mb-2">{currentPin.title}</h3>

                <div className="flex items-center justify-center gap-2 text-sm opacity-80">
                  <MapPin size={14} />
                  <span>{currentPin.location}</span>
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 p-4 overflow-y-auto">
        {pins.length === 0 ? (
          <div className="flex-1 flex items-center justify-center flex-col gap-4 text-center">
            <div className="text-6xl">📍</div>
            <h2 className="text-2xl font-bold">No Pins Yet!</h2>
            <p className="opacity-80 max-w-sm">
              Go back to capture mode and create your first pin to start building stories
            </p>
            <button
              onClick={onBackToCapture}
              className="bg-blue-500 hover:bg-blue-600 px-6 py-3 rounded-lg font-bold transition-colors"
            >
              Start Capturing
            </button>
          </div>
        ) : (
          <>
            {/* Selection Summary */}
            <div className="bg-white/10 rounded-lg p-4 mb-6">
              <h2 className="text-lg font-bold mb-2">Create Your Story</h2>
              <p className="text-sm opacity-80 mb-3">
                Select pins to include in your story. They'll play in the order you select them.
              </p>

              {selectedPins.length > 0 && (
                <div className="bg-blue-500/20 rounded-lg p-3">
                  <div className="font-bold text-blue-200">
                    {selectedPins.length} pin{selectedPins.length !== 1 ? "s" : ""} selected
                  </div>
                </div>
              )}
            </div>

            {/* Pins Grid */}
            <div className="grid grid-cols-2 gap-4">
              {pins.map((pin, index) => (
                <button
                  key={pin.id}
                  onClick={() => togglePinSelection(pin.id)}
                  className={`relative rounded-lg overflow-hidden transition-all ${
                    selectedPins.includes(pin.id) ? "ring-4 ring-green-400 scale-95" : "hover:scale-105"
                  }`}
                >
                  {/* Selection Indicator */}
                  {selectedPins.includes(pin.id) && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold z-10">
                      {selectedPins.indexOf(pin.id) + 1}
                    </div>
                  )}

                  {/* Media */}
                  <div className="aspect-square bg-gray-800">
                    {pin.mediaType === "photo" ? (
                      <img
                        src={pin.mediaUrl || "/placeholder.svg"}
                        alt={pin.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <video src={pin.mediaUrl} className="w-full h-full object-cover" muted />
                    )}
                  </div>

                  {/* Info */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                    <div className="text-sm font-bold truncate">{pin.title}</div>
                    <div className="text-xs opacity-80 flex items-center gap-1">
                      <MapPin size={10} />
                      <span className="truncate">{pin.location}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Tips */}
      <div className="bg-blue-500/10 border-t border-blue-500/20 p-4">
        <h4 className="font-bold text-blue-200 mb-2">💡 Story Tips</h4>
        <ul className="text-sm opacity-80 space-y-1">
          <li>• Tap pins to add them to your story</li>
          <li>• Selected pins will play in order</li>
          <li>• Use the play button to preview your story</li>
          <li>• Share your completed story with friends</li>
        </ul>
      </div>
    </div>
  )
}
