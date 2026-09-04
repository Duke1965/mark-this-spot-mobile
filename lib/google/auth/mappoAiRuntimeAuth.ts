/**
 * Mappo AI Runtime authentication (SERVER ONLY).
 *
 * Production / Vercel:
 *   Vercel OIDC → Google Workload Identity Federation → SA impersonation
 *
 * Local development:
 *   Google Application Default Credentials (developer ADC)
 *
 * Never import this module from client components.
 * Never return credentials, OIDC tokens, or access tokens to the browser.
 */

import { getVercelOidcToken } from '@vercel/oidc'
import {
  GoogleAuth,
  IdentityPoolClient,
  type AuthClient,
} from 'google-auth-library'

if (typeof window !== 'undefined') {
  throw new Error('mappoAiRuntimeAuth must only be imported on the server')
}

/** Static non-secret Google Cloud identifiers for Mappo AI Runtime WIF. */
export const MAPPO_AI_RUNTIME = {
  projectId: 'pinit-7546c',
  projectNumber: '377965994922',
  workloadIdentityPoolId: 'mappo-vercel-runtime',
  workloadIdentityProviderId: 'vercel',
  serviceAccountEmail: 'mappo-ai-runtime@pinit-7546c.iam.gserviceaccount.com',
} as const

export type MappoAiAuthProvider = 'vercel-wif' | 'google-adc'

export type MappoAiAuthClientResult = {
  provider: MappoAiAuthProvider
  client: AuthClient
  serviceAccountEmail: string
}

export type MappoAiAuthVerifyResult = {
  ok: true
  provider: MappoAiAuthProvider
  serviceAccount: string
}

const CLOUD_PLATFORM_SCOPE = 'https://www.googleapis.com/auth/cloud-platform'

const WIF_AUDIENCE =
  `//iam.googleapis.com/projects/${MAPPO_AI_RUNTIME.projectNumber}` +
  `/locations/global/workloadIdentityPools/${MAPPO_AI_RUNTIME.workloadIdentityPoolId}` +
  `/providers/${MAPPO_AI_RUNTIME.workloadIdentityProviderId}`

const SA_IMPERSONATION_URL =
  `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/` +
  `${MAPPO_AI_RUNTIME.serviceAccountEmail}:generateAccessToken`

/**
 * True when running inside a Vercel deployment (build or serverless function).
 * Local `next dev` does not set VERCEL=1.
 */
export function isVercelRuntime(): boolean {
  return process.env.VERCEL === '1'
}

function sanitizeAuthError(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error)
  // Never echo token-like strings back through error messages to callers.
  const scrubbed = message
    .replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, 'Bearer [REDACTED]')
    .replace(/eyJ[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+/g, '[REDACTED_JWT]')
  return new Error(scrubbed || 'Google authentication failed')
}

function logAuthFailure(context: string, error: unknown): void {
  const safe = sanitizeAuthError(error)
  console.error(`[mappoAiRuntimeAuth] ${context}:`, safe.message)
}

/**
 * Obtain a server-only authenticated Google client for Mappo AI Runtime.
 *
 * - On Vercel: WIF only (no ADC fallback on failure).
 * - Locally: Google ADC only.
 */
export async function getMappoAiRuntimeAuthClient(): Promise<MappoAiAuthClientResult> {
  if (isVercelRuntime()) {
    return getVercelWifAuthClient()
  }
  return getLocalAdcAuthClient()
}

async function getVercelWifAuthClient(): Promise<MappoAiAuthClientResult> {
  try {
    // Obtain OIDC at request time (not module init). Do not cache the raw OIDC token.
    const client = new IdentityPoolClient({
      type: 'external_account',
      audience: WIF_AUDIENCE,
      subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
      token_url: 'https://sts.googleapis.com/v1/token',
      service_account_impersonation_url: SA_IMPERSONATION_URL,
      scopes: [CLOUD_PLATFORM_SCOPE],
      subject_token_supplier: {
        getSubjectToken: async () => {
          return await getVercelOidcToken()
        },
      },
    })

    return {
      provider: 'vercel-wif',
      client,
      serviceAccountEmail: MAPPO_AI_RUNTIME.serviceAccountEmail,
    }
  } catch (error) {
    logAuthFailure('Vercel WIF client init failed', error)
    throw new Error('Google authentication failed')
  }
}

async function getLocalAdcAuthClient(): Promise<MappoAiAuthClientResult> {
  try {
    const auth = new GoogleAuth({
      scopes: [CLOUD_PLATFORM_SCOPE],
    })
    const client = await auth.getClient()
    return {
      provider: 'google-adc',
      client,
      serviceAccountEmail: MAPPO_AI_RUNTIME.serviceAccountEmail,
    }
  } catch (error) {
    logAuthFailure('Local ADC client init failed', error)
    throw new Error('Google authentication failed')
  }
}

/**
 * Prove Google authentication succeeds without calling paid product APIs.
 * Fetches a short-lived access token via google-auth-library and discards it.
 */
export async function verifyMappoAiRuntimeAuth(): Promise<MappoAiAuthVerifyResult> {
  const { provider, client, serviceAccountEmail } = await getMappoAiRuntimeAuthClient()

  try {
    const tokenResponse = await client.getAccessToken()
    const token =
      typeof tokenResponse === 'string'
        ? tokenResponse
        : tokenResponse?.token

    if (!token || typeof token !== 'string') {
      throw new Error('No access token returned from Google auth client')
    }

    // Credential proof succeeded — discard token; never return it.
    return {
      ok: true,
      provider,
      serviceAccount: serviceAccountEmail,
    }
  } catch (error) {
    logAuthFailure(`Credential verification failed (${provider})`, error)
    // On Vercel, never fall back to ADC after WIF failure.
    throw new Error('Google authentication failed')
  }
}
