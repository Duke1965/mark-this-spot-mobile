import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("📤 Received Web Share Target POST request")

    // Get form data from the Web Share Target
    const formData = await request.formData()

    const title = (formData.get("title") as string) || ""
    const text = (formData.get("text") as string) || ""
    const url = (formData.get("url") as string) || ""

    console.log("📊 Share data received:", { title, text, url })

    // Validate that we have some data
    if (!title && !text && !url) {
      console.error("❌ No share data received")
      return NextResponse.redirect(new URL("/shared-place/view?error=no_data", request.url))
    }

    // Validate that this looks like a Google Maps URL
    if (url && !url.includes("google.com") && !url.includes("maps.app.goo.gl")) {
      console.error("❌ Invalid URL format:", url)
      return NextResponse.redirect(new URL("/shared-place/view?error=invalid_url", request.url))
    }

    // Create query parameters for the view page
    const params = new URLSearchParams()
    if (title) params.set("title", title)
    if (text) params.set("text", text)
    if (url) params.set("url", url)

    console.log("✅ Redirecting to view page with params")

    // Redirect to the view page with the extracted data
    return NextResponse.redirect(new URL(`/shared-place/view?${params.toString()}`, request.url))
  } catch (error) {
    console.error("❌ Error processing share data:", error)
    return NextResponse.redirect(new URL("/shared-place/view?error=processing_failed", request.url))
  }
}

export async function GET(request: NextRequest) {
  // Handle direct GET requests (fallback)
  console.log("📥 Received GET request to shared-place route")

  const { searchParams } = new URL(request.url)
  const title = searchParams.get("title") || ""
  const text = searchParams.get("text") || ""
  const url = searchParams.get("url") || ""

  if (!title && !text && !url) {
    return NextResponse.redirect(new URL("/shared-place/view?error=no_data", request.url))
  }

  // Redirect to view page with the same params
  return NextResponse.redirect(new URL(`/shared-place/view?${searchParams.toString()}`, request.url))
}
