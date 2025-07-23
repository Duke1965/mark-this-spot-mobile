import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const title = formData.get("title") as string
    const text = formData.get("text") as string
    const url = formData.get("url") as string

    console.log("📍 Web Share Target received:", { title, text, url })

    // Extract place information from the shared data
    const placeName = title || "Shared Place"
    const placeUrl = url || ""
    const coordinates = { lat: 0, lng: 0 }

    // Try to extract coordinates from Google Maps URL
    if (url && url.includes("google.com/maps")) {
      const coordMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
      if (coordMatch) {
        coordinates.lat = Number.parseFloat(coordMatch[1])
        coordinates.lng = Number.parseFloat(coordMatch[2])
      }
    }

    // Create a new pin entry (you might want to save this to a database)
    const sharedPlace = {
      id: Date.now().toString(),
      title: placeName,
      description: text || "Shared from Google Maps",
      coordinates,
      url: placeUrl,
      timestamp: Date.now(),
      tags: ["shared", "maps"],
    }

    // Redirect to the view page with the place data
    const viewUrl = new URL("/shared-place/view", request.url)
    viewUrl.searchParams.set("title", placeName)
    viewUrl.searchParams.set("description", text || "Shared from Google Maps")
    viewUrl.searchParams.set("url", placeUrl)
    viewUrl.searchParams.set("lat", coordinates.lat.toString())
    viewUrl.searchParams.set("lng", coordinates.lng.toString())

    return NextResponse.redirect(viewUrl)
  } catch (error) {
    console.error("❌ Error processing shared place:", error)

    // Fallback redirect to main app
    const fallbackUrl = new URL("/", request.url)
    fallbackUrl.searchParams.set("error", "share-failed")
    return NextResponse.redirect(fallbackUrl)
  }
}

export async function GET(request: NextRequest) {
  // Handle direct access to the route
  const url = new URL("/shared-place/view", request.url)
  url.searchParams.set("title", "Direct Access")
  url.searchParams.set("description", "This page is for handling shared places from other apps")

  return NextResponse.redirect(url)
}
