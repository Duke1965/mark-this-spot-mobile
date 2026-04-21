import { NextResponse } from "next/server"
import { getAdminApp, getAdminFirestore } from "@/lib/firebaseAdmin"
import { getAuth } from "firebase-admin/auth"

export const runtime = "nodejs"

async function getUidFromRequest(req: Request): Promise<string | null> {
  const app = getAdminApp()
  if (!app) return null
  const auth = getAuth(app)
  const header = req.headers.get("authorization") || ""
  const token = header.replace(/^Bearer\s+/i, "").trim()
  if (!token) return null
  try {
    const decoded = await auth.verifyIdToken(token)
    return decoded.uid || null
  } catch {
    return null
  }
}

export async function POST(req: Request) {
  const uid = await getUidFromRequest(req)
  if (!uid) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 })

  const db = getAdminFirestore()
  if (!db) return NextResponse.json({ ok: false, error: "firestore_unavailable" }, { status: 500 })

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 })
  }

  const id = typeof body?.id === "string" ? body.id.trim() : ""
  if (!id) return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 })

  try {
    await db.collection("users").doc(uid).collection("pins").doc(id).delete()
    return NextResponse.json({ ok: true, id })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "delete_failed", message: String(e?.message || e) },
      { status: 500 }
    )
  }
}

