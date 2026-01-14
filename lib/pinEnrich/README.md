# PINIT Pin Enrichment Pipeline

This directory contains the hybrid pin enrichment pipeline implementation.

## Overview

The enrichment pipeline resolves place identity, descriptions, and images using:
1. **TomTom** for place identity (name/category/address/website)
2. **Wikidata/Wikimedia** for descriptions + images
3. **Website preview** scraping (OG/Twitter meta + JSON-LD)
4. Optional stock image fallback

## Files

- `types.ts` - Data models (PlaceIdentity, EnrichedPin)
- `cache.ts` - Caching helpers with TTL based on place category
- `resolvePlaceIdentity.ts` - TomTom API integration for place identity
- `wikidata.ts` - Wikidata/Wikimedia integration
- `websitePreview.ts` - Safe website preview fetching with robots.txt support
- `imageStore.ts` - Image download and Firebase Storage upload (requires Firebase Admin SDK)

## API Route

- `app/api/pin/enrich/route.ts` - Main enrichment endpoint (POST)
- `app/api/pin/enrich/diagnostics/route.ts` - Debug endpoint for testing (GET)

## Usage

### Server-side (API Route)

```typescript
POST /api/pin/enrich
Body: { lat: number; lng: number; userHintName?: string }
Response: { status: 'ok', data: EnrichedPin }
```

### Client-side Integration

```typescript
const response = await fetch('/api/pin/enrich', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ lat, lng, userHintName: 'Optional hint' })
})

const { data } = await response.json()
// data.place - PlaceIdentity
// data.description - string | undefined
// data.images - Array of hosted image URLs
```

## Important Notes

### Firebase Admin SDK Required

The `imageStore.ts` module requires Firebase Admin SDK for server-side image uploads. Currently, it throws an error if called. To enable:

1. Install Firebase Admin SDK:
   ```bash
   npm install firebase-admin
   ```

2. Initialize Firebase Admin (create `lib/firebaseAdmin.ts`):
   ```typescript
   import admin from 'firebase-admin'
   
   if (!admin.apps.length) {
     admin.initializeApp({
       credential: admin.credential.cert({
         // Your service account key
       })
     })
   }
   
   export const adminStorage = admin.storage()
   ```

3. Update `lib/pinEnrich/imageStore.ts` to use Admin SDK.

### Environment Variables

- `TOMTOM_API_KEY` or `NEXT_PUBLIC_TOMTOM_API_KEY` - Required for place identity resolution

### Integration with Pin Creation

To integrate into pin creation flow:

1. Call `/api/pin/enrich` after pin location is set
2. Use `enriched.place` for pin title/name
3. Use `enriched.description` for pin description
4. Use `enriched.images` for pin images
5. Update pin record with enriched data

Example integration point: `app/page.tsx` `handlePinEditDone` function.

## Cache

Enrichment results are cached using geohash-based keys with TTL:
- Business places: 45 days
- Landmarks: 180 days
- Default: 90 days

## Safety Features

- URL validation (blocks SSRF risks)
- Robots.txt checking
- Per-domain throttling (1 second between requests)
- Timeouts (3-5 seconds)
- Response size limits (~1MB for HTML)
- Images are downloaded and uploaded to our storage (never hotlinked)
