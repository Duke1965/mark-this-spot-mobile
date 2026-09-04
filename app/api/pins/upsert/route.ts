import { NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { getAdminAuth, getAdminFirestore } from '@/lib/firebaseAdmin'

export const runtime = 'nodejs'

async function getUidFromRequest(req: Request): Promise<string | null> {
  const auth = getAdminAuth()
  if (!auth) return null
  const header = req.headers.get('authorization') || ''
  const token = header.replace(/^Bearer\\s+/i, '').trim()
  if (!token) return null
  try {
    const decoded = await auth.verifyIdToken(token)
    return decoded.uid || null
  } catch {
    return null
  }
}

function stripUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  const out: any = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue
    out[k] = v
  }
  return out
}

function sanitizePin(pin: any) {
  // Prevent accidentally storing giant data URLs in Firestore.
  const mediaUrl =
    typeof pin?.mediaUrl === 'string' && pin.mediaUrl.startsWith('data:')
      ? null
      : pin?.mediaUrl ?? null

  return stripUndefined({
    id: String(pin.id || ''),
    latitude: Number(pin.latitude),
    longitude: Number(pin.longitude),
    locationName: String(pin.locationName || ''),
    mediaUrl,
    mediaType: pin.mediaType ?? null,
    audioUrl: pin.audioUrl ?? null,
    timestamp: String(pin.timestamp || new Date().toISOString()),
    title: String(pin.title || ''),
    description: typeof pin.description === 'string' ? pin.description : undefined,
    tags: Array.isArray(pin.tags) ? pin.tags : undefined,
    isRecommended: !!pin.isRecommended,
    googlePlaceId: typeof pin.googlePlaceId === 'string' ? pin.googlePlaceId : undefined,
    rating: typeof pin.rating === 'number' ? pin.rating : undefined,
    priceLevel: typeof pin.priceLevel === 'number' ? pin.priceLevel : undefined,
    types: Array.isArray(pin.types) ? pin.types : undefined,
    isAISuggestion: !!pin.isAISuggestion,
    additionalPhotos: Array.isArray(pin.additionalPhotos) ? pin.additionalPhotos : undefined,
    personalThoughts: typeof pin.personalThoughts === 'string' ? pin.personalThoughts : undefined,
    originalPinId: typeof pin.originalPinId === 'string' ? pin.originalPinId : undefined,
    placeId: typeof pin.placeId === 'string' ? pin.placeId : undefined,
    totalEndorsements: typeof pin.totalEndorsements === 'number' ? pin.totalEndorsements : undefined,
    recentEndorsements: typeof pin.recentEndorsements === 'number' ? pin.recentEndorsements : undefined,
    lastEndorsedAt: typeof pin.lastEndorsedAt === 'string' ? pin.lastEndorsedAt : undefined,
    score: typeof pin.score === 'number' ? pin.score : undefined,
    downvotes: typeof pin.downvotes === 'number' ? pin.downvotes : undefined,
    isHidden: typeof pin.isHidden === 'boolean' ? pin.isHidden : undefined,
    category: typeof pin.category === 'string' ? pin.category : undefined,
    stickers: Array.isArray(pin.stickers) ? pin.stickers : undefined,
    platform: typeof pin.platform === 'string' ? pin.platform : undefined,
    isPending: typeof pin.isPending === 'boolean' ? pin.isPending : undefined,
    isViewed: typeof pin.isViewed === 'boolean' ? pin.isViewed : undefined,
    aiConfidence: typeof pin.aiConfidence === 'string' ? pin.aiConfidence : undefined,
    aiUsedFallback: typeof pin.aiUsedFallback === 'boolean' ? pin.aiUsedFallback : undefined,
    aiGeneratedAt: typeof pin.aiGeneratedAt === 'string' ? pin.aiGeneratedAt : undefined
  })
}

export async function POST(req: Request) {
  const uid = await getUidFromRequest(req)
  if (!uid) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

  const db = getAdminFirestore()
  if (!db) return NextResponse.json({ ok: false, error: 'firestore_unavailable' }, { status: 500 })

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  const pin = body?.pin
  if (!pin || !pin.id) return NextResponse.json({ ok: false, error: 'missing_pin' }, { status: 400 })

  const clean = sanitizePin(pin)
  if (!clean.id || !Number.isFinite(clean.latitude) || !Number.isFinite(clean.longitude)) {
    return NextResponse.json({ ok: false, error: 'invalid_pin' }, { status: 400 })
  }

  try {
    await db
      .collection('users')
      .doc(uid)
      .collection('pins')
      .doc(clean.id)
      .set(
        {
          ...clean,
          updatedAt: FieldValue.serverTimestamp(),
          createdAt: FieldValue.serverTimestamp()
        },
        { merge: true }
      )

    return NextResponse.json({ ok: true, id: clean.id })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: 'write_failed', message: String(e?.message || e) },
      { status: 500 }
    )
  }
}

