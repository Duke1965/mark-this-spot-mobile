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
  lat: number
  lon: number
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

function geoDocId(lat: number, lon: number): string {
  return `${lat.toFixed(4)}:${lon.toFixed(4)}`
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
  const db = getAdminFirestore()
  if (!db) return null

  const ttlDays = input.ttlDays ?? envInt('GOOGLE_PIN_INTEL_CACHE_TTL_DAYS', 30)
  const geoId = geoDocId(input.lat, input.lon)
  const geoSnap = await db.collection('place_cache_geo').doc(geoId).get().catch(() => null)
  const placeId = geoSnap?.exists ? String(geoSnap.data()?.place_id || '') : ''
  if (!placeId) return null

  const docId = placeDocId(placeId)
  const snap = await db.collection('place_cache').doc(docId).get().catch(() => null)
  if (!snap?.exists) return null
  const data = snap.data() as any
  if (!isFresh(data?.updatedAt, ttlDays)) return null

  return { place: data as CachedGooglePlace, cacheHit: true }
}

export async function setCachedGooglePlace(input: {
  place: Omit<CachedGooglePlace, 'updatedAt'>
  lat: number
  lon: number
}): Promise<void> {
  const db = getAdminFirestore()
  if (!db) return

  const docId = placeDocId(input.place.place_id)
  const geoId = geoDocId(input.lat, input.lon)

  const payload: CachedGooglePlace = {
    ...input.place,
    lat: input.lat,
    lon: input.lon,
    source: 'google',
    updatedAt: FieldValue.serverTimestamp()
  }

  await Promise.all([
    db.collection('place_cache').doc(docId).set(payload, { merge: true }),
    db
      .collection('place_cache_geo')
      .doc(geoId)
      .set({ place_id: input.place.place_id, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
  ])
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
}

