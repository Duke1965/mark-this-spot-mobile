"use client"

import { useState, useCallback } from "react"
import { ArrowLeft, Instagram, Facebook, MessageCircle, Share2, Edit3, Download } from "lucide-react"
import type { LocationData } from "@/hooks/useLocationServices"
import type { MediaType } from "@/lib/types"

interface SocialShareProps {
  mediaUrl: string
  mediaType: MediaType
  location: LocationData | null
  onShare: (platform: string, mediaUrl: string) => void
  onEdit: () => void
  onBack: () => void
}

const socialPlatforms = [
  {
    id: "instagram",
    name: "Instagram",
    icon: Instagram,
    color: "from-purple-500 to-pink-500",
    template: "📍 Amazing discovery at {location}! ✨\n\n#PINIT #Discovery #Travel #Explore #TravelGram #Wanderlust",
    maxLength: 2200,
    shareUrl: (mediaUrl: string, caption: string) => 
      `https://www.instagram.com/create/story/?media=${encodeURIComponent(mediaUrl)}&caption=${encodeURIComponent(caption)}`
  },
  {
    id: "facebook",
    name: "Facebook",
    icon: Facebook,
    color: "from-blue-600 to-blue-700",
    template:
      "Just discovered this incredible place: {location}! 📍\n\nFound it using PINIT - the perfect app for explorers! 🗺️✨\n\n#PINIT #Discovery #Travel",
    maxLength: 63206,
    shareUrl: (mediaUrl: string, caption: string) => 
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(mediaUrl)}&quote=${encodeURIComponent(caption)}`
  },
  {
    id: "x",
    name: "X (Twitter)",
    icon: "𝕏",
    color: "from-black to-gray-800",
    template: "Amazing discovery at {location}! 📍✨ Found with @PINIT #Discovery #Travel #PINITApp",
    maxLength: 280,
    shareUrl: (mediaUrl: string, caption: string) => 
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(caption)}&url=${encodeURIComponent(mediaUrl)}`
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    icon: MessageCircle,
    color: "from-green-500 to-green-600",
    template: "Check out this cool place I found: {location}! 📍\n\nDiscovered using PINIT 🗺️\n\n{mediaUrl}",
    maxLength: 4096,
    shareUrl: (mediaUrl: string, caption: string) => 
      `https://wa.me/?text=${encodeURIComponent(caption.replace('{mediaUrl}', mediaUrl))}`
  },
  {
    id: "tiktok",
    name: "TikTok",
    icon: "📱",
    color: "from-black to-pink-500",
    template: "Amazing discovery at {location}! 📍 #PINIT #Discovery #Travel #TikTokTravel #Explore",
    maxLength: 2200,
    shareUrl: (mediaUrl: string, caption: string) => 
      `https://www.tiktok.com/upload?caption=${encodeURIComponent(caption)}`
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    icon: "💼",
    color: "from-blue-500 to-blue-700",
    template: "Professional discovery: Found this amazing location at {location}! 📍\n\nUsing PINIT for location-based networking and business opportunities. #PINIT #Business #Networking #Travel",
    maxLength: 3000,
    shareUrl: (mediaUrl: string, caption: string) => 
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(mediaUrl)}&summary=${encodeURIComponent(caption)}`
  }
]

export function SocialShare({ mediaUrl, mediaType, location, onShare, onEdit, onBack }: SocialShareProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null)
  const [customCaption, setCustomCaption] = useState("")

  const handlePlatformSelect = useCallback(
    (platform: (typeof socialPlatforms)[0]) => {
      const caption = platform.template.replace("{location}", "an amazing location")
      setCustomCaption(caption)
      setSelectedPlatform(platform.id)
    },
    [location],
  )

  const handleShare = useCallback(() => {
    if (selectedPlatform) {
      const platform = socialPlatforms.find(p => p.id === selectedPlatform)
      if (platform && platform.shareUrl) {
        // Use direct platform sharing when possible
        const shareUrl = platform.shareUrl(mediaUrl, customCaption)
        window.open(shareUrl, '_blank', 'width=600,height=400,scrollbars=yes,resizable=yes')
      } else {
        // Fallback to generic sharing
        onShare(selectedPlatform, mediaUrl)
      }
    }
  }, [selectedPlatform, mediaUrl, customCaption, onShare])

  const downloadMedia = useCallback(() => {
    const link = document.createElement("a")
    link.href = mediaUrl
    link.download = `pinit-${mediaType}-${Date.now()}.${mediaType === "photo" ? "jpg" : "mp4"}`
    link.click()
  }, [mediaUrl, mediaType])

  return (
    <div className="flex-1 flex flex-col bg-gradient-to-br from-purple-600 to-blue-600">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-sm p-4 flex items-center justify-between">
        <button onClick={onBack} className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors">
          <ArrowLeft size={20} />
        </button>

        <h1 className="text-xl font-bold">Share Discovery</h1>

        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
            title="Edit Photo"
          >
            <Edit3 size={20} />
          </button>

          <button
            onClick={downloadMedia}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
            title="Download"
          >
            <Download size={20} />
          </button>
        </div>
      </div>

      {/* Media Preview */}
      <div className="bg-black/20 p-4">
        <div className="aspect-square max-w-sm mx-auto rounded-xl overflow-hidden bg-black">
          {mediaType === "photo" ? (
            <img src={mediaUrl || "/placeholder.svg"} alt="Captured media" className="w-full h-full object-cover" />
          ) : (
            <video src={mediaUrl} className="w-full h-full object-cover" controls muted />
          )}
        </div>

        {location && (
          <div className="text-center mt-3 text-white/90">
            <div className="flex items-center justify-center gap-2">
              <span className="text-red-400">📍</span>
              <span className="font-semibold">Current Location</span>
            </div>
          </div>
        )}
      </div>

      {/* Platform Selection */}
      <div className="flex-1 p-4 overflow-y-auto">
        {!selectedPlatform ? (
          <div>
            <h2 className="text-lg font-bold text-white mb-4">Choose Platform</h2>
            <div className="grid grid-cols-2 gap-4">
              {socialPlatforms.map((platform) => {
                const IconComponent = platform.icon
                return (
                  <button
                    key={platform.id}
                    onClick={() => handlePlatformSelect(platform)}
                    className={`p-6 rounded-xl bg-gradient-to-r ${platform.color} text-white font-bold transition-transform hover:scale-105 active:scale-95`}
                  >
                    <div className="flex flex-col items-center gap-3">
                      <IconComponent size={32} />
                      <span>{platform.name}</span>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Native Share Option */}
            <button
              onClick={() => onShare("native", mediaUrl)}
              className="w-full mt-4 p-4 bg-white/20 hover:bg-white/30 rounded-xl text-white font-bold flex items-center justify-center gap-3 transition-colors"
            >
              <Share2 size={24} />
              More Sharing Options
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Customize Caption</h2>
              <button onClick={() => setSelectedPlatform(null)} className="text-white/70 hover:text-white text-sm">
                Change Platform
              </button>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-6">
              <textarea
                value={customCaption}
                onChange={(e) => setCustomCaption(e.target.value)}
                className="w-full h-32 bg-white/20 text-white placeholder-white/60 rounded-lg p-3 border border-white/30 resize-none"
                placeholder="Write your caption..."
              />

              <div className="flex justify-between items-center mt-3 text-sm text-white/70">
                <span>{customCaption.length} characters</span>
                <span>
                  {(() => {
                    const platform = socialPlatforms.find(p => p.id === selectedPlatform)
                    if (platform && customCaption.length > platform.maxLength) {
                      return <span className="text-red-400">Too long for {platform.name}</span>
                    }
                    if (platform && customCaption.length > platform.maxLength * 0.9) {
                      return <span className="text-yellow-400">Almost at limit</span>
                    }
                    return <span className="text-green-400">Good length</span>
                  })()}
                </span>
              </div>
            </div>

            {/* Share Button */}
            <button
              onClick={handleShare}
              disabled={!customCaption.trim()}
              className={`w-full py-4 rounded-xl font-bold text-lg transition-colors ${
                customCaption.trim()
                  ? "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                  : "bg-gray-500 text-gray-300 cursor-not-allowed"
              }`}
            >
              Share to {socialPlatforms.find((p) => p.id === selectedPlatform)?.name}
            </button>

            {/* Preview */}
            <div className="mt-6 bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <h3 className="font-bold text-white mb-2">Preview</h3>
              <div className="bg-black/20 rounded-lg p-3">
                <p className="text-white/90 text-sm whitespace-pre-wrap">
                  {customCaption || "Your caption will appear here..."}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
