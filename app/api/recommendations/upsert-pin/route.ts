import { NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import crypto from 'crypto'
import { getAdminAuth, getAdminFirestore } from '@/lib/firebaseAdmin'

export const runtime = 'nodejs'

type PinPayload = {
  id?: string
  latitude: number
  longitude: number
  title?: string
  locationName?: string
  description?: string
  category?: string
  rating?: number
  mediaUrl?: string | null
  googlePlaceId?: string
  placeId?: string
  types?: string[]
}

const BUCKET_DEG = 0.0045

function areaKey(lat: number, lng: number): string {
  const iLat = Math.round(lat / BUCKET_DEG)
  const iLng = Math.round(lng / BUCKET_DEG)
  return `${(iLat * BUCKET_DEG).toFixed(4)},${(iLng * BUCKET_DEG).toFixed(4)}`
}

function stablePlaceKey(pin: PinPayload): string {
  const place = pin.googlePlaceId || pin.placeId
  if (place) return `place:${place}`
  const title = (pin.title || pin.locationName || '').trim().toLowerCase()
  return `coord:${pin.latitude.toFixed(6)},${pin.longitude.toFixed(6)}|t:${title}`
}

function safeId(parts: string[]): string {
  const raw = parts.join('|')
  const hash = crypto.createHash('sha256').update(raw).digest('base64url')
  return hash.slice(0, 28)
}

async function requireUid(req: Request): Promise<string | null> {
  const auth = getAdminAuth()
  if (!auth) return null
  const header = req.headers.get('authorization') || ''
  const token = header.replace(/^Bearer\s+/i, '').trim()
  if (!token) return null
  try {
    const decoded = await auth.verifyIdToken(token)
    return decoded.uid || null
  } catch {
    return null
  }
}

export async function POST(req: Request) {
  const uid = await requireUid(req)
  if (!uid) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const db = getAdminFirestore()
  if (!db) {
    return NextResponse.json({ ok: false, error: 'firestore_unavailable' }, { status: 500 })
  }

  let body: any = null
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  const pin: PinPayload | undefined = body?.pin
  if (!pin || typeof pin.latitude !== 'number' || typeof pin.longitude !== 'number') {
    return NextResponse.json({ ok: false, error: 'missing_pin' }, { status: 400 })
  }

  const lat = pin.latitude
  const lng = pin.longitude
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ ok: false, error: 'invalid_coords' }, { status: 400 })
  }

  const key = areaKey(lat, lng)
  const placeKey = stablePlaceKey(pin)
  const docId = `u_${uid}_${safeId([placeKey])}`

  const title = (pin.title || pin.locationName || 'Pinned place').toString().slice(0, 120)
  const description = (pin.description || '').toString().slice(0, 400)
  const category = (pin.category || (Array.isArray(pin.types) ? pin.types[0] : '') || 'general')
    .toString()
    .slice(0, 64)

  try {
    await db.collection('recommendation_areas').doc(key).set(
      {
        key,
        updatedAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    )

    await db
      .collection('recommendation_areas')
      .doc(key)
      .collection('items')
      .doc(docId)
      .set(
        {
          kind: 'user',
          lat,
          lng,
          title,
          description,
          category,
          rating: typeof pin.rating === 'number' ? pin.rating : 4.0,
          reason: 'Recommended by community',
          createdByUid: uid,
          personalizedForUid: null,
          placeKey,
          updatedAt: FieldValue.serverTimestamp(),
          createdAt: FieldValue.serverTimestamp()
        },
        { merge: true }
      )

    return NextResponse.json({ ok: true, areaKey: key, id: docId })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: 'write_failed', message: String(e?.message || e) }, { status: 500 })
  }
}

