import { NextResponse } from "next/server"
import { resolveAiGoogleIdentity } from "@/lib/recommendations/resolveAiGoogleIdentity"

export const runtime = "nodejs"

function num(v: string | null): number | undefined {
  if (!v) return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const title = String(url.searchParams.get("title") || "").trim()
  const lat = num(url.searchParams.get("lat"))
  const lng = num(url.searchParams.get("lng"))
  if (!title || lat == null || lng == null) {
    return NextResponse.json({ ok: false, error: "missing_title_or_coords" }, { status: 400 })
  }

  try {
    const resolved = await resolveAiGoogleIdentity({
      title,
      lat,
      lng,
      placeId: String(url.searchParams.get("placeId") || "").trim() || undefined,
      website: String(url.searchParams.get("website") || "").trim() || undefined,
      currentDescription: url.searchParams.get("description") ?? undefined,
    })
    if (!resolved.ok) {
      return NextResponse.json({
        ok: false,
        closedPermanently: !!resolved.closedPermanently,
        reason: resolved.reason,
        placeId: resolved.placeId || null,
      })
    }
    return NextResponse.json({
      ok: true,
      placeId: resolved.placeId,
      photoUrl: resolved.photoUrl,
      website: resolved.website || null,
      description: resolved.description || null,
      source: resolved.source,
    })
  } catch {
    return NextResponse.json({
      ok: false,
      reason: "error",
      closedPermanently: false,
    })
  }
}
