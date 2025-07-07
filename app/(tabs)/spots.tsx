"use client"

import { useState, useEffect } from "react"
import { View, Text, ScrollView, TouchableOpacity } from "react-native"
import { MapPin, Calendar, Navigation } from "lucide-react-native"
import { getAllSpots } from "../utils/storage"

interface Spot {
  id: string
  latitude: number
  longitude: number
  timestamp: string
  address: string
  notes: string
}

export default function SpotsScreen() {
  const [spots, setSpots] = useState<Spot[]>([])

  useEffect(() => {
    loadSpots()
  }, [])

  const loadSpots = async () => {
    const savedSpots = await getAllSpots()
    setSpots(savedSpots.reverse()) // Show newest first
  }

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (spots.length === 0) {
    return (
      <View className="flex-1 bg-white justify-center items-center px-8">
        <MapPin size={64} color="#D1D5DB" />
        <Text className="text-xl font-semibold text-gray-800 mt-4 text-center">No spots marked yet</Text>
        <Text className="text-gray-500 mt-2 text-center leading-relaxed">
          Go back to the main screen and start marking interesting places you discover!
        </Text>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-white">
      <View className="px-6 pt-12 pb-4">
        <Text className="text-2xl font-bold text-gray-800">Your Spots</Text>
        <Text className="text-gray-600 mt-1">
          {spots.length} {spots.length === 1 ? "location" : "locations"} saved
        </Text>
      </View>

      <ScrollView className="flex-1 px-6">
        {spots.map((spot) => (
          <TouchableOpacity key={spot.id} className="bg-white border border-gray-200 rounded-xl p-4 mb-3 shadow-sm">
            <View className="flex-row items-start justify-between">
              <View className="flex-1">
                <View className="flex-row items-center mb-2">
                  <MapPin size={16} color="#3B82F6" />
                  <Text className="text-gray-800 font-semibold ml-2 flex-1">{spot.address}</Text>
                </View>

                <View className="flex-row items-center mb-2">
                  <Calendar size={14} color="#6B7280" />
                  <Text className="text-gray-500 text-sm ml-2">{formatDate(spot.timestamp)}</Text>
                </View>

                <Text className="text-xs text-gray-400">
                  {spot.latitude.toFixed(6)}, {spot.longitude.toFixed(6)}
                </Text>
              </View>

              <TouchableOpacity className="ml-4 p-2">
                <Navigation size={20} color="#3B82F6" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  )
}
