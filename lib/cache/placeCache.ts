/**
 * Firestore cache for Google place identity + hosted photos.
 *
 * Collections:
 * - place_cache (doc id: google:<place_id>)
 * - place_cache_geo (doc id: <lat4>:<lon4>)
 * - google_pin_intel_limits (doc id: <YYYY-MM-DD>:<key>)
 */

import { FieldValue } from 'firebase-admin/firestore'
import { getAdminFirestore } from '@/lib/firebaseAdmin'

export type CachedGooglePlace = {
  place_id: string
  name?: string
  address?: string
  website?: string
  types?: string[]
  // The pin location used for geo indexing
  lat: number
  lon: number
  // The actual place location (when known) to sanity-check geo cache bindings
  placeLat?: number
  placeLon?: number
  photoStorageUrls: string[]
  updatedAt?: any
  source: 'google'
}

function envInt(name: string, def: number): number {
  const raw = process.env[name]
  if (!raw) return def
  const n = Number(raw)
  return Number.isFinite(n) ? Math.floor(n) : def
}

function cacheEnabled(): boolean {
  const raw = process.env.PINIT_ENABLE_GOOGLE_CACHE
  if (!raw) return true
  return String(raw).toLowerCase() !== 'false'
}

function geoDocId(lat: number, lon: number): string {
  return `${lat.toFixed(4)}:${lon.toFixed(4)}`
}

function geoDocIdCoarse(lat: number, lon: number): string {
  return `${lat.toFixed(3)}:${lon.toFixed(3)}`
}

function placeDocId(placeId: string): string {
  return `google:${placeId}`
}

function isFresh(updatedAt: any, ttlDays: number): boolean {
  if (!updatedAt) return false
  const ms =
    typeof updatedAt?.toMillis === 'function'
      ? updatedAt.toMillis()
      : typeof updatedAt?.seconds === 'number'
        ? updatedAt.seconds * 1000
        : Number(updatedAt)
  if (!Number.isFinite(ms)) return false
  const ttlMs = Math.max(1, ttlDays) * 24 * 60 * 60 * 1000
  return Date.now() - ms < ttlMs
}

export async function getCachedGooglePlaceByLatLon(input: {
  lat: number
  lon: number
  ttlDays?: number
}): Promise<{ place: CachedGooglePlace; cacheHit: true } | null> {
  if (!cacheEnabled()) return null
  const db = getAdminFirestore()
  if (!db) return null

  const ttlDays =
    input.ttlDays ??
    envInt('PINIT_GOOGLE_CACHE_TTL_DAYS', envInt('GOOGLE_PIN_INTEL_CACHE_TTL_DAYS', 90))
  const fineId = geoDocId(input.lat, input.lon)
  const fineSnap = await db.collection('place_cache_geo').doc(fineId).get().catch(() => null)
  const finePlaceId = fineSnap?.exists ? String(fineSnap.data()?.place_id || '') : ''
  if (finePlaceId) {
    const got = await getCachedGooglePlaceById({ placeId: finePlaceId, ttlDays })
    if (got) return got
  }

  // Coarse fallback: allows cache hits when pin coords vary a bit.
  // Safety: after fetching candidates, we still require freshness and distance <= 150m.
  const coarseId = geoDocIdCoarse(input.lat, input.lon)
  const coarseSnap = await db.collection('place_cache_geo_coarse').doc(coarseId).get().catch(() => null)
  const placeIds: string[] = coarseSnap?.exists && Array.isArray(coarseSnap.data()?.place_ids)
    ? (coarseSnap.data()!.place_ids as any[]).map(String).filter(Boolean)
    : []
  if (placeIds.length === 0) return null

  // Limit reads
  const unique = Array.from(new Set(placeIds)).slice(0, 8)
  const docs = await Promise.all(unique.map((pid) => getCachedGooglePlaceById({ placeId: pid, ttlDays })))
  const candidates = docs.filter(Boolean).map((r) => (r as any).place as CachedGooglePlace)
  if (candidates.length === 0) return null

  // Pick closest within 150m
  const R = 6371000
  const toRad = (x: number) => (x * Math.PI) / 180
  const distM = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => {
    const dLat = toRad(b.lat - a.lat)
    const dLon = toRad(b.lon - a.lon)
    const lat1 = toRad(a.lat)
    const lat2 = toRad(b.lat)
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
    return 2 * R * Math.asin(Math.sqrt(h))
  }

  let best: { p: CachedGooglePlace; d: number } | null = null
  for (const p of candidates) {
    const refLat = Number.isFinite(Number((p as any).placeLat)) ? Number((p as any).placeLat) : p.lat
    const refLon = Number.isFinite(Number((p as any).placeLon)) ? Number((p as any).placeLon) : p.lon
    if (!Number.isFinite(refLat) || !Number.isFinite(refLon)) continue
    const d = distM({ lat: input.lat, lon: input.lon }, { lat: refLat, lon: refLon })
    if (d > 150) continue
    if (!best || d < best.d) best = { p, d }
  }
  if (!best) return null

  return { place: best.p, cacheHit: true }
}

