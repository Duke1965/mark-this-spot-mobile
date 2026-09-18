const DRAFT_KEY = "pinit-postcard-draft-v1"
const ALLOWED_TEMPLATES = new Set(["template-1", "template-2", "template-3", "template-4"])
const DEFAULT_TEMPLATE = "template-1"

async function normalizeImageToJpegDataUrlFromBlob(blob: Blob) {
  const MAX_DIM = 1600
  const JPEG_QUALITY = 0.86
  const objectUrl = URL.createObjectURL(blob)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.decoding = "async"
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error("Failed to load image"))
      el.src = objectUrl
    })

    const w = img.naturalWidth || img.width || 0
    const h = img.naturalHeight || img.height || 0
    if (!w || !h) throw new Error("Invalid image dimensions")

    const scale = Math.min(1, MAX_DIM / Math.max(w, h))
    const outW = Math.max(1, Math.round(w * scale))
    const outH = Math.max(1, Math.round(h * scale))

    const canvas = document.createElement("canvas")
    canvas.width = outW
    canvas.height = outH
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("Canvas not available")
    ctx.drawImage(img, 0, 0, outW, outH)

    const outBlob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
    )
    if (!outBlob) return canvas.toDataURL("image/jpeg", JPEG_QUALITY)

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader()
      r.onload = () => resolve(typeof r.result === "string" ? r.result : "")
      r.onerror = () => reject(new Error("Failed to encode image"))
      r.readAsDataURL(outBlob)
    })
    if (!dataUrl) throw new Error("Failed to encode image")
    return dataUrl
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

function goToPostcardEditor(template: string) {
  window.location.assign(`/postcard/editor?template=${encodeURIComponent(template)}`)
}

/**
 * Pin-equivalent postcard bootstrap from an already-hosted photo URL.
 * Does not set fromPinId (Recommendation ids are not Library pin ids).
 */
export async function bootstrapPostcardDraftFromPhoto(input: {
  photoUrl: string
  title: string
  description: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const photoUrl = String(input.photoUrl || "").trim()
  if (!photoUrl) {
    return {
      ok: false,
      error:
        "This recommendation doesn’t have a photo yet, so a postcard can’t be created. You can still copy the Google Maps link.",
    }
  }

  const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(photoUrl)}`
  const resp = await fetch(proxyUrl, { cache: "no-store" })
  if (!resp.ok) {
    return {
      ok: false,
      error: "We couldn’t load that photo for a postcard. You can still copy the Google Maps link.",
    }
  }
  const blob = await resp.blob()
  let normalized: string
  try {
    normalized = await normalizeImageToJpegDataUrlFromBlob(blob)
  } catch {
    return {
      ok: false,
      error: "We couldn’t use this photo as a postcard. You can still copy the Google Maps link.",
    }
  }

  try {
    const existingRaw = sessionStorage.getItem(DRAFT_KEY)
    if (existingRaw) {
      const existing = JSON.parse(existingRaw) as {
        imageUrl?: string
        noPhoto?: boolean
        template?: string
      }
      const hasImage = typeof existing?.imageUrl === "string" && existing.imageUrl.length > 20
      const hasNoPhoto = !!existing?.noPhoto
      const existingTemplate =
        typeof existing?.template === "string" ? existing.template.trim() : ""
      const hasTemplate = ALLOWED_TEMPLATES.has(existingTemplate)
      if ((hasImage || hasNoPhoto) && hasTemplate) {
        const replace = window.confirm(
          "You already have an in-progress postcard draft. Replace it with this postcard?"
        )
        if (!replace) {
          goToPostcardEditor(existingTemplate)
          return { ok: true }
        }
      }
    }
  } catch {
    // ignore unreadable draft and continue
  }

  const title = String(input.title || "").trim() || "Saved Place"
  const description =
    String(input.description || "").trim() || "A spot worth remembering."

  try {
    sessionStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        template: DEFAULT_TEMPLATE,
        imageUrl: normalized,
        title,
        description,
        message: "",
      })
    )
  } catch {
    return {
      ok: false,
      error: "We couldn’t start a postcard from this photo. You can still copy the Google Maps link.",
    }
  }

  goToPostcardEditor(DEFAULT_TEMPLATE)
  return { ok: true }
}
