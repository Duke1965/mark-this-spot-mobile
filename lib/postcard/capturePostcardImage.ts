const JPEG_QUALITY = 0.86
const PIXEL_RATIO = 2

async function waitForFonts(): Promise<void> {
  try {
    if (typeof document === "undefined") return
    const fonts = document.fonts
    if (!fonts?.ready) return
    await fonts.ready
  } catch {
    // Font waiting is best-effort; capture may still succeed.
  }
}

/**
 * Capture the already-rendered Preview postcard DOM as a JPEG data URL.
 * Returns null on any failure so Create Postcard can continue without it.
 */
export async function capturePostcardJpegDataUrl(node: HTMLElement | null): Promise<string | null> {
  if (!node) return null
  try {
    await waitForFonts()
    const { toJpeg } = await import("html-to-image")
    const dataUrl = await toJpeg(node, {
      quality: JPEG_QUALITY,
      pixelRatio: PIXEL_RATIO,
      cacheBust: true,
      backgroundColor: "#ffffff",
    })
    if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/jpeg")) return null
    return dataUrl
  } catch (e) {
    console.error("Postcard social preview capture failed", e)
    return null
  }
}
