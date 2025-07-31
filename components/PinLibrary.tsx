"use client"

import { useState } from "react"
import { ArrowLeft, Search, Filter, Plus, Share2, Edit3, Trash2 } from "lucide-react"
import type { PinData } from "@/app/page"

interface PinLibraryProps {
  pins: PinData[]
  onBack: () => void
  onPinSelect: (pin: PinData) => void
  onPinUpdate: (pinId: string, updates: any) => void
}

export function PinLibrary({ pins, onBack, onPinSelect, onPinUpdate }: PinLibraryProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedFilter, setSelectedFilter] = useState("all")

  const filteredPins = pins.filter(pin => {
    const matchesSearch = pin.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pin.locationName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = selectedFilter === "all" || 
                         (selectedFilter === "recommended" && pin.isRecommended) ||
                         (selectedFilter === "recent" && pin.timestamp > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    return matchesSearch && matchesFilter
  })

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)",
      display: "flex",
      flexDirection: "column",
      color: "white",
      zIndex: 1000
    }}>
      {/* Header */}
      <div style={{
        padding: "1rem",
        background: "rgba(0,0,0,0.2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <button
          onClick={onBack}
          style={{
            background: "rgba(255,255,255,0.2)",
            color: "white",
            padding: "0.5rem",
            borderRadius: "0.5rem",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem"
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

      {/* Search and Filter */}
      <div style={{ padding: "1rem", background: "rgba(0,0,0,0.1)" }}>
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
          <div style={{ flex: 1, position: "relative" }}>
            <Search size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", opacity: 0.6 }} />
            <input
              type="text"
              placeholder="Search pins..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                padding: "0.75rem 0.75rem 0.75rem 2.5rem",
                borderRadius: "0.5rem",
                border: "none",
                background: "rgba(255,255,255,0.2)",
                color: "white",
                fontSize: "0.875rem"
              }}
            />
          </div>
        </div>

        {/* Filter Buttons */}
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {["all", "recommended", "recent"].map(filter => (
            <button
              key={filter}
              onClick={() => setSelectedFilter(filter)}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "0.5rem",
                border: "none",
                background: selectedFilter === filter ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.1)",
                color: "white",
                cursor: "pointer",
                fontSize: "0.875rem",
                textTransform: "capitalize"
              }}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Pins List */}
      <div style={{ flex: 1, overflowY: "auto", padding: "1rem" }}>
        {filteredPins.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem", opacity: 0.7 }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📌</div>
            <h3>No pins found</h3>
            <p>Create your first pin to get started!</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {filteredPins.map((pin) => (
              <div
                key={pin.id}
                onClick={() => onPinSelect(pin)}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  borderRadius: "0.75rem",
                  padding: "1rem",
                  cursor: "pointer",
                  border: "1px solid rgba(255,255,255,0.1)",
                  transition: "all 0.2s ease"
                }}
              >
                <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                  {/* Pin Image */}
                  <div style={{
                    width: "60px",
                    height: "60px",
                    borderRadius: "0.5rem",
                    overflow: "hidden",
                    background: "rgba(255,255,255,0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    {pin.mediaUrl ? (
                      <img
                        src={pin.mediaUrl}
                        alt={pin.title}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <span style={{ fontSize: "1.5rem" }}>📍</span>
                    )}
                  </div>

                  {/* Pin Details */}
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: "0 0 0.25rem 0", fontSize: "1rem", fontWeight: "bold" }}>
                      {pin.title}
                    </h3>
                    <p style={{ margin: "0 0 0.25rem 0", fontSize: "0.875rem", opacity: 0.8 }}>
                      📍 {pin.locationName}
                    </p>
                    <p style={{ margin: 0, fontSize: "0.75rem", opacity: 0.6 }}>
                      {new Date(pin.timestamp).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Pin Actions */}
                  <div style={{ display: "flex", gap: "0.25rem" }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        // Handle share
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
                        // Handle edit
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
                {pin.tags && pin.tags.length > 0 && (
                  <div style={{ display: "flex", gap: "0.25rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
                    {pin.tags.slice(0, 3).map((tag, index) => (
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
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
