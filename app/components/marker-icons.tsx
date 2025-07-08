"use client"

interface MarkerIconProps {
  type: "pin" | "flag" | "post" | "diamond" | "star"
  color?: string
  size?: number
  selected?: boolean
}

export function MarkerIcon({ type, color = "#3B82F6", size = 32, selected = false }: MarkerIconProps) {
  const shadowStyle = {
    filter: "drop-shadow(2px 4px 8px rgba(0,0,0,0.3))",
  }

  const glowStyle = selected
    ? {
        filter: "drop-shadow(0 0 16px rgba(59, 130, 246, 1)) drop-shadow(2px 4px 8px rgba(0,0,0,0.3))",
        transform: "scale(1.1)",
      }
    : shadowStyle

  const containerStyle = {
    transition: "all 0.3s ease",
    ...glowStyle,
  }

  switch (type) {
    case "pin":
      return (
        <div style={containerStyle}>
          <svg width={size} height={size} viewBox="0 0 32 32">
            {/* Pin Shadow */}
            <ellipse cx="17" cy="29" rx="3" ry="1.5" fill="rgba(0,0,0,0.2)" />

            {/* Pin Body - 3D Effect */}
            <path
              d="M16 4C11.6 4 8 7.6 8 12c0 6 8 16 8 16s8-10 8-16c0-4.4-3.6-8-8-8z"
              fill={`url(#pinGradient-${color.replace("#", "")})`}
              stroke="rgba(0,0,0,0.1)"
              strokeWidth="0.5"
            />

            {/* Pin Highlight */}
            <path
              d="M16 4C13 4 10.5 6 9.5 8.5c0.5-1.5 2.5-2.5 4.5-2.5 2 0 4 1 4 3 0 1-0.5 2-1 2.5 1-0.5 2-1.5 2-3 0-2.2-1.8-4-4-4z"
              fill="rgba(255,255,255,0.4)"
            />

            {/* Pin Center Dot */}
            <circle cx="16" cy="12" r="3" fill="rgba(255,255,255,0.9)" />
            <circle cx="16" cy="12" r="2" fill={color} />

            {/* Selection Ring */}
            {selected && (
              <circle
                cx="16"
                cy="12"
                r="5"
                fill="none"
                stroke="#3B82F6"
                strokeWidth="2"
                opacity="0.8"
                className="animate-pulse"
              />
            )}

            {/* Gradient Definitions */}
            <defs>
              <linearGradient id={`pinGradient-${color.replace("#", "")}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={color} />
                <stop offset="50%" stopColor={color} stopOpacity="0.8" />
                <stop offset="100%" stopColor={color} stopOpacity="0.6" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      )

    case "flag":
      return (
        <div style={containerStyle}>
          <svg width={size} height={size} viewBox="0 0 32 32">
            {/* Flag Shadow */}
            <ellipse cx="17" cy="29" rx="2" ry="1" fill="rgba(0,0,0,0.2)" />

            {/* Flag Pole */}
            <rect x="15" y="6" width="2" height="22" fill="#8B5CF6" />
            <rect x="15" y="6" width="1" height="22" fill="rgba(255,255,255,0.3)" />

            {/* Flag Body */}
            <path d="M17 6 L28 6 L26 12 L28 18 L17 18 Z" fill="#EF4444" stroke="rgba(0,0,0,0.1)" strokeWidth="0.5" />

            {/* Flag Highlight */}
            <path d="M17 6 L28 6 L26 9 L17 9 Z" fill="rgba(255,255,255,0.4)" />

            {/* Selection Ring */}
            {selected && (
              <circle
                cx="22"
                cy="12"
                r="8"
                fill="none"
                stroke="#EF4444"
                strokeWidth="2"
                opacity="0.8"
                className="animate-pulse"
              />
            )}
          </svg>
        </div>
      )

    case "post":
      return (
        <div style={containerStyle}>
          <svg width={size} height={size} viewBox="0 0 32 32">
            {/* Post Shadow */}
            <ellipse cx="17" cy="29" rx="4" ry="1.5" fill="rgba(0,0,0,0.2)" />

            {/* Post Base */}
            <rect x="12" y="24" width="8" height="4" rx="1" fill="#6B7280" />
            <rect x="12" y="24" width="4" height="2" fill="rgba(255,255,255,0.2)" />

            {/* Post Pole */}
            <rect x="14" y="8" width="4" height="18" fill="#8B5CF6" />
            <rect x="14" y="8" width="2" height="18" fill="rgba(255,255,255,0.3)" />

            {/* Post Top */}
            <circle cx="16" cy="10" r="6" fill="#10B981" />
            <circle cx="16" cy="10" r="4" fill="#10B981" />
            <circle cx="14" cy="8" r="2" fill="rgba(255,255,255,0.5)" />

            {/* Selection Ring */}
            {selected && (
              <circle
                cx="16"
                cy="10"
                r="8"
                fill="none"
                stroke="#10B981"
                strokeWidth="2"
                opacity="0.8"
                className="animate-pulse"
              />
            )}
          </svg>
        </div>
      )

    case "diamond":
      return (
        <div style={containerStyle}>
          <svg width={size} height={size} viewBox="0 0 32 32">
            {/* Diamond Shadow */}
            <ellipse cx="17" cy="29" rx="3" ry="1.5" fill="rgba(0,0,0,0.2)" />

            {/* Diamond Body */}
            <path d="M16 4 L24 12 L16 26 L8 12 Z" fill="#8B5CF6" stroke="rgba(0,0,0,0.1)" strokeWidth="0.5" />

            {/* Diamond Facets */}
            <path d="M16 4 L20 8 L16 12 L12 8 Z" fill="rgba(255,255,255,0.6)" />
            <path d="M16 12 L20 8 L24 12 L16 20 Z" fill="#8B5CF6" opacity="0.8" />
            <path d="M16 12 L12 8 L8 12 L16 20 Z" fill="#8B5CF6" opacity="0.6" />

            {/* Diamond Sparkle */}
            <circle cx="14" cy="8" r="1" fill="rgba(255,255,255,0.9)" />
            <circle cx="18" cy="10" r="0.5" fill="rgba(255,255,255,0.7)" />

            {/* Selection Ring */}
            {selected && (
              <path
                d="M16 2 L26 12 L16 28 L6 12 Z"
                fill="none"
                stroke="#8B5CF6"
                strokeWidth="2"
                opacity="0.8"
                className="animate-pulse"
              />
            )}
          </svg>
        </div>
      )

    case "star":
      return (
        <div style={containerStyle}>
          <svg width={size} height={size} viewBox="0 0 32 32">
            {/* Star Shadow */}
            <ellipse cx="17" cy="29" rx="3" ry="1.5" fill="rgba(0,0,0,0.2)" />

            {/* Star Body */}
            <path
              d="M16 4 L19 13 L28 13 L21 18 L24 27 L16 22 L8 27 L11 18 L4 13 L13 13 Z"
              fill="#F59E0B"
              stroke="rgba(0,0,0,0.1)"
              strokeWidth="0.5"
            />

            {/* Star Highlights */}
            <path d="M16 4 L17.5 8.5 L19 13 L16 11 L13 13 L14.5 8.5 Z" fill="rgba(255,255,255,0.5)" />
            <circle cx="16" cy="15" r="2" fill="rgba(255,255,255,0.3)" />

            {/* Star Sparkles */}
            <circle cx="12" cy="10" r="0.5" fill="rgba(255,255,255,0.8)" />
            <circle cx="20" cy="8" r="0.5" fill="rgba(255,255,255,0.8)" />
            <circle cx="18" cy="20" r="0.5" fill="rgba(255,255,255,0.8)" />

            {/* Selection Ring */}
            {selected && (
              <path
                d="M16 2 L20 12 L30 12 L22 19 L26 29 L16 24 L6 29 L10 19 L2 12 L12 12 Z"
                fill="none"
                stroke="#F59E0B"
                strokeWidth="2"
                opacity="0.8"
                className="animate-pulse"
              />
            )}
          </svg>
        </div>
      )

    default:
      return null
  }
}

export function MarkerSelector({
  selectedMarker,
  onMarkerSelect,
}: {
  selectedMarker: string
  onMarkerSelect: (marker: string) => void
}) {
  const markers = [
    { type: "pin" as const, name: "Classic Pin", color: "#3B82F6", description: "Traditional location marker" },
    { type: "flag" as const, name: "Flag", color: "#EF4444", description: "Victory flag marker" },
    { type: "post" as const, name: "Post", color: "#10B981", description: "Signpost marker" },
    { type: "diamond" as const, name: "Diamond", color: "#8B5CF6", description: "Precious gem marker" },
    { type: "star" as const, name: "Star", color: "#F59E0B", description: "Favorite spot marker" },
  ]

  const handleMarkerClick = (markerType: string) => {
    console.log("Marker selection changed to:", markerType)
    onMarkerSelect(markerType)

    // Visual feedback
    const button = document.querySelector(`[data-marker="${markerType}"]`)
    if (button) {
      button.classList.add("animate-bounce")
      setTimeout(() => {
        button.classList.remove("animate-bounce")
      }, 600)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-6 border-2 border-gray-100 backdrop-blur-sm">
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-gray-800 mb-2">🎯 Choose Your Marker Style</h3>
        <p className="text-sm text-gray-600">Select how your spots appear on the map</p>
      </div>

      <div className="grid grid-cols-5 gap-4">
        {markers.map((marker) => (
          <button
            key={marker.type}
            data-marker={marker.type}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleMarkerClick(marker.type)
            }}
            className={`group relative p-4 rounded-xl border-3 transition-all duration-300 flex flex-col items-center gap-3 transform hover:scale-105 ${
              selectedMarker === marker.type
                ? "border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100 text-blue-800 scale-105 shadow-xl"
                : "border-gray-200 hover:border-gray-300 hover:bg-gradient-to-br hover:from-gray-50 hover:to-gray-100 hover:shadow-lg"
            }`}
            style={{
              boxShadow:
                selectedMarker === marker.type
                  ? "0 10px 25px rgba(59, 130, 246, 0.3), 0 0 0 1px rgba(59, 130, 246, 0.1) inset"
                  : undefined,
            }}
          >
            {/* Selection indicator */}
            {selectedMarker === marker.type && (
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">✓</span>
              </div>
            )}

            <MarkerIcon type={marker.type} color={marker.color} size={48} selected={selectedMarker === marker.type} />

            <div className="text-center">
              <span className="text-sm font-bold block">{marker.name}</span>
              <span className="text-xs text-gray-500 block mt-1">{marker.description}</span>
            </div>

            {/* Hover effect */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 transition-opacity duration-300 transform -skew-x-12"></div>
          </button>
        ))}
      </div>

      <div className="mt-6 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full text-sm text-gray-600">
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
          Currently selected: <span className="font-bold text-blue-600">{selectedMarker.toUpperCase()}</span>
        </div>
      </div>
    </div>
  )
}
