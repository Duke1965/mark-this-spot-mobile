import { type NextRequest, NextResponse } from 'next/server'

import {
  MAPPO_AI_RUNTIME,
  verifyMappoAiRuntimeAuth,
} from '@/lib/google/auth/mappoAiRuntimeAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function adminTokenConfigured(): string | null {
  const t = String(process.env.PINIT_ADMIN_TOKEN || '').trim()
  return t ? t : null
}

function isAuthorized(request: NextRequest): boolean {
  const expected = adminTokenConfigured()
  if (!expected) return false
  // Header only — do not accept query-string tokens for this route.
  const got = String(request.headers.get('x-admin-token') || '').trim()
  return got === expected
}

/**
 * Temporary diagnostic: prove Vercel OIDC → WIF → Mappo AI Runtime
 * (or local Google ADC) without exposing credentials.
 *
 * GET /api/diagnostics/google-auth
 * Header: x-admin-token: <PINIT_ADMIN_TOKEN>
 */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  try {
    const result = await verifyMappoAiRuntimeAuth()

    // Vercel WIF: serviceAccount is the impersonation target (authenticated principal).
    // Local ADC: do not echo the SA email — that would falsely imply local runs as it.
    if (result.provider === 'vercel-wif') {
      return NextResponse.json(
        {
          ok: true as const,
          provider: 'vercel-wif' as const,
          serviceAccount: MAPPO_AI_RUNTIME.serviceAccountEmail,
        },
        { status: 200, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    return NextResponse.json(
      {
        ok: true as const,
        provider: 'google-adc' as const,
        authenticatedAs: 'local-google-adc' as const,
      },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    )
  } catch {
    return NextResponse.json(
      {
        ok: false as const,
        error: 'Google authentication failed',
      },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