export async function getCachedGooglePlaceById(input: {
  placeId: string
  ttlDays?: number
}): Promise<{ place: CachedGooglePlace; cacheHit: true } | null> {
  if (!cacheEnabled()) return null
  const db = getAdminFirestore()
  if (!db) return null
  const ttlDays =
    input.ttlDays ??
    envInt('PINIT_GOOGLE_CACHE_TTL_DAYS', envInt('GOOGLE_PIN_INTEL_CACHE_TTL_DAYS', 90))

  try {
    const docId = placeDocId(input.placeId)
    const snap = await db.collection('place_cache').doc(docId).get().catch(() => null)
    if (!snap?.exists) return null
    const data = snap.data() as any
    if (!isFresh(data?.updatedAt, ttlDays)) return null
    return { place: data as CachedGooglePlace, cacheHit: true }
  } catch (e) {
    console.warn('⚠️ Failed to read Google place cache by ID:', e)
    return null
  }
}

export async function setCachedGooglePlace(input: {
  place: Omit<CachedGooglePlace, 'updatedAt'>
  lat: number
  lon: number
  writeGeo?: boolean
  writeCoarseGeo?: boolean
}): Promise<{ ok: boolean; error?: string }> {
  if (!cacheEnabled()) return { ok: false, error: 'cache_disabled' }
  const db = getAdminFirestore()
  if (!db) return { ok: false, error: 'no_firestore' }

  const docId = placeDocId(input.place.place_id)
  const writeGeo = input.writeGeo !== false
  const writeCoarseGeo = input.writeCoarseGeo !== false

  const geoId = geoDocId(input.lat, input.lon)
  const coarseId = geoDocIdCoarse(input.lat, input.lon)

  // Firestore does not allow `undefined` values in documents by default.
  // Sanitize optional fields so cache writes never fail due to `undefined`.
  const photoStorageUrls = Array.isArray(input.place.photoStorageUrls)
    ? input.place.photoStorageUrls.map(String).filter(Boolean)
    : []

  const payload: CachedGooglePlace = {
    place_id: String(input.place.place_id),
    lat: input.lat,
    lon: input.lon,
    photoStorageUrls,
    source: 'google',
    updatedAt: FieldValue.serverTimestamp()
  }
  if (input.place.name) payload.name = String(input.place.name)
  if (input.place.address) payload.address = String(input.place.address)
  if (input.place.website) payload.website = String(input.place.website)
  if (Array.isArray(input.place.types) && input.place.types.length) payload.types = input.place.types.map(String).filter(Boolean)
  if (Number.isFinite(Number(input.place.placeLat))) payload.placeLat = Number(input.place.placeLat)
  if (Number.isFinite(Number(input.place.placeLon))) payload.placeLon = Number(input.place.placeLon)

  try {
    const writes: Promise<any>[] = [db.collection('place_cache').doc(docId).set(payload, { merge: true })]
    if (writeGeo) {
      writes.push(
        db
          .collection('place_cache_geo')
          .doc(geoId)
          .set({ place_id: input.place.place_id, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
      )
    }
    await Promise.all(writes)

    // Coarse geo index: stores multiple place_ids for better hit rate.
    // This is best-effort and should never break pin-intel.
    if (writeCoarseGeo) {
      await db
        .collection('place_cache_geo_coarse')
        .doc(coarseId)
        .set(
          {
            place_ids: FieldValue.arrayUnion(input.place.place_id),
            updatedAt: FieldValue.serverTimestamp()
          },
          { merge: true }
        )
    }
  } catch (e) {
    // Cache should never break pin-intel. If Firestore isn't enabled or permissions are missing,
    // we simply operate without caching until fixed.
    console.warn('⚠️ Failed to write Google place cache:', e)
    const msg = e instanceof Error ? e.message : String(e)
    // Common production misconfig: Firestore not provisioned in the Firebase project.
    // This typically appears as gRPC code 5 NOT_FOUND.
    if (/NOT_FOUND/i.test(msg)) {
      return { ok: false, error: `firestore_not_found:${msg}` }
    }
    return { ok: false, error: msg }
  }

  return { ok: true }
}

export async function deleteCachedGooglePlaceById(input: { placeId: string }): Promise<{ ok: boolean; error?: string }> {
  const db = getAdminFirestore()
  if (!db) return { ok: false, error: 'no_firestore' }
  try {
    await db.collection('place_cache').doc(placeDocId(input.placeId)).delete()
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export async function deleteCachedGooglePlaceGeoByLatLon(input: {
  lat: number
  lon: number
  placeId?: string
}): Promise<{ ok: boolean; error?: string; deletedPlaceId?: string }> {
  const db = getAdminFirestore()
  if (!db) return { ok: false, error: 'no_firestore' }
  const geoId = geoDocId(input.lat, input.lon)
  const coarseId = geoDocIdCoarse(input.lat, input.lon)
  try {
    let pid = String(input.placeId || '')
    if (!pid) {
      const snap = await db.collection('place_cache_geo').doc(geoId).get().catch(() => null)
      pid = snap?.exists ? String(snap.data()?.place_id || '') : ''
    }

    await db.collection('place_cache_geo').doc(geoId).delete().catch(() => null)
    if (pid) {
      await db
        .collection('place_cache_geo_coarse')
        .doc(coarseId)
        .set({ place_ids: FieldValue.arrayRemove(pid), updatedAt: FieldValue.serverTimestamp() }, { merge: true })
        .catch(() => null)
    }

    return { ok: true, deletedPlaceId: pid || undefined }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

function utcDayKey(d: Date = new Date()): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export async function checkAndIncrementGoogleDailyLimit(input: {
  key: string
  maxPerDay?: number
}): Promise<{ allowed: boolean; remaining: number }> {
  const db = getAdminFirestore()
  const max = input.maxPerDay ?? envInt('GOOGLE_PIN_INTEL_MAX_NEW_PINS_PER_DAY', 50)
  if (!db) return { allowed: true, remaining: max }

  const day = utcDayKey()
  const docId = `${day}:${input.key}`
  const ref = db.collection('google_pin_intel_limits').doc(docId)

  try {
    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref)
      const count = snap.exists ? Number(snap.data()?.count || 0) : 0
      const next = count + 1
      if (count >= max) {
        return { allowed: false, remaining: 0 }
      }
      tx.set(ref, { count: next, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
      return { allowed: true, remaining: Math.max(0, max - next) }
    })

    return result
  } catch (e) {
    // Never fail pin-intel if Firestore can't be used yet.
    console.warn('⚠️ Failed to enforce Google daily limit (Firestore issue):', e)
    return { allowed: true, remaining: max }
  }
}

