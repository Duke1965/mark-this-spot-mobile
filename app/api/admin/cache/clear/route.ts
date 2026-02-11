import { type NextRequest, NextResponse } from 'next/server'

import { getAdminFirestore } from '@/lib/firebaseAdmin'
import { deleteCachedGooglePlaceById, deleteCachedGooglePlaceGeoByLatLon } from '@/lib/cache/placeCache'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function envToken(): string | null {
  const t = String(process.env.PINIT_ADMIN_TOKEN || '').trim()
  return t ? t : null
}

function haversineOkLatLon(lat: number, lon: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180
}

export async function POST(request: NextRequest) {
  const token = envToken()
  const got = request.headers.get('x-admin-token') || new URL(request.url).searchParams.get('token') || ''
  if (!token || got !== token) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const placeId = String(searchParams.get('placeId') || '').trim()
  const lat = Number(searchParams.get('lat'))
  const lon = Number(searchParams.get('lon'))

  const db = getAdminFirestore()
  if (!db) {
    return NextResponse.json({ ok: false, error: 'no_firestore' }, { status: 500 })
  }

  const out: any = { ok: true, deleted: {} as any }

  // Clear by geo binding (lat/lon doc) and optionally prune coarse array entry.
  if (haversineOkLatLon(lat, lon)) {
    const res = await deleteCachedGooglePlaceGeoByLatLon({ lat, lon })
    out.deleted.geo = res
  }

  // Clear by placeId (place_cache/google:<placeId>)
  if (placeId) {
    const res = await deleteCachedGooglePlaceById({ placeId })
    out.deleted.place = res
  }

  if (!out.deleted.geo && !out.deleted.place) {
    return NextResponse.json(
      { ok: false, error: 'missing_params', hint: 'Provide lat&lon and/or placeId' },
      { status: 400 }
    )
  }

  return NextResponse.json(out)
}

