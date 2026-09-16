import { NextResponse } from "next/server"
import { resolveGooglePlacePhoto } from "@/lib/google/resolveGooglePlacePhoto"
import { genuineCommunityPhotoUrl } from "@/lib/recommendations/communityPhoto"

export const runtime = "nodejs"

function num(v: string | null): number | undefined {
  if (!v) return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const placeId = String(url.searchParams.get("placeId") || "").trim()
  if (!placeId) {
    return NextResponse.json({ ok: false, error: "missing_placeId" }, { status: 400 })
  }

  try {
    const resolved = await resolveGooglePlacePhoto({
      placeId,
      lat: num(url.searchParams.get("lat")),
      lng: num(url.searchParams.get("lng")),
    })
    const photoUrl = genuineCommunityPhotoUrl(resolved.photoUrl)
    return NextResponse.json({
      ok: true,
      placeId,
      photoUrl: photoUrl || null,
      source: resolved.source,
    })
  } catch {
    return NextResponse.json({
      ok: true,
      placeId,
      photoUrl: null,
      source: "none",
    })
  }
}
