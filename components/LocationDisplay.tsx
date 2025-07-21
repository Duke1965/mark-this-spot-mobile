"use client"

import { MapPin, Loader2 } from "lucide-react"
import type { LocationData } from "@/hooks/useLocationServices"

interface LocationDisplayProps {
  location: LocationData | null
  isLoading: boolean
}

export function LocationDisplay({ location, isLoading }: LocationDisplayProps) {
  return (
    <div className="flex items-center gap-2 text-white">
      {isLoading ? <Loader2 size={16} className="animate-spin" /> : <MapPin size={16} />}
      <span className="text-sm">{isLoading ? "Getting location..." : location?.name || "Location unavailable"}</span>
    </div>
  )
}
