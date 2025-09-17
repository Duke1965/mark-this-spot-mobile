"use client"

import { useState } from "react"
import { ArrowLeft, Search, Filter, Plus, Share2, Edit3, Trash2, Camera, Video, MapPin, Star, Calendar } from "lucide-react"
import type { PinData } from "@/lib/types"

interface PinLibraryProps {
  pins: PinData[]
  onBack: () => void
  onPinSelect: (pin: PinData) => void
  onPinUpdate: (pinId: string, updates: any) => void
}

export function PinLibrary({ pins, onBack, onPinSelect, onPinUpdate }: PinLibraryProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [currentTab, setCurrentTab] = useState<"photos" | "videos" | "pins" | "recommended">("pins")

  const getTabData = () => {
    console.log("🔍 Current tab:", currentTab, "Total pins:", pins.length)
    console.log("📌 Sample pins:", pins.slice(0, 2))
    
    switch (currentTab) {
      case "photos":
        const photos = pins.filter(pin => pin.mediaType === "photo")
        console.log("📸 Photos found:", photos.length)
        return photos
      case "videos":
        const videos = pins.filter(pin => pin.mediaType === "video")
        console.log("🎥 Videos found:", videos.length)
        return videos
      case "pins":
        const regularPins = pins.filter(pin => !pin.isRecommended)
        console.log("📍 Regular pins found:", regularPins.length)
        return regularPins
      case "recommended":
        const recommended = pins.filter(pin => pin.isRecommended)
        console.log("⭐ Recommended found:", recommended.length)
        return recommended
      default:
        return pins
    }
  }

  const filteredData = getTabData().filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.locationName.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  const renderPinCard = (item: any, type: 'pin' | 'photo' | 'video' | 'recommended') => {
    if (!item || !item.id) return null

    const isPin = type === 'pin' || type === 'recommended'
    const isPhoto = type === 'photo'
    const isVideo = type === 'video'

    return (
      <div key={item.id} style={{
        background: "rgba(255,255,255,0.1)",
        borderRadius: "0.75rem",
        padding: "1rem",
        cursor: "pointer",
        border: "1px solid rgba(255,255,255,0.1)",
        transition: "all 0.2s ease",
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
      }}>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          {/* Media Thumbnail */}
          <div style={{
            width: "60px",
            height: "60px",
            borderRadius: "0.5rem",
            overflow: "hidden",
            background: "rgba(255,255,255,0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative"
          }}>
            {item.mediaUrl ? (
              <img
                src={item.mediaUrl}
                alt={item.title}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  if (target) {
                    target.src = "/placeholder.jpg"
                  }
                }}
              />
            ) : (
              <span style={{ fontSize: "1.5rem" }}>
                {isPin && <MapPin />}
                {isPhoto && <Camera />}
                {isVideo && <Video />}
                {type === 'recommended' && <Star />}
              </span>
            )}
            
            {/* Type Badge */}
            {isVideo && (
              <div style={{
                position: "absolute",
                top: "4px",
                right: "4px",
                background: "rgba(0,0,0,0.7)",
                color: "white",
                fontSize: "0.75rem",
                padding: "2px 4px",
                borderRadius: "4px"
              }}>
                ▶
              </div>
            )}
          </div>

          {/* Content */}
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: "0 0 0.25rem 0", fontSize: "1rem", fontWeight: "bold" }}>
              {item.title}
            </h3>
            <p style={{ margin: "0 0 0.25rem 0", fontSize: "0.875rem", opacity: 0.8 }}>
              📍 {item.locationName}
            </p>
            {item.personalThoughts && (
              <p style={{ margin: "0 0 0.25rem 0", fontSize: "0.75rem", opacity: 0.7, fontStyle: "italic" }}>
                💭 "{item.personalThoughts}"
              </p>
            )}
            <p style={{ margin: 0, fontSize: "0.75rem", opacity: 0.6 }}>
              <Calendar size={12} style={{ display: "inline", marginRight: "4px" }} />
              {new Date(item.timestamp).toLocaleDateString()}
            </p>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: "0.25rem" }}>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onPinSelect(item)
              }}
              style={{
                padding: "0.25rem",
                background: "rgba(255,255,255,0.2)",
                border: "none",
                borderRadius: "0.25rem",
                color: "white",
                cursor: "pointer"
              }}
            >
              <Share2 size={14} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onPinUpdate(item.id, {})
              }}
              style={{
                padding: "0.25rem",
                background: "rgba(255,255,255,0.2)",
                border: "none",
                borderRadius: "0.25rem",
                color: "white",
                cursor: "pointer"
              }}
            >
              <Edit3 size={14} />
            </button>
          </div>
        </div>

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <div style={{ display: "flex", gap: "0.25rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
            {item.tags.slice(0, 3).map((tag: string, index: number) => (
              <span
                key={index}
                style={{
                  fontSize: "0.75rem",
                  background: "rgba(255,255,255,0.2)",
                  padding: "0.125rem 0.5rem",
                  borderRadius: "9999px"
                }}
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #3730a3 100%)",
      display: "flex",
      flexDirection: "column",
      color: "white",
      zIndex: 1000
    }}>
      {/* Header */}
      <div style={{
        padding: "1rem",
        background: "rgba(30, 58, 138, 0.95)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        backdropFilter: "blur(15px)",
        borderBottom: "1px solid rgba(255,255,255,0.2)",
      }}>
        <button
          onClick={onBack}
          style={{
            background: "rgba(255,255,255,0.15)",
            color: "white",
            padding: "0.75rem",
            borderRadius: "0.75rem",
            border: "1px solid rgba(255,255,255,0.2)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            transition: "all 0.2s ease",
            backdropFilter: "blur(10px)",
          }}
        >
          <ArrowLeft size={20} />
          Back
        </button>
        
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "1.125rem", fontWeight: "600" }}>PINIT Library</span>
        </div>

        <div style={{ width: "40px" }}></div>
      </div>

      {/* Tab Navigation */}
      <div style={{ padding: "1rem", background: "rgba(30, 58, 138, 0.95)", backdropFilter: "blur(15px)", borderBottom: "1px solid rgba(255,255,255,0.2)" }}>
        <div style={{ display: "flex", gap: "0.25rem", marginBottom: "1rem" }}>
          {[
            { id: "pins", label: "Pins", icon: "📍" },
            { id: "photos", label: "Photos", icon: "📸" },
            { id: "videos", label: "Videos", icon: "🎥" },
            { id: "recommended", label: "Recommended", icon: "⭐" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id as any)}
              style={{
                flex: 1,
                padding: "0.75rem 0.5rem",
                borderRadius: "0.75rem",
                border: "1px solid rgba(255,255,255,0.2)",
                background: currentTab === tab.id ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)",
                color: "white",
                cursor: "pointer",
                fontSize: "0.875rem",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.25rem",
                transition: "all 0.2s ease",
                backdropFilter: "blur(10px)",
              }}
            >
              <span style={{ fontSize: "1.25rem" }}>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: "relative" }}>
          <Search size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", opacity: 0.6 }} />
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "0.75rem 0.75rem 0.75rem 2.5rem",
                borderRadius: "0.75rem",
                border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.15)",
              color: "white",
                fontSize: "0.875rem",
                backdropFilter: "blur(10px)",
            }}
          />
        </div>
      </div>

      {/* Content Grid */}
      <div style={{ flex: 1, overflowY: "auto", padding: "1rem" }}>
        {filteredData.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem", opacity: 0.7 }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>
              {currentTab === "photos" ? "📸" : 
               currentTab === "videos" ? "🎥" : 
               currentTab === "recommended" ? "⭐" : "📍"}
            </div>
            <h3>No {currentTab} found</h3>
            <p>Create your first {currentTab.slice(0, -1)} to get started!</p>
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: "1rem",
            padding: "0.5rem"
          }}>
            {filteredData.map((item) => renderPinCard(item, 
              currentTab === "pins" ? "pin" : 
              currentTab === "photos" ? "photo" : 
              currentTab === "videos" ? "video" : 
              "recommended"
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
