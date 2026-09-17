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

const CAFE_FELIX_DIAG_LAT = -33.3833536
const CAFE_FELIX_DIAG_LNG = 18.8912034

function normalizeTraceTitle(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tracePlaceFromTitle(title: string | undefined): 'cafe-felix' | 'marras-wines' | null {
  const n = normalizeTraceTitle(title || '')
  if (n.includes('cafe felix')) return 'cafe-felix'
  if (n.includes('marras wines') || n === 'marras') return 'marras-wines'
  return null
}

function areaKey(lat: number, lng: number): string {
  const { iLat, iLng } = areaIndices(lat, lng)
  return areaKeyFromIndices(iLat, iLng)
}

const PERSONALIZED_AI_MAX_DISTANCE_M = 5000

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

function diagnosticGateDecision(
  data: StoredRecommendation | undefined,
  uid: string | null,
  alreadySeen: boolean
): { accepted: boolean; rejectionReason: string | null } {
  if (!data || !data.kind) {
    return { accepted: false, rejectionReason: 'missing_kind' }
  }
  if (data.kind === 'ai') {
    const p = data.personalizedForUid ?? null
    if (p && !uid) return { accepted: false, rejectionReason: 'ai_no_uid' }
    if (p && uid && p !== uid) return { accepted: false, rejectionReason: 'ai_uid_mismatch' }
    if (data.closedPermanently === true) {
      return { accepted: false, rejectionReason: 'ai_closed_permanently' }
    }
  }
  if (alreadySeen) return { accepted: false, rejectionReason: 'duplicate_id' }
  return { accepted: true, rejectionReason: null }
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

function indexErrorHint(err: unknown): { errorCode: string | null; errorMessage: string; indexUrl: string | null } {
  const anyErr = err as { code?: unknown; message?: unknown }
  const errorCode = typeof anyErr?.code === 'string' ? anyErr.code : null
  const errorMessage = String(anyErr?.message || err || 'unknown_error')
  const urlMatch = errorMessage.match(/https:\/\/console\.firebase\.google\.com[^\s]+/)
  return { errorCode, errorMessage, indexUrl: urlMatch ? urlMatch[0] : null }
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

  const authHeader = req.headers.get('authorization') || ''
  const bearerReceived = /^Bearer\s+\S+/i.test(authHeader.trim())
  const uid = await getUidFromRequest(req)
  const tokenVerified = !!uid
  const keys = neighborAreaKeys(lat, lng)
  const cafeAreaKey = areaKey(CAFE_FELIX_DIAG_LAT, CAFE_FELIX_DIAG_LNG)
  const cafeAreaQueried = keys.includes(cafeAreaKey)
  const cafeEncounters: Array<Record<string, unknown>> = []
  const marrasEncounters: Array<Record<string, unknown>> = []

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
        const tracePlace = tracePlaceFromTitle(data?.title)
        if (tracePlace) {
          const gate = diagnosticGateDecision(data, uid, seen.has(doc.id))
          const row = {
            source: 'nine-cell',
            areaKey: key,
            documentId: doc.id,
            kind: data?.kind ?? null,
            personalizedForUid: data?.personalizedForUid ?? null,
            requestUid: uid,
            closedPermanently: data?.closedPermanently === true,
            googlePlaceId: data?.googlePlaceId ?? null,
            placeId: data?.placeId ?? null,
            placeKey: data?.placeKey ?? null,
            accepted: gate.accepted,
            rejectionReason: gate.rejectionReason,
          }
          if (tracePlace === 'cafe-felix') cafeEncounters.push(row)
          else marrasEncounters.push(row)
        }
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

  const personalizedQuery: Record<string, unknown> = {
    ran: false,
    ok: false,
    docsReturned: 0,
    accepted: 0,
    skippedDuplicate: 0,
    skippedFar: 0,
    errorCode: null,
    errorMessage: null,
    indexUrl: null,
  }

  if (uid) {
    personalizedQuery.ran = true
    try {
      const personalizedSnap = await db
        .collectionGroup('items')
        .where('personalizedForUid', '==', uid)
        .get()
      personalizedQuery.ok = true
      personalizedQuery.docsReturned = personalizedSnap.size

      for (const doc of personalizedSnap.docs) {
        const data = doc.data() as StoredRecommendation
        const recLat = Number(data?.lat)
        const recLng = Number(data?.lng)
        const coordsOk = Number.isFinite(recLat) && Number.isFinite(recLng)
        const distanceMeters = coordsOk
          ? Math.round(haversineDistanceMeters({ lat, lng }, { lat: recLat, lng: recLng }))
          : null

        let rejectionReason: string | null = null
        if (!coordsOk) rejectionReason = 'invalid_coords'
        else if (distanceMeters != null && distanceMeters > PERSONALIZED_AI_MAX_DISTANCE_M) {
          rejectionReason = 'beyond_5000m'
          personalizedQuery.skippedFar = Number(personalizedQuery.skippedFar || 0) + 1
        } else {
          const gate = diagnosticGateDecision(data, uid, seen.has(doc.id))
          if (!gate.accepted) {
            rejectionReason = gate.rejectionReason
            if (gate.rejectionReason === 'duplicate_id') {
              personalizedQuery.skippedDuplicate =
                Number(personalizedQuery.skippedDuplicate || 0) + 1
            }
          }
        }

        const accepted =
          !rejectionReason &&
          acceptStoredRecommendation({
            docId: doc.id,
            data,
            uid,
            seen,
            results,
          })
        if (accepted) {
          personalizedQuery.accepted = Number(personalizedQuery.accepted || 0) + 1
        }

        const tracePlace = tracePlaceFromTitle(data?.title)
        if (tracePlace) {
          const row = {
            source: 'collection-group',
            areaKey: coordsOk ? areaKey(recLat, recLng) : null,
            documentId: doc.id,
            kind: data?.kind ?? null,
            personalizedForUid: data?.personalizedForUid ?? null,
            requestUid: uid,
            closedPermanently: data?.closedPermanently === true,
            googlePlaceId: data?.googlePlaceId ?? null,
            placeId: data?.placeId ?? null,
            placeKey: data?.placeKey ?? null,
            distanceMeters,
            within5000m:
              distanceMeters != null && distanceMeters <= PERSONALIZED_AI_MAX_DISTANCE_M,
            accepted,
            rejectionReason: accepted ? null : rejectionReason,
          }
          if (tracePlace === 'cafe-felix') cafeEncounters.push(row)
          else marrasEncounters.push(row)
        }
      }
    } catch (err) {
      const hint = indexErrorHint(err)
      personalizedQuery.ok = false
      personalizedQuery.errorCode = hint.errorCode
      personalizedQuery.errorMessage = hint.errorMessage
      personalizedQuery.indexUrl = hint.indexUrl
      console.error(
        '[recommendations/query] collectionGroup(items).where(personalizedForUid) failed',
        hint
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

  const cafeAccepted = cafeEncounters.some((row) => row.accepted === true)
  const cafeAcceptedViaPersonalized = cafeEncounters.some(
    (row) => row.accepted === true && row.source === 'collection-group'
  )
  const cafeRejectedAuth = cafeEncounters.some(
    (row) =>
      row.rejectionReason === 'ai_no_uid' || row.rejectionReason === 'ai_uid_mismatch'
  )
  let cafeConclusion = 'OTHER'
  if (cafeAcceptedViaPersonalized) cafeConclusion = 'ACCEPTED_VIA_PERSONALIZED_QUERY'
  else if (cafeAccepted) cafeConclusion = 'ACCEPTED'
  else if (personalizedQuery.ran && personalizedQuery.ok === false) {
    cafeConclusion = 'OTHER_PERSONALIZED_QUERY_FAILED'
  } else if (!cafeAreaQueried && !uid) cafeConclusion = 'A+B'
  else if (!cafeAreaQueried) cafeConclusion = 'B_AREA_NOT_QUERIED'
  else if (cafeEncounters.length === 0) {
    cafeConclusion =
      'OTHER_AREA_QUERIED_BUT_DOC_NOT_IN_SNAP (not in top 60 or stored under a different cell)'
  } else if (!cafeAccepted && cafeRejectedAuth) cafeConclusion = 'A_AUTH_REJECTED'
  else cafeConclusion = 'OTHER_ENCOUNTERED_BUT_REJECTED'

  const cafeConclusionText = cafeAcceptedViaPersonalized
    ? 'Café a_* accepted via personalized collection-group query (area nine-cell miss is not a failure)'
    : cafeEncounters.length === 0 && !cafeAreaQueried
      ? 'Café area key is NOT among the nine queried keys; a_* was never in the nine-cell itemsSnap'
      : cafeEncounters.length === 0 && cafeAreaQueried
        ? 'Café area WAS queried, but no Café Felix document appeared in itemsSnap'
        : cafeConclusion

  const marrasAreaKeys = Array.from(
    new Set(marrasEncounters.map((row) => String(row.areaKey || '')))
  ).filter(Boolean)
  const marrasRichAccepted = marrasEncounters.filter(
    (row) =>
      row.accepted === true &&
      (row.googlePlaceId || String(row.placeKey || '').startsWith('place:'))
  )

  return NextResponse.json({
    ok: true,
    areaKeys: keys,
    personalized: !!uid,
    recommendations: results,
    _recommendationQueryTrace: {
      bearerReceived,
      tokenVerified,
      uid,
      userLat: lat,
      userLng: lng,
      neighborAreaKeys: keys,
      personalizedQuery,
      cafeFelix: {
        diagnosticCoords: { lat: CAFE_FELIX_DIAG_LAT, lng: CAFE_FELIX_DIAG_LNG },
        areaKey: cafeAreaKey,
        areaQueried: cafeAreaQueried,
        documentsEncountered: cafeEncounters,
        conclusion: cafeConclusionText,
        classifiedFailure: cafeConclusion,
      },
      marras: {
        areaKeysEncountered: marrasAreaKeys,
        areaIncluded: marrasAreaKeys.some((k) => keys.includes(k)),
        documentsEncountered: marrasEncounters,
        richDocumentAccepted: marrasRichAccepted.length > 0,
      },
    },
  })
}

