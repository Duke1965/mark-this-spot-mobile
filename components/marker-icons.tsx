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
        filter: "drop-shadow(0 0 12px rgba(59, 130, 246, 0.8)) drop-shadow(2px 4px 8px rgba(0,0,0,0.3))",
      }
    : shadowStyle

  switch (type) {
    case "pin":
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" style={glowStyle}>
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

          {/* Gradient Definitions */}
          <defs>
            <linearGradient id={`pinGradient-${color.replace("#", "")}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={color} />
              <stop offset="50%" stopColor={color} stopOpacity="0.8" />
              <stop offset="100%" stopColor={color} stopOpacity="0.6" />
            </linearGradient>
          </defs>
        </svg>
      )

    case "flag":
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" style={glowStyle}>
          {/* Flag Shadow */}
          <ellipse cx="17" cy="29" rx="2" ry="1" fill="rgba(0,0,0,0.2)" />

          {/* Flag Pole */}
          <rect x="15" y="6" width="2" height="22" fill="#8B5CF6" />
          <rect x="15" y="6" width="1" height="22" fill="rgba(255,255,255,0.3)" />

          {/* Flag Body */}
          <path
            d="M17 6 L28 6 L26 12 L28 18 L17 18 Z"
            fill={`url(#flagGradient-${color.replace("#", "")})`}
            stroke="rgba(0,0,0,0.1)"
            strokeWidth="0.5"
          />

          {/* Flag Highlight */}
          <path d="M17 6 L28 6 L26 9 L17 9 Z" fill="rgba(255,255,255,0.4)" />

          {/* Flag Wave Effect */}
          <path d="M26 12 Q27 11 26 10 Q27 13 26 12" fill="rgba(0,0,0,0.1)" />

          <defs>
            <linearGradient id={`flagGradient-${color.replace("#", "")}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={color} />
              <stop offset="100%" stopColor={color} stopOpacity="0.7" />
            </linearGradient>
          </defs>
        </svg>
      )

    case "post":
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" style={glowStyle}>
          {/* Post Shadow */}
          <ellipse cx="17" cy="29" rx="4" ry="1.5" fill="rgba(0,0,0,0.2)" />

          {/* Post Base */}
          <rect x="12" y="24" width="8" height="4" rx="1" fill="#6B7280" />
          <rect x="12" y="24" width="4" height="2" fill="rgba(255,255,255,0.2)" />

          {/* Post Pole */}
          <rect x="14" y="8" width="4" height="18" fill="#8B5CF6" />
          <rect x="14" y="8" width="2" height="18" fill="rgba(255,255,255,0.3)" />

          {/* Post Top */}
          <circle cx="16" cy="10" r="6" fill={`url(#postGradient-${color.replace("#", "")})`} />
          <circle cx="16" cy="10" r="4" fill={color} />
          <circle cx="14" cy="8" r="2" fill="rgba(255,255,255,0.5)" />

          <defs>
            <radialGradient id={`postGradient-${color.replace("#", "")}`}>
              <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
              <stop offset="100%" stopColor={color} />
            </radialGradient>
          </defs>
        </svg>
      )

    case "diamond":
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" style={glowStyle}>
          {/* Diamond Shadow */}
          <ellipse cx="17" cy="29" rx="3" ry="1.5" fill="rgba(0,0,0,0.2)" />

          {/* Diamond Body */}
          <path
            d="M16 4 L24 12 L16 26 L8 12 Z"
            fill={`url(#diamondGradient-${color.replace("#", "")})`}
            stroke="rgba(0,0,0,0.1)"
            strokeWidth="0.5"
          />

          {/* Diamond Facets */}
          <path d="M16 4 L20 8 L16 12 L12 8 Z" fill="rgba(255,255,255,0.6)" />
          <path d="M16 12 L20 8 L24 12 L16 20 Z" fill={color} opacity="0.8" />
          <path d="M16 12 L12 8 L8 12 L16 20 Z" fill={color} opacity="0.6" />
          <path d="M16 20 L24 12 L16 26 Z" fill={color} opacity="0.4" />
          <path d="M16 20 L8 12 L16 26 Z" fill={color} opacity="0.3" />

          {/* Diamond Sparkle */}
          <circle cx="14" cy="8" r="1" fill="rgba(255,255,255,0.9)" />
          <circle cx="18" cy="10" r="0.5" fill="rgba(255,255,255,0.7)" />

          <defs>
            <linearGradient id={`diamondGradient-${color.replace("#", "")}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.3)" />
              <stop offset="50%" stopColor={color} />
              <stop offset="100%" stopColor={color} stopOpacity="0.7" />
            </linearGradient>
          </defs>
        </svg>
      )

    case "star":
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" style={glowStyle}>
          {/* Star Shadow */}
          <ellipse cx="17" cy="29" rx="3" ry="1.5" fill="rgba(0,0,0,0.2)" />

          {/* Star Body */}
          <path
            d="M16 4 L19 13 L28 13 L21 18 L24 27 L16 22 L8 27 L11 18 L4 13 L13 13 Z"
            fill={`url(#starGradient-${color.replace("#", "")})`}
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

          <defs>
            <radialGradient id={`starGradient-${color.replace("#", "")}`}>
              <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
              <stop offset="70%" stopColor={color} />
              <stop offset="100%" stopColor={color} stopOpacity="0.8" />
            </radialGradient>
          </defs>
        </svg>
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
    { type: "pin" as const, name: "Classic Pin", color: "#3B82F6" },
    { type: "flag" as const, name: "Flag", color: "#EF4444" },
    { type: "post" as const, name: "Post", color: "#10B981" },
    { type: "diamond" as const, name: "Diamond", color: "#8B5CF6" },
    { type: "star" as const, name: "Star", color: "#F59E0B" },
  ]

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-200">
      <h3 className="font-semibold text-gray-800 mb-3">Choose Your Marker Style:</h3>
      <div className="grid grid-cols-5 gap-3">
        {markers.map((marker) => (
          <button
            key={marker.type}
            onClick={() => onMarkerSelect(marker.type)}
            className={`p-3 rounded-lg border-2 transition-all duration-200 flex flex-col items-center gap-2 ${
              selectedMarker === marker.type
                ? "border-blue-500 bg-blue-50 text-blue-800 scale-105"
                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50 hover:scale-102"
            }`}
          >
            <MarkerIcon type={marker.type} color={marker.color} size={40} selected={selectedMarker === marker.type} />
            <span className="text-xs font-medium">{marker.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
