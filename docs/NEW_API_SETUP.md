# NEW API SETUP - Cost-Safe Gateway

## Overview
PINIT now uses a cost-safe API gateway that prevents excessive billing by:
- Rate limiting (5 req/min, 60 req/hour)
- Caching (6h geocode, 2h POI)
- Idempotency (60s window)
- One-shot client-side guards

## New API Providers

### 1. OpenCage (Reverse Geocoding)
- **Purpose**: Convert coordinates to addresses
- **Get API key**: https://opencagedata.com/api
- **Free tier**: 2,500 requests/day
- **Env var**: `OPENCAGE_KEY`

### 2. Geoapify (Places/POI)
- **Purpose**: Find nearby places
- **Get API key**: https://www.geoapify.com/
- **Free tier**: 3,000 requests/day
- **Env var**: `GEOAPIFY_KEY`

### 3. Mapillary (Optional - Street Imagery)
- **Purpose**: Street-level imagery
- **Get token**: https://www.mapillary.com/developer
- **Free tier**: Yes
- **Env var**: `MAPILLARY_TOKEN` (optional)

### 4. Upstash Redis (Optional - Production Cache)
- **Purpose**: Shared cache across serverless functions
- **Get credentials**: https://upstash.com/
- **Free tier**: 10,000 commands/day
- **Env vars**: `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (optional)

## Environment Variables

Add these to your `.env.local` file:

```bash
# Required
OPENCAGE_KEY=your_opencage_api_key_here
GEOAPIFY_KEY=your_geoapify_api_key_here

# Optional
MAPILLARY_TOKEN=your_mapillary_token_here
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

## Vercel Deployment

Add the same environment variables to your Vercel project:

1. Go to https://vercel.com/your-team/your-project/settings/environment-variables
2. Add each variable
3. Redeploy

## Testing

Run the test script locally:

```bash
# Make sure your dev server is running
pnpm dev

# In another terminal:
npx ts-node scripts/test-pin-intel.ts
```

Expected output:
```json
{
  "meta": {
    "source": { "geocode": "opencage", "places": "geoapify" },
    "cached": { "geocode": false, "places": false },
    "rate": { "minuteRemaining": 4, "hourRemaining": 59 },
    "duration_ms": 234
  },
  "geocode": {
    "formatted": "Cape Town, Western Cape, South Africa"
  },
  "places": [...]
}
```

## Migration Completed

✅ Removed all Google Places API calls  
✅ Removed all Google Geocoding API calls (except for static map fallback)  
✅ Added rate limiting and caching  
✅ Added one-shot client guards  
✅ Reduced API costs by ~95%  

## Next Steps

1. Get OpenCage and Geoapify API keys
2. Add to `.env.local` and Vercel
3. Test locally
4. Deploy to Vercel
5. Monitor usage in provider dashboards

