"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Camera, MapPin, Library, Settings, Plus, Search, Filter, X, CheckCircle } from "lucide-react"
import CameraCapture from "@/components/CameraCapture"
import PinLibrary from "@/components/PinLibrary"
import GoogleMapsView from "@/components/GoogleMapsView"
import LocationDisplay from "@/components/LocationDisplay"
import { usePinStorage } from "@/hooks/usePinStorage"
import { useLocationServices } from "@/hooks/useLocationServices"

export default function PinitApp() {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState("camera")
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [selectedFilters, setSelectedFilters] = useState<string[]>([])
  const [showSuccessToast, setShowSuccessToast] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")

  const { pins, addPin, deletePin, updatePin } = usePinStorage()
  const { currentLocation, locationName, requestLocation } = useLocationServices()

  // Handle shared place success notification
  useEffect(() => {
    const shared = searchParams.get("shared")
    const place = searchParams.get("place")

    if (shared === "success" && place) {
      setSuccessMessage(`📍 ${decodeURIComponent(place)} added to recommendations!`)
      setShowSuccessToast(true)

      // Auto-dismiss after 5 seconds
      setTimeout(() => {
        setShowSuccessToast(false)
      }, 5000)

      // Switch to library tab to show the new pin
      setActiveTab("library")
    }
  }, [searchParams])

  // Handle quick actions from PWA shortcuts
  useEffect(() => {
    const action = searchParams.get("action")
    if (action === "quick-pin") {
      setActiveTab("camera")
      // Auto-trigger location request for quick pin
      requestLocation()
    } else if (action === "camera") {
      setActiveTab("camera")
    }
  }, [searchParams, requestLocation])

  const handleAddPin = (pinData: any) => {
    addPin(pinData)
    console.log("📌 Pin added:", pinData)
  }

  const handleDeletePin = (pinId: string) => {
    deletePin(pinId)
    console.log("🗑️ Pin deleted:", pinId)
  }

  const handleUpdatePin = (pinId: string, updates: any) => {
    updatePin(pinId, updates)
    console.log("✏️ Pin updated:", pinId, updates)
  }

  const filteredPins = pins.filter((pin) => {
    const matchesSearch =
      !searchQuery ||
      pin.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pin.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pin.locationName?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesFilters = selectedFilters.length === 0 || selectedFilters.some((filter) => pin.tags?.includes(filter))

    return matchesSearch && matchesFilters
  })

  const availableFilters = Array.from(new Set(pins.flatMap((pin) => pin.tags || []))).filter(Boolean)

  const toggleFilter = (filter: string) => {
    setSelectedFilters((prev) => (prev.includes(filter) ? prev.filter((f) => f !== filter) : [...prev, filter]))
  }

  const clearFilters = () => {
    setSelectedFilters([])
    setSearchQuery("")
    setShowFilters(false)
    setShowSearch(false)
  }

  return (
    <div className="h-screen bg-gradient-to-br from-blue-800 via-indigo-700 to-purple-800 flex flex-col relative overflow-hidden">
      {/* Success Toast */}
      {showSuccessToast && (
        <div className="fixed top-4 left-4 right-4 z-50 bg-emerald-600 text-white p-4 rounded-lg shadow-lg flex items-center gap-3 animate-in slide-in-from-top duration-300">
          <CheckCircle size={24} className="text-emerald-200" />
          <div className="flex-1">
            <p className="font-medium">{successMessage}</p>
            <p className="text-sm opacity-80">Check your library to see the new recommendation</p>
          </div>
          <button onClick={() => setShowSuccessToast(false)} className="p-1 hover:bg-emerald-700 rounded">
            <X size={20} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/20 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-lg">
            📍
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">PINIT</h1>
            <p className="text-xs text-white/70">Pin Your Moments</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "library" && (
            <>
              <button
                onClick={() => setShowSearch(!showSearch)}
                className={`p-2 rounded-lg transition-colors ${
                  showSearch ? "bg-white/20 text-white" : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
                }`}
              >
                <Search size={20} />
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 rounded-lg transition-colors relative ${
                  showFilters || selectedFilters.length > 0
                    ? "bg-white/20 text-white"
                    : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
                }`}
              >
                <Filter size={20} />
                {selectedFilters.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {selectedFilters.length}
                  </span>
                )}
              </button>
            </>
          )}
          <button className="p-2 bg-white/10 rounded-lg text-white/70 hover:bg-white/20 hover:text-white transition-colors">
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      {showSearch && activeTab === "library" && (
        <div className="px-4 pb-2">
          <div className="relative">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50" />
            <input
              type="text"
              placeholder="Search pins, locations, descriptions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white"
              >
                <X size={20} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      {showFilters && activeTab === "library" && (
        <div className="px-4 pb-2">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-medium">Filters</h3>
              {selectedFilters.length > 0 && (
                <button onClick={clearFilters} className="text-xs text-white/70 hover:text-white">
                  Clear all
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {availableFilters.map((filter) => (
                <button
                  key={filter}
                  onClick={() => toggleFilter(filter)}
                  className={`px-3 py-1 rounded-full text-xs transition-colors ${
                    selectedFilters.includes(filter)
                      ? "bg-white text-indigo-700 font-medium"
                      : "bg-white/20 text-white hover:bg-white/30"
                  }`}
                >
                  {filter}
                </button>
              ))}
              {availableFilters.length === 0 && (
                <p className="text-white/50 text-sm">No filters available yet. Create some pins to see filters!</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Location Display */}
      <LocationDisplay
        currentLocation={currentLocation}
        locationName={locationName}
        onRequestLocation={requestLocation}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "camera" && (
          <CameraCapture onCapture={handleAddPin} currentLocation={currentLocation} locationName={locationName} />
        )}
        {activeTab === "library" && (
          <PinLibrary
            pins={filteredPins}
            onDeletePin={handleDeletePin}
            onUpdatePin={handleUpdatePin}
            searchQuery={searchQuery}
            selectedFilters={selectedFilters}
          />
        )}
        {activeTab === "map" && (
          <GoogleMapsView pins={pins} currentLocation={currentLocation} onAddPin={handleAddPin} />
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="bg-black/30 backdrop-blur-sm border-t border-white/10">
        <div className="flex items-center justify-around py-2">
          {[
            { id: "camera", icon: Camera, label: "Camera" },
            { id: "library", icon: Library, label: "Library" },
            { id: "map", icon: MapPin, label: "Map" },
          ].map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex flex-col items-center gap-1 p-3 rounded-lg transition-colors ${
                activeTab === id ? "text-white bg-white/20" : "text-white/60 hover:text-white hover:bg-white/10"
              }`}
            >
              <Icon size={24} />
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Quick Add Button */}
      <button
        onClick={() => {
          setActiveTab("camera")
          requestLocation()
        }}
        className="absolute bottom-20 right-4 w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
      >
        <Plus size={28} className="text-white" />
      </button>
    </div>
  )
}
