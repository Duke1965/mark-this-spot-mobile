import { NextResponse } from 'next/server'
import { FieldPath } from 'firebase-admin/firestore'
import { getAdminAuth, getAdminFirestore } from '@/lib/firebaseAdmin'

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
        }

        const outId = doc.id
        if (seen.has(outId)) continue
        seen.add(outId)

        results.push({
          id: outId,
          title: data.title,
          description: data.description || '',
          category: data.category || 'general',
          location: { lat: data.lat, lng: data.lng },
          rating: typeof data.rating === 'number' ? data.rating : 4.0,
          isAISuggestion: data.kind === 'ai',
          confidence: typeof data.confidence === 'number' ? data.confidence : (data.kind === 'ai' ? 20 : 0),
          reason: data.reason || (data.kind === 'ai' ? 'AI suggestion' : 'Recommended by community'),
          timestamp: new Date()
        })
      }
    } catch {
      // ignore a single bucket failure
    }
  }

  return NextResponse.json({
    ok: true,
    areaKeys: keys,
    personalized: !!uid,
    recommendations: results
  })
}

