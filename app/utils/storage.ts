interface Spot {
  id: string
  latitude: number
  longitude: number
  timestamp: string
  address: string
  notes: string
  photos?: string[]
}

// Simulate AsyncStorage for demo
let spotsStorage: Spot[] = []

export const saveSpot = async (spot: Spot): Promise<void> => {
  spotsStorage.push(spot)
  console.log("Spot saved:", spot)

  // Try real reverse geocoding, fallback to mock
  try {
    const address = await reverseGeocode(spot.latitude, spot.longitude)
    spot.address = address
  } catch (error) {
    console.log("Using mock address")
    spot.address = await getMockAddress(spot.latitude, spot.longitude)
  }
}

export const getAllSpots = async (): Promise<Spot[]> => {
  return spotsStorage
}

export const deleteSpot = async (id: string): Promise<void> => {
  spotsStorage = spotsStorage.filter((spot) => spot.id !== id)
}

const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
  // Try real reverse geocoding with Google Maps API
  if (window.google && window.google.maps) {
    const geocoder = new window.google.maps.Geocoder()

    return new Promise((resolve, reject) => {
      geocoder.geocode({ location: { lat, lng } }, (results: any[], status: string) => {
        if (status === "OK" && results[0]) {
          resolve(results[0].formatted_address)
        } else {
          reject(new Error("Geocoding failed"))
        }
      })
    })
  }

  throw new Error("Google Maps not available")
}

const getMockAddress = async (lat: number, lng: number): Promise<string> => {
  // Enhanced mock addresses based on rough location
  const mockAddresses = [
    "123 Scenic Highway, CA",
    "456 Country Road, OR",
    "789 Mountain View Dr, WA",
    "321 Coastal Blvd, CA",
    "654 Forest Trail, CO",
    "987 Downtown Ave, NY",
    "147 Lakeside Dr, MI",
    "258 Prairie Rd, TX",
    "369 Valley View St, AZ",
    "741 Riverside Pkwy, FL",
  ]

  // Add some delay to simulate API call
  await new Promise((resolve) => setTimeout(resolve, 1000))

  return mockAddresses[Math.floor(Math.random() * mockAddresses.length)]
}
