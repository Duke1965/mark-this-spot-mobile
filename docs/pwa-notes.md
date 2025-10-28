# PWA Installability Fix

## What Changed

We removed the explicit PWA prevention code that was blocking installation in Chrome and other browsers.

### Files Modified

1. **`app/layout.tsx`**
   - Removed PWA prevention meta tags (`mobile-web-app-capable="no"`, etc.)
   - Removed service worker unregistration code
   - Removed `beforeinstallprompt` event prevention
   - Added imports for `RegisterSW` and `InstallPrompt` components
   - Updated metadata to include manifest and theme color

2. **New Files Created**
   - `app/_components/RegisterSW.tsx` - Registers service worker on client-side
   - `app/_components/InstallPrompt.tsx` - Shows "Install PINIT" button
   - `app/_components/OneTimeSWCleanup.tsx` - Helper for cleaning old service workers
   - `public/sw.js` - Minimal service worker
   - `public/manifest.webmanifest` - PWA manifest
   - `public/icons/icon-192.png` - Small icon
   - `public/icons/icon-512.png` - Large icon
   - `public/icons/maskable-512.png` - Maskable icon

### Key Changes

**Before:**
- Explicit PWA prevention with meta tags
- Service workers were unregistered on every page load
- `beforeinstallprompt` event was prevented
- No manifest.json or service worker files

**After:**
- PWA-ready with manifest and service worker
- Service worker registers cleanly
- Install button appears when user can install
- Clean install experience in Chrome

## How to Test

### Local Testing

1. Start dev server: `pnpm dev` or `npm run dev`
2. Open browser: `http://localhost:3000`
3. Open DevTools → Application tab
4. Check:
   - **Manifest**: Should show "Installable: Yes"
   - **Service Worker**: Should show active service worker at `/sw.js`
   - **Application** → **Manifest**: Verify all icons load

5. In Chrome:
   - Look for install icon in address bar
   - OR look for "Install PINIT" button (bottom right)

### Production Testing

1. Deploy to Vercel
2. Visit production URL
3. Repeat the DevTools checks above
4. Test installation on desktop and mobile Chrome

## Acceptance Criteria

✅ Chrome's Application → Manifest panel reports "Installable: Yes"
✅ Service Worker is active and registered at `/sw.js`
✅ Manifest is loaded with no errors
✅ Chrome shows install option or "Install PINIT" button works
✅ No duplicate manifests or service worker files
✅ Vercel preview/production behaves the same

## Notes

- Icons are currently using placeholder (`pinit-logo.png`). You may want to create proper 192x192 and 512x512 PNG icons later.
- Service worker is minimal and doesn't cache anything (yet) to avoid stale issues during development.
- The "Install PINIT" button appears when Chrome's `beforeinstallprompt` event fires (user hasn't installed yet).

## Files to Upload to GitHub

- `app/layout.tsx`
- `app/_components/RegisterSW.tsx`
- `app/_components/InstallPrompt.tsx`
- `app/_components/OneTimeSWCleanup.tsx`
- `public/sw.js`
- `public/manifest.webmanifest`
- `public/icons/icon-192.png`
- `public/icons/icon-512.png`
- `public/icons/maskable-512.png`

