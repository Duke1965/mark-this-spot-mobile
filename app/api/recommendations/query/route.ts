import { NextResponse } from 'next/server'
import { FieldPath } from 'firebase-admin/firestore'
import { getAdminAuth, getAdminFirestore } from '@/lib/firebaseAdmin'
import { getCachedGooglePlaceById } from '@/lib/cache/placeCache'
import {
  genuineCommunityPhotoUrl,
  googlePlaceIdFromRecommendationFields,
} from '@/lib/recommendations/communityPhoto'

export const runtime = 'nodejs'

type StoredRecommendation = {
  kind: 'user' | 'ai'
  lat: number
  lng: number
  title: string
  description?: string
  category?: string
  rating?: number
  confidence?: number
  reason?: string
  createdAt?: any
  updatedAt?: any
  createdByUid?: string
  personalizedForUid?: string | null
  googlePlaceId?: string
  placeId?: string
  placeKey?: string
  mediaUrl?: string
  photoUrl?: string
  website?: string
  closedPermanently?: boolean
}

function num(v: string | null): number | null {
  if (!v) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

// ~500m buckets (matches existing client logic)
const BUCKET_DEG = 0.0045
const PERSONALIZED_AI_MAX_DISTANCE_M = 5000

function areaIndices(lat: number, lng: number): { iLat: number; iLng: number } {
  return {
    iLat: Math.round(lat / BUCKET_DEG),
    iLng: Math.round(lng / BUCKET_DEG)
  }
}

function areaKeyFromIndices(iLat: number, iLng: number): string {
  const roundedLat = iLat * BUCKET_DEG
  const roundedLng = iLng * BUCKET_DEG
  return `${roundedLat.toFixed(4)},${roundedLng.toFixed(4)}`
}

function neighborAreaKeys(lat: number, lng: number): string[] {
  const { iLat, iLng } = areaIndices(lat, lng)
  const keys: string[] = []
  for (let dLat = -1; dLat <= 1; dLat++) {
    for (let dLng = -1; dLng <= 1; dLng++) {
      keys.push(areaKeyFromIndices(iLat + dLat, iLng + dLng))
    }
  }
  return keys
}

async function getUidFromRequest(req: Request): Promise<string | null> {
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

function haversineDistanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371000
  const toRad = (x: number) => (x * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

function mapStoredRecommendation(docId: string, data: StoredRecommendation) {
  const googlePlaceId = googlePlaceIdFromRecommendationFields({
    googlePlaceId: data.googlePlaceId,
    placeId: data.placeId,
    placeKey: data.placeKey,
  })
  const mediaUrl =
    genuineCommunityPhotoUrl(data.mediaUrl) || genuineCommunityPhotoUrl(data.photoUrl)
  const extra: Record<string, unknown> = {}
  const placeKey = typeof data.placeKey === 'string' ? data.placeKey.trim() : ''
  if (placeKey) extra.placeKey = placeKey
  if (googlePlaceId) {
    extra.googlePlaceId = googlePlaceId
    extra.placeId = googlePlaceId
  }
  if (mediaUrl) {
    extra.mediaUrl = mediaUrl
    extra.photoUrl = mediaUrl
  }
  const website =
    typeof data.website === 'string' && data.website.trim().startsWith('http')
      ? data.website.trim()
      : ''
  if (website) extra.website = website

  return {
    id: docId,
    title: data.title,
    description: data.description || '',
    category: data.category || 'general',
    location: { lat: data.lat, lng: data.lng },
    rating: typeof data.rating === 'number' ? data.rating : 4.0,
    isAISuggestion: data.kind === 'ai',
    confidence:
      typeof data.confidence === 'number' ? data.confidence : data.kind === 'ai' ? 20 : 0,
    reason: data.reason || (data.kind === 'ai' ? 'AI suggestion' : 'Recommended by community'),
    timestamp: new Date(),
    ...((data.kind === 'user' || data.kind === 'ai') ? extra : {}),
  }
}

function acceptStoredRecommendation(input: {
  docId: string
  data: StoredRecommendation
  uid: string | null
  seen: Set<string>
  results: Array<any>
}): boolean {
  const { docId, data, uid, seen, results } = input
  if (!data || !data.kind) return false
  if (data.kind === 'ai') {
    const p = data.personalizedForUid ?? null
    if (p && (!uid || p !== uid)) return false
    if (data.closedPermanently === true) return false
  }
  if (seen.has(docId)) return false
  seen.add(docId)
  results.push(mapStoredRecommendation(docId, data))
  return true
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const lat = num(url.searchParams.get('lat'))
  const lng = num(url.searchParams.get('lng'))
  if (lat == null || lng == null) {
    return NextResponse.json({ ok: false, error: 'missing_lat_lng' }, { status: 400 })
  }

  const db = getAdminFirestore()
  if (!db) {
    return NextResponse.json({ ok: false, error: 'firestore_unavailable' }, { status: 500 })
  }

  const uid = await getUidFromRequest(req)
  const keys = neighborAreaKeys(lat, lng)

  const results: Array<any> = []
  const seen = new Set<string>()

  // Fetch each area bucket (small, bounded fan-out).
  for (const key of keys) {
    try {
      const itemsSnap = await db
        .collection('recommendation_areas')
        .doc(key)
        .collection('items')
        .orderBy(new FieldPath('updatedAt'), 'desc')
        .limit(60)
        .get()

      for (const doc of itemsSnap.docs) {
        const data = doc.data() as StoredRecommendation
        if (!data || !data.kind) continue

        if (data.kind === 'ai') {
          // Only include personalized AI for the current user (or global AI).
          const p = data.personalizedForUid ?? null
          if (p && (!uid || p !== uid)) continue
          if (data.closedPermanently === true) continue
        }

        const outId = doc.id
        if (seen.has(outId)) continue
        seen.add(outId)
        results.push(mapStoredRecommendation(outId, data))
      }
    } catch {
      // ignore a single bucket failure
    }
  }

  if (uid) {
    try {
      const personalizedSnap = await db
        .collectionGroup('items')
        .where('personalizedForUid', '==', uid)
        .get()

      for (const doc of personalizedSnap.docs) {
        const data = doc.data() as StoredRecommendation
        const recLat = Number(data?.lat)
        const recLng = Number(data?.lng)
        if (!Number.isFinite(recLat) || !Number.isFinite(recLng)) continue
        const distanceMeters = haversineDistanceMeters(
          { lat, lng },
          { lat: recLat, lng: recLng }
        )
        if (distanceMeters > PERSONALIZED_AI_MAX_DISTANCE_M) continue
        acceptStoredRecommendation({
          docId: doc.id,
          data,
          uid,
          seen,
          results,
        })
      }
    } catch (err) {
      console.error(
        '[recommendations/query] collectionGroup(items).where(personalizedForUid) failed',
        err
      )
    }
  }

  const placeIdsNeedingCachePhoto = Array.from(
    new Set(
      results
        .filter((row) => row && !row.photoUrl && !row.mediaUrl && row.googlePlaceId)
        .map((row) => String(row.googlePlaceId))
    )
  )
  if (placeIdsNeedingCachePhoto.length > 0) {
    const cachedPhotos = await Promise.all(
      placeIdsNeedingCachePhoto.map(async (placeId) => {
        const cached = await getCachedGooglePlaceById({ placeId })
        const urls = Array.isArray(cached?.place?.photoStorageUrls)
          ? cached.place.photoStorageUrls
          : []
        const photoUrl = urls.map((u) => genuineCommunityPhotoUrl(u)).find(Boolean)
        return { placeId, photoUrl }
      })
    )
    const byPlaceId = new Map(
      cachedPhotos
        .filter((row) => row.photoUrl)
        .map((row) => [row.placeId, row.photoUrl as string])
    )
    for (const row of results) {
      if (row.photoUrl || row.mediaUrl) continue
      const photoUrl = byPlaceId.get(String(row.googlePlaceId || ''))
      if (!photoUrl) continue
      row.photoUrl = photoUrl
      row.mediaUrl = photoUrl
    }
  }

  return NextResponse.json({
    ok: true,
    areaKeys: keys,
    personalized: !!uid,
    recommendations: results
  })
}
