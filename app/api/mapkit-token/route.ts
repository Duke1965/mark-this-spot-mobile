/**
 * Apple MapKit JWT Token Generation Endpoint
 * Generates ES256 JWT token for MapKit JS authentication
 */

import { NextRequest, NextResponse } from 'next/server'
import { SignJWT, importPKCS8 } from 'jose'

// Force dynamic rendering to avoid caching issues
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    // Read environment variables
    const teamId = process.env.APPLE_MAPKIT_TEAM_ID
    const keyId = process.env.APPLE_MAPKIT_KEY_ID
    const privateKeyBase64 = process.env.APPLE_MAPKIT_PRIVATE_KEY_BASE64

    // Validate environment variables
    if (!teamId || !keyId || !privateKeyBase64) {
      console.error('❌ MapKit env vars missing:', {
        hasTeamId: !!teamId,
        hasKeyId: !!keyId,
        hasPrivateKey: !!privateKeyBase64
      })
      return NextResponse.json(
        { error: 'MapKit env vars missing' },
        { status: 500 }
      )
    }

    // Decode base64 private key
    const privateKeyString = Buffer.from(privateKeyBase64, 'base64').toString('utf-8')

    // Import private key for ES256
    const privateKey = await importPKCS8(privateKeyString, 'ES256')

    // Get origin from request headers (optional)
    const origin = request.headers.get('origin') || undefined

    // Create JWT payload
    const now = Math.floor(Date.now() / 1000)
    const payload = {
      iss: teamId,
      iat: now,
      exp: now + 3600, // 1 hour expiration
      ...(origin && { origin })
    }

    // Create JWT token
    const token = await new SignJWT(payload)
      .setProtectedHeader({
        alg: 'ES256',
        kid: keyId,
        typ: 'JWT'
      })
      .sign(privateKey)

    // Calculate expiration timestamp
    const expiresAt = new Date((now + 3600) * 1000).toISOString()

    console.log('✅ MapKit token generated successfully')

    return NextResponse.json({
      token,
      expiresAt
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      }
    })

  } catch (error) {
    console.error('❌ MapKit token generation error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to generate MapKit token',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

