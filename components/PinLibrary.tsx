"use client"

import { useState, useCallback } from "react"
import { ArrowLeft, MapPin, Calendar, Edit3, Share2, Navigation, BookOpen } from "lucide-react"
import type { PinData } from "@/app/page"

interface PinLibraryProps {
  pins: PinData[]
  onBack: () => void
  onPinSelect: (pin: PinData) => void
  onPinUpdate: (pinId: string, updates: Partial<PinData>) => void
}

export function PinLibrary({ pins, onBack, onPinSelect, onPinUpdate }: PinLibraryProps) {
  const renderPinCard = (pin: PinData) => {
    return (
      <div key={pin.id} style={{
        background: "rgba(255,255,255,0.1)",
        borderRadius: "0.75rem",
        padding: "1rem",
        marginBottom: "1rem",
        color: "white",
        border: "1px solid rgba(255,255,255,0.1)"
      }}>
        {/* Title with Map Pin Icon */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <MapPin size={16} style={{ color: "#EF4444" }} />
          <h3 style={{ margin: 0, fontSize: "1.125rem", fontWeight: "bold" }}>{pin.title}</h3>
        </div>

        {/* Location */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem", opacity: 0.8, fontSize: "0.875rem" }}>
          <MapPin size={14} style={{ color: "#EF4444" }} />
          <span>{pin.locationName} ({pin.latitude}, {pin.longitude})</span>
        </div>

        {/* Timestamp */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem", opacity: 0.6, fontSize: "0.875rem" }}>
          <Calendar size={14} />
          <span>
            {pin.timestamp ? new Date(pin.timestamp).toLocaleString('en-GB', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            }) : 'Unknown date'}
          </span>
        </div>

        {/* Tags */}
        {pin.tags && pin.tags.length > 0 && (
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
            {pin.tags.map((tag, index) => (
              <span 
                key={index} 
                style={{
                  fontSize: "0.75rem",
                  background: "rgba(255,255,255,0.2)",
                  color: "rgba(255,255,255,0.8)",
                  padding: "0.25rem 0.75rem",
                  borderRadius: "9999px"
                }}
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button 
            style={{
              flex: 1,
              background: "rgba(255,255,255,0.2)",
              color: "white",
              padding: "0.5rem 0.75rem",
              borderRadius: "0.5rem",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem"
            }}
            onClick={() => {
              const url = `https://www.google.com/maps?q=${pin.latitude},${pin.longitude}`
              window.open(url, "_blank")
            }}
          >
            <Navigation size={14} />
            Open in Maps
          </button>
          <button 
            style={{
              flex: 1,
              background: "rgba(255,255,255,0.2)",
              color: "white",
              padding: "0.5rem 0.75rem",
              borderRadius: "0.5rem",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem"
            }}
            onClick={() => {
              const shareText = `Check out this amazing place I discovered: ${pin.title} at ${pin.locationName}! 📍`
              if (navigator.share) {
                navigator.share({
                  title: pin.title,
                  text: shareText,
                  url: `https://www.google.com/maps?q=${pin.latitude},${pin.longitude}`,
                })
              } else {
                navigator.clipboard.writeText(shareText)
                alert("Pin details copied to clipboard!")
              }
            }}
          >
            <Share2 size={14} />
            Share
          </button>
        </div>
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
      background: "linear-gradient(135deg, #7C3AED 0%, #3B82F6 100%)",
      display: "flex",
      flexDirection: "column",
      color: "white"
    }}>
      {/* Header */}
      <div style={{
        padding: "1rem",
        background: "rgba(0,0,0,0.2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ width: "1.5rem", height: "0.25rem", background: "#EF4444", borderRadius: "0.125rem", marginBottom: "0.25rem" }}></div>
              <div style={{ width: "1.5rem", height: "0.25rem", background: "#10B981", borderRadius: "0.125rem", marginBottom: "0.25rem" }}></div>
              <div style={{ width: "1.5rem", height: "0.25rem", background: "#3B82F6", borderRadius: "0.125rem" }}></div>
            </div>
            <div style={{ width: "0.5rem", height: "1rem", background: "#EF4444", borderRadius: "0.125rem" }}></div>
          </div>
          <span style={{ fontSize: "1.125rem", fontWeight: "600" }}>Pin Library</span>
        </div>
        
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button style={{
            background: "#10B981",
            color: "white",
            padding: "0.5rem 1rem",
            borderRadius: "0.5rem",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem"
          }}>
            <BookOpen size={16} />
            Story
          </button>
          <button 
            onClick={onBack}
            style={{
              background: "#6B7280",
              color: "white",
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              border: "none",
              cursor: "pointer"
            }}
          >
            Back
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "1rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {pins.length > 0 ? (
            pins.map((pin) => renderPinCard(pin))
          ) : (
            <div style={{ textAlign: "center", color: "rgba(255,255,255,0.6)", padding: "2rem" }}>
              <MapPin size={48} style={{ margin: "0 auto 1rem", opacity: 0.5 }} />
              <p style={{ fontSize: "1.125rem", margin: "0 0 0.5rem 0" }}>No pins yet</p>
              <p style={{ fontSize: "0.875rem", margin: 0 }}>Start pinning places to see them here!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
