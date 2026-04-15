import { NextResponse, type NextRequest } from "next/server"

export const runtime = "nodejs"

function isAllowedUrl(raw: string) {
  try {
    const u = new URL(raw)
    return u.protocol === "http:" || u.protocol === "https:"
  } catch {
    return false
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const url = String(searchParams.get("url") || "")
  if (!url || !isAllowedUrl(url)) {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 })
  }

  try {
    const resp = await fetch(url, {
      // Some hosts block requests without a UA.
      headers: {
        "User-Agent": "PINIT/1.0 (+image-proxy)",
        Accept: "image/*,*/*;q=0.8",
      },
      // Avoid caching surprises while testing.
      cache: "no-store",
    })

    if (!resp.ok) {
      return NextResponse.json({ error: "Upstream fetch failed", status: resp.status }, { status: 502 })
    }

    const contentType = resp.headers.get("content-type") || "application/octet-stream"
    if (!contentType.toLowerCase().startsWith("image/")) {
      return NextResponse.json({ error: "Upstream is not an image", contentType }, { status: 415 })
    }

    const bytes = await resp.arrayBuffer()
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: "Proxy failed", details: msg }, { status: 502 })
  }
}

