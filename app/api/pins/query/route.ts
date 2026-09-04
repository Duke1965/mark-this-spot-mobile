import { NextResponse } from 'next/server'
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

function int(v: string | null, fallback: number): number {
  const n = Number(v)
  return Number.isFinite(n) ? Math.max(1, Math.floor(n)) : fallback
}

export async function GET(req: Request) {
  const uid = await getUidFromRequest(req)
  if (!uid) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

  const db = getAdminFirestore()
  if (!db) return NextResponse.json({ ok: false, error: 'firestore_unavailable' }, { status: 500 })

  const url = new URL(req.url)
  const limit = Math.min(500, int(url.searchParams.get('limit'), 200))

  try {
    const snap = await db
      .collection('users')
      .doc(uid)
      .collection('pins')
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get()

    const pins = snap.docs.map((d) => d.data())
    return NextResponse.json({ ok: true, uid, count: pins.length, pins })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: 'query_failed', message: String(e?.message || e) },
      { status: 500 }
    )
  }
}

