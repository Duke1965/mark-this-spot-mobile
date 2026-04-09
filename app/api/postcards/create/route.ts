import { NextResponse, type NextRequest } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { getAdminFirestore } from "@/lib/firebaseAdmin"

type StickerItem = {
  id: string
  name: string
  imageUrl: string
  x: number
  y: number
  scale: number
  rotation: number
}

type CreatePostcardPayload = {
  template: string
  imageUrl: string
  message: string
  stickers: StickerItem[]
  title: string
  description: string
  transform?: { tx?: number; ty?: number; scale?: number; rotation?: number }
}

function asNumber(n: unknown, def: number) {
  const x = Number(n)
  return Number.isFinite(x) ? x : def
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<CreatePostcardPayload>

    const template = String(body.template || "template-1")
    const imageUrl = String(body.imageUrl || "")
    const message = String(body.message || "")
    const title = String(body.title || "My Special Place")
    const description = String(body.description || "A memorable place worth sharing.")

    const stickers: StickerItem[] = Array.isArray(body.stickers)
      ? body.stickers
          .filter((s) => s && typeof s === "object")
          .map((s: any) => ({
            id: String(s.id || ""),
            name: String(s.name || "Sticker"),
            imageUrl: String(s.imageUrl || ""),
            x: asNumber(s.x, 50),
            y: asNumber(s.y, 50),
            scale: asNumber(s.scale, 1),
            rotation: asNumber(s.rotation, 0),
          }))
          .filter((s) => !!s.id && !!s.imageUrl)
      : []

    if (!imageUrl) {
      return NextResponse.json({ error: "Missing imageUrl" }, { status: 400 })
    }

    const firestore = getAdminFirestore()
    const nowIso = new Date().toISOString()

    if (!firestore) {
      return NextResponse.json(
        { error: "Sharing not configured", details: "Firebase Admin / Firestore is not configured in this environment." },
        { status: 500 }
      )
    }

    const docRef = await firestore.collection("postcards").add({
      template,
      imageUrl,
      message,
      stickers,
      title,
      description,
      transform: body.transform || null,
      createdAt: FieldValue.serverTimestamp(),
      createdAtIso: nowIso,
    })

    return NextResponse.json({ postcardId: docRef.id }, { status: 200 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: "Failed to create postcard", details: msg }, { status: 500 })
  }
}

