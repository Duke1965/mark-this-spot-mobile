"use client"

import { useState } from "react"
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from "react-native"
import { MapPin, List, Settings } from "lucide-react-native"
import { useLocationServices } from "../hooks/useLocationServices"
import { saveSpot } from "../utils/storage"

export default function CaptureScreen() {
  const { getCurrentLocation, isLoading } = useLocationServices()
  const [isCapturing, setIsCapturing] = useState(false)
  const [spotsCount, setSpotsCount] = useState(0)

  const handleMarkSpot = async () => {
    setIsCapturing(true)
    try {
      const location = await getCurrentLocation()
      if (location) {
        const spot = {
          id: Date.now().toString(),
          latitude: location.latitude,
          longitude: location.longitude,
          timestamp: new Date().toISOString(),
          address: "Loading address...",
          notes: "",
        }

        await saveSpot(spot)
        setSpotsCount((prev) => prev + 1)

        // Haptic feedback simulation
        Alert.alert("Spot Marked! 📍", "Location saved successfully. Check your spots to explore later.", [
          { text: "Got it!", style: "default" },
        ])
      }
    } catch (error) {
      Alert.alert("Oops!", "Couldn't capture location. Please try again.")
    } finally {
      setIsCapturing(false)
    }
  }

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row justify-between items-center px-6 pt-12 pb-4">
        <Text className="text-2xl font-bold text-gray-800">Mark This Spot</Text>
        <View className="flex-row space-x-4">
          <TouchableOpacity className="p-2">
            <List size={24} color="#6B7280" />
          </TouchableOpacity>
          <TouchableOpacity className="p-2">
            <Settings size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats */}
      <View className="px-6 pb-8">
        <Text className="text-gray-600">
          {spotsCount} {spotsCount === 1 ? "spot" : "spots"} marked
        </Text>
      </View>

      {/* Main Capture Button */}
      <View className="flex-1 justify-center items-center px-8">
        <TouchableOpacity
          onPress={handleMarkSpot}
          disabled={isCapturing || isLoading}
          className={`w-64 h-64 rounded-full justify-center items-center shadow-lg ${
            isCapturing || isLoading ? "bg-gray-400" : "bg-blue-500 active:bg-blue-600"
          }`}
          style={{
            shadowColor: "#3B82F6",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.3,
            shadowRadius: 16,
            elevation: 12,
          }}
        >
          {isCapturing ? (
            <View className="items-center">
              <ActivityIndicator size="large" color="white" />
              <Text className="text-white font-semibold mt-4 text-lg">Marking...</Text>
            </View>
          ) : (
            <View className="items-center">
              <MapPin size={48} color="white" />
              <Text className="text-white font-bold mt-4 text-xl">MARK SPOT</Text>
              <Text className="text-white/80 mt-2 text-center text-sm px-4">Tap to save this location</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Bottom Instructions */}
      <View className="px-8 pb-12">
        <Text className="text-center text-gray-500 text-sm leading-relaxed">
          Just like Shazam for music, but for places!
          {"\n"}Tap the button to instantly save interesting spots you pass by.
        </Text>
      </View>
    </View>
  )
}
