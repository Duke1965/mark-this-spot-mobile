# Foursquare Places API Integration Guide

## 🎯 Overview

PINIT now uses **Foursquare Places API** as the primary location data provider instead of Google Places API. This provides:
- ✅ **High-quality photos** (solves the image quality problem!)
- ✅ **Enterprise reliability** (won't disappear like free APIs)
- ✅ **Rich place data** (reviews, ratings, categories, business hours)
- ✅ **Reasonable pricing** (10,000 free calls/month, then $0.50-1.00 per 1,000)

## 🔑 Setup Instructions

### 1. Get Foursquare API Key

1. Visit: https://foursquare.com/products/places-api
2. Sign up for a developer account
3. Create a new app/project
4. Copy your API key

### 2. Add API Key to Environment

Add to your `.env.local` file:

```env
NEXT_PUBLIC_FOURSQUARE_API_KEY=your_api_key_here
```

**Important:** The API key must start with `NEXT_PUBLIC_` because it's used on the client side.

### 3. Deploy to Vercel

Add the environment variable to Vercel:
1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add: `NEXT_PUBLIC_FOURSQUARE_API_KEY` = `your_api_key_here`
4. Redeploy

## 📊 How It Works

### Rate Limiting (Built-in Safeguards)

The integration includes **automatic rate limiting** to prevent API loops:

- ✅ **Minimum 1 second** between requests
- ✅ **LocalStorage-based** tracking
- ✅ **Automatic fallback** to mock data if rate limited
- ✅ **5-minute cooldown** for new user recommendations

### API Usage

**Current Usage:** New user recommendations only
- Each new user session: 1-2 API calls
- Cost: FREE (under 10,000 calls/month)

**Future Usage:** Can be expanded to:
- Pin location enrichment
- Photo fetching for pins
- Place details when viewing recommendations

## 🛠️ Files Created/Modified

### New Files:
- `lib/foursquare.ts` - Foursquare API client
- `app/api/foursquare-places/route.ts` - Server-side API route
- `docs/FOURSQUARE_SETUP.md` - This guide

### Modified Files:
- `components/AIRecommendationsHub.tsx` - Uses Foursquare for new user recommendations

## 📈 Pricing

### Free Tier
- **0-10,000 calls/month**: FREE ✅

### Paid Tier (if needed)
- **After 10,000 calls**: ~$0.50-1.00 per 1,000 calls
- **Example**: 50,000 calls = ~$20-25/month

### Cost Estimate for PINIT:
- **Early stage** (1k-10k users/month): FREE
- **Growing** (50k calls/month): ~$20/month
- **Mature** (200k calls/month): ~$95/month

## 🔄 Migration Status

### ✅ Completed:
- Foursquare API client created
- Server-side proxy route created
- New user recommendations now use Foursquare
- Rate limiting safeguards in place

### ⏳ To Do (Optional):
- Replace Google Places API calls in other parts of the app
- Add Foursquare for pin photo enrichment
- Add fallback system with multiple APIs

## 🧪 Testing

To test the Foursquare integration:

1. Ensure API key is configured
2. Open app as a new user
3. Go to Recommendations
4. Should see real local places with high-quality photos!

## 🐛 Troubleshooting

### "No places found"
- Check API key is configured correctly
- Verify environment variable is set in Vercel
- Check browser console for API errors

### "Rate limit exceeded"
- Built-in safeguards prevent this
- Wait 1 second between requests
- System automatically falls back to mock data

### "Poor image quality"
- Foursquare provides higher quality than current API
- Check photo URL generation in `lib/foursquare.ts`
- Verify `getPhotoUrl()` method is working

## 📞 Support

- Foursquare API Docs: https://docs.foursquare.com/
- Foursquare API Status: https://status.foursquare.com/
- Pricing: https://foursquare.com/products/places-api/pricing
