import { cache } from "react"
import { getAdminFirestore } from "@/lib/firebaseAdmin"

export type SharedPostcardRecord = {
  postcardId: string
  template: string
  imageUrl: string | null
  composedImageUrl: string | null
  latitude: number | null
  longitude: number | null
  locationName: string | null
  message: string
  title: string
  description: string
  stickers: unknown[]
  transform: { tx?: number; ty?: number; scale?: number; rotation?: number }
}

export type SharedPostcardLoadResult =
  | { status: "ok"; record: SharedPostcardRecord }
  | { status: "not-configured" }
  | { status: "not-found" }

function asOptionalHttpsUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null
  const s = raw.trim()
  if (!s) return null
  if (!/^https?:\/\//i.test(s)) return null
  return s
}

export const loadSharedPostcard = cache(async (postcardId: string): Promise<SharedPostcardLoadResult> => {
  const firestore = getAdminFirestore()
  if (!firestore) return { status: "not-configured" }

  const doc = await firestore.collection("postcards").doc(postcardId).get()
  if (!doc.exists) return { status: "not-found" }

  const data = doc.data() as any
  const lat = Number(data?.latitude)
  const lng = Number(data?.longitude)
  const locationName =
    typeof data?.locationName === "string" && String(data.locationName).trim()
      ? String(data.locationName).trim()
      : null

  return {
    status: "ok",
    record: {
      postcardId,
      template: String(data?.template || "template-1"),
      imageUrl: asOptionalHttpsUrl(data?.imageUrl),
      composedImageUrl: asOptionalHttpsUrl(data?.composedImageUrl),
      latitude: Number.isFinite(lat) ? lat : null,
      longitude: Number.isFinite(lng) ? lng : null,
      locationName,
      message: String(data?.message || ""),
      title: String(data?.title || "My Special Place"),
      description: typeof data?.description === "string" ? String(data.description) : "",
      stickers: Array.isArray(data?.stickers) ? data.stickers : [],
      transform: data?.transform || {},
    },
  }
})
