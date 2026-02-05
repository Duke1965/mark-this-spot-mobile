# STACK.md
PINIT is a **Next.js 15 + React 19 web app**, deployed on Vercel.  
It is **NOT React Native / Expo**.  

Use this file as the authoritative stack declaration.  

## Pin-time Google Places (hybrid)

PINIT can optionally use **Google Places** for **place identity + photos at pin time only** (no Google map tiles).

### Environment variables

- **GOOGLE_MAPS_API_KEY** (server-only): Google Places key (never `NEXT_PUBLIC`).
- **NEXT_PUBLIC_USE_GOOGLE_PIN_INTEL**: `true` / `false` feature flag (also enforced server-side).
- **GOOGLE_PIN_INTEL_MAX_NEW_PINS_PER_DAY** (server-only): default `50`.
- **GOOGLE_PIN_INTEL_CACHE_TTL_DAYS** (server-only): default `30`.
- **GOOGLE_PIN_INTEL_RADIUS_METERS** (server-only): default `80`.
- **GOOGLE_PIN_INTEL_MAX_PHOTOS** (server-only): default `3`.

### Firestore collections used

- `place_cache` (doc: `google:<place_id>`)
- `place_cache_geo` (doc: `<lat.toFixed(4)>:<lon.toFixed(4)>`)
- `google_pin_intel_limits` (doc: `<YYYY-MM-DD>:<limiterKey>`)
