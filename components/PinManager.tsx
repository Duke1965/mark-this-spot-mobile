"use client"

import { Save, X, Play } from "lucide-react"
import type { PinData } from "@/app/client-page"
import type { MediaType } from "@/lib/types"

interface PinManagerProps {
  mediaUrl: string | null
  mediaType: MediaType
  audioUrl: string | null
  onCreatePin: () => Promise<PinData | null>
  onReset: () => void
  pins: PinData[]
}

export function PinManager({ mediaUrl, mediaType, audioUrl, onCreatePin, onReset, pins }: PinManagerProps) {
  if (!mediaUrl) return null

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-black/90 p-4 z-20">
      {/* Media Preview */}
      <div className="flex items-center gap-4 mb-4">
        <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-800">
          {mediaType === "photo" ? (
            <img src={mediaUrl || "/placeholder.svg"} alt="Captured" className="w-full h-full object-cover" />
          ) : (
            <video src={mediaUrl} className="w-full h-full object-cover" muted />
          )}
        </div>

        <div className="flex-1 text-white">
          <div className="font-bold">{mediaType === "photo" ? "📸 Photo" : "🎥 Video"} Captured</div>
          {audioUrl && (
            <div className="text-sm opacity-80 flex items-center gap-1">
              🎵 Audio recorded
              <button className="ml-1 p-1 rounded bg-white/20">
                <Play size={12} />
              </button>
            </div>
          )}
          <div className="text-xs opacity-60">Ready to save as pin</div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onCreatePin}
          className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 px-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
        >
          <Save size={20} />
          Save Pin
        </button>

        <button
          onClick={onReset}
          className="bg-white/20 hover:bg-white/30 text-white py-3 px-4 rounded-lg flex items-center justify-center transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Quick Stats */}
      {pins.length > 0 && (
        <div className="mt-3 text-center text-white/60 text-sm">
          You have {pins.length} pin{pins.length !== 1 ? "s" : ""} saved
        </div>
      )}
    </div>
  )
}
