import { NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import crypto from 'crypto'
import { getAdminAuth, getAdminFirestore } from '@/lib/firebaseAdmin'
import {
  genuineCommunityPhotoUrl,
  googlePlaceIdFromRecommendationFields,
} from '@/lib/recommendations/communityPhoto'

export const runtime = 'nodejs'

type AIRecPayload = {
  id?: string
  title: string
  description?: string
  category?: string
  location: { lat: number; lng: number }
  rating?: number
  confidence?: number
  reason?: string
  googlePlaceId?: string
  placeId?: string
  mediaUrl?: string | null
  photoUrl?: string | null
  website?: string | null
  closedPermanently?: boolean
}

const BUCKET_DEG = 0.0045

function areaKey(lat: number, lng: number): string {
  const iLat = Math.round(lat / BUCKET_DEG)
  const iLng = Math.round(lng / BUCKET_DEG)
  return `${(iLat * BUCKET_DEG).toFixed(4)},${(iLng * BUCKET_DEG).toFixed(4)}`
}

function safeId(raw: string): string {
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
  if (!uid) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

  const db = getAdminFirestore()
  if (!db) return NextResponse.json({ ok: false, error: 'firestore_unavailable' }, { status: 500 })

  let body: any = null
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  const items: AIRecPayload[] = Array.isArray(body?.items) ? body.items : []
  if (items.length === 0) {
    return NextResponse.json({ ok: true, written: 0 })
  }

  // Write at most 10 at a time (keeps Firestore costs bounded).
  const slice = items.slice(0, 10)

  let written = 0
  for (const it of slice) {
    const lat = it?.location?.lat
    const lng = it?.location?.lng
    if (typeof lat !== 'number' || typeof lng !== 'number') continue
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue

    const key = areaKey(lat, lng)
    const title = (it.title || '').toString().slice(0, 120)
    if (!title) continue

    const desc = (it.description || '').toString().slice(0, 400)
    const category = (it.category || 'general').toString().slice(0, 64)
    const identityKey = `coord:${lat.toFixed(6)},${lng.toFixed(6)}|t:${title.toLowerCase()}`
    const docId = `a_${uid}_${safeId(identityKey)}`
    const googlePlaceId = googlePlaceIdFromRecommendationFields({
      googlePlaceId: it.googlePlaceId,
      placeId: it.placeId,
    })
    const mediaUrl =
      genuineCommunityPhotoUrl(it.mediaUrl) || genuineCommunityPhotoUrl(it.photoUrl)
    const website =
      typeof it.website === 'string' && it.website.trim().startsWith('http')
        ? it.website.trim().slice(0, 500)
        : undefined
    const closedPermanently = it.closedPermanently === true
    const placeKey = googlePlaceId ? `place:${googlePlaceId}` : identityKey

    await db.collection('recommendation_areas').doc(key).set(
      { key, updatedAt: FieldValue.serverTimestamp() },
      { merge: true }
    )

    const payload: Record<string, unknown> = {
      kind: 'ai',
      lat,
      lng,
      title,
      description: desc,
      category,
      rating: typeof it.rating === 'number' ? it.rating : 4.0,
      confidence: typeof it.confidence === 'number' ? it.confidence : 20,
      reason: (it.reason || 'AI suggestion').toString().slice(0, 140),
      createdByUid: uid,
      personalizedForUid: uid,
      placeKey,
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp()
    }
    if (googlePlaceId) {
      payload.googlePlaceId = googlePlaceId
      payload.placeId = googlePlaceId
    }
    if (mediaUrl) {
      payload.mediaUrl = mediaUrl
      payload.photoUrl = mediaUrl
    }
    if (website) payload.website = website
    if (closedPermanently) payload.closedPermanently = true

    await db
      .collection('recommendation_areas')
      .doc(key)
      .collection('items')
      .doc(docId)
      .set(payload, { merge: true })

    written++
  }

  return NextResponse.json({ ok: true, written })
}

