"use client"

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useAIBehaviorTracker } from '../hooks/useAIBehaviorTracker'
import { useLocationServices } from '../hooks/useLocationServices'
import { usePinStorage } from '../hooks/usePinStorage'
import { RecommendationForm } from './RecommendationForm'
import { FsqImage } from './FsqImage'
import type { PinData } from '../lib/types'
import { loadGoogleMapsJs, type GoogleMapInstance, type GoogleMapsNs } from '@/lib/google/loadGoogleMapsJs'
import { createGoogleHtmlMarker, type GoogleHtmlMarkerHandle } from '@/components/map/googleHtmlMarker'
import { auth } from '@/lib/firebase'
import {
  buildGoogleMapsSearchUrl,
  openGoogleMapsNavigation,
} from '@/lib/openGoogleMapsNavigation'
import { sanitizePlaceDescription } from '@/lib/sanitizePlaceDescription'
import {
  genuineCommunityPhotoUrl,
  googlePlaceIdFromRecommendationFields,
} from '@/lib/recommendations/communityPhoto'
import { ArrowLeft } from 'lucide-react'
import {
  mappoBackButtonAbsoluteStyle,
  mappoBackButtonStyle,
  mappoHeaderBarStyle,
  mappoTitleImageStyle,
  mappoTitleSubtitleStyle,
} from '@/lib/mappoHeaderStyles'

/** Per-user (local) dismissal so removed items don’t keep reappearing. */
const RECS_DISMISSED_IDS_KEY = 'pinit-recommendations-dismissed-ids-v1'

interface Recommendation {
  id: string
  title: string
  description: string
  category: string
  location: {
    lat: number
    lng: number
  }
  rating: number
  isAISuggestion: boolean
  confidence: number
  reason: string
  timestamp: Date
  fallbackImage?: string // NEW: Fallback emoji when no Google photo available
  mediaUrl?: string // NEW: Image URL from Foursquare
  photoUrl?: string // Foursquare direct photo URL
  fsq_id?: string // Foursquare place ID
  googlePlaceId?: string
  placeId?: string
  placeKey?: string
  website?: string
  closedPermanently?: boolean
}

/** Stable place identity for map grouping (matches upsert-pin / upsert-ai placeKey intent). */
function placeIdentityKey(rec: Recommendation): string {
  const googlePlaceId =
    typeof rec.googlePlaceId === 'string' ? rec.googlePlaceId.trim() : ''
  const placeId = typeof rec.placeId === 'string' ? rec.placeId.trim() : ''
  const stablePlace = googlePlaceId || placeId
  if (stablePlace) return `place:${stablePlace}`

  const fsq = typeof rec.fsq_id === 'string' ? rec.fsq_id.trim() : ''
  if (fsq) return `fsq:${fsq}`

  const id = String(rec.id || '')
  if (id.startsWith('starter-')) {
    const suffix = id.slice('starter-'.length)
    if (suffix) return `place:${suffix}`
  }

  const lat = rec.location?.lat
  const lng = rec.location?.lng
  const title = (rec.title || '').trim().toLowerCase()
  if (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng)
  ) {
    return `coord:${lat.toFixed(6)},${lng.toFixed(6)}|t:${title}`
  }

  return `coord:unknown|t:${title || 'unknown'}`
}

function aiIdentityKey(rec: Pick<Recommendation, 'title' | 'location'>): string {
  const title = String(rec.title || '').trim().toLowerCase()
  const lat = rec.location?.lat
  const lng = rec.location?.lng
  if (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng)
  ) {
    return `${title}|${lat.toFixed(6)}|${lng.toFixed(6)}`
  }
  return `${title}|unknown`
}

const AI_SAME_PLACE_MAX_DISTANCE_M = 250

/** Same rule as lib/google/googlePlaces.hintMatches (accent/punctuation-insensitive). */
function normalizeAiPlaceName(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function aiPlaceNamesMatch(a: string | undefined, b: string | undefined): boolean {
  const left = normalizeAiPlaceName(a || '')
  const right = normalizeAiPlaceName(b || '')
  if (!left || !right) return false
  if (left === right) return true
  return left.includes(right) || right.includes(left)
}

function haversineDistanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371000
  const toRad = (x: number) => (x * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

function recFiniteCoords(
  rec: Pick<Recommendation, 'location'>
): { lat: number; lng: number } | null {
  const lat = rec.location?.lat
  const lng = rec.location?.lng
  if (
    typeof lat !== 'number' ||
    typeof lng !== 'number' ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  ) {
    return null
  }
  return { lat, lng }
}

/** AI-only: same real-world place when names match and coordinates are within 250 m. */
function aiSamePlaceByNameAndDistance(a: Recommendation, b: Recommendation): boolean {
  if (!aiPlaceNamesMatch(a.title, b.title)) return false
  const ac = recFiniteCoords(a)
  const bc = recFiniteCoords(b)
  if (!ac || !bc) return false
  return haversineDistanceMeters(ac, bc) <= AI_SAME_PLACE_MAX_DISTANCE_M
}

function trimPlaceKey(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

/** Fill missing identity/photo metadata only; keep existing user-facing fields. */
function enrichRecommendationIdentity(
  existing: Recommendation,
  incoming: Recommendation
): Recommendation {
  const placeKey = trimPlaceKey(existing.placeKey) || trimPlaceKey(incoming.placeKey)
  const googlePlaceId =
    googlePlaceIdFromRecommendationFields(existing) ||
    googlePlaceIdFromRecommendationFields(incoming)
  const existingPhoto =
    genuineCommunityPhotoUrl(existing.photoUrl) ||
    genuineCommunityPhotoUrl(existing.mediaUrl)
  const incomingPhoto =
    genuineCommunityPhotoUrl(incoming.photoUrl) ||
    genuineCommunityPhotoUrl(incoming.mediaUrl)
  const photo = existingPhoto || incomingPhoto

  let changed = false
  const next: Recommendation = { ...existing }

  if (placeKey && !trimPlaceKey(existing.placeKey)) {
    next.placeKey = placeKey
    changed = true
  }
  if (googlePlaceId) {
    if (!trimPlaceKey(existing.googlePlaceId)) {
      next.googlePlaceId = googlePlaceId
      changed = true
    }
    if (!trimPlaceKey(existing.placeId)) {
      next.placeId = googlePlaceId
      changed = true
    }
    const placeIdKey = `place:${googlePlaceId}`
    if (trimPlaceKey(existing.placeKey) !== placeIdKey) {
      next.placeKey = placeIdKey
      changed = true
    }
  }
  if (!existingPhoto && photo) {
    next.photoUrl = photo
    next.mediaUrl = photo
    changed = true
  }
  const incomingWebsite =
    typeof incoming.website === 'string' && incoming.website.trim().startsWith('http')
      ? incoming.website.trim()
      : undefined
  if (incomingWebsite && !trimPlaceKey(existing.website)) {
    next.website = incomingWebsite
    changed = true
  }

  return changed ? next : existing
}

function aiRecommendationsMatch(a: Recommendation, b: Recommendation): boolean {
  if (!a.isAISuggestion || !b.isAISuggestion) return false
  if (String(a.id || '') && String(a.id) === String(b.id)) return true
  if (aiIdentityKey(a) === aiIdentityKey(b)) return true
  const aPlace = googlePlaceIdFromRecommendationFields(a)
  const bPlace = googlePlaceIdFromRecommendationFields(b)
  if (aPlace && bPlace && aPlace === bPlace) return true
  return aiSamePlaceByNameAndDistance(a, b)
}

/** Community matches by id (Marras). AI also matches by title+coords / Place ID / name+250m. */
function findExistingRecommendation(
  prev: Recommendation[],
  incoming: Recommendation
): Recommendation | undefined {
  const id = String(incoming?.id || '')
  if (id) {
    const byId = prev.find((r) => String(r.id) === id)
    if (byId) return byId
  }
  if (!incoming.isAISuggestion) return undefined
  return prev.find((existing) => aiRecommendationsMatch(existing, incoming))
}

function canonicalRecommendationRank(rec: Recommendation): number {
  let rank = 0
  if (googlePlaceIdFromRecommendationFields(rec)) rank += 4
  if (genuineCommunityPhotoUrl(rec.photoUrl) || genuineCommunityPhotoUrl(rec.mediaUrl)) rank += 2
  if (typeof rec.website === 'string' && rec.website.trim().startsWith('http')) rank += 1
  return rank
}

/** Map/List selection identity → current object in canonical recommendations. Community: same id only. */
function resolveCanonicalRecommendation(
  canonical: Recommendation[],
  selector: Recommendation
): Recommendation | undefined {
  if (!selector.isAISuggestion) {
    const id = String(selector.id || '')
    return id
      ? canonical.find((r) => !r.isAISuggestion && String(r.id) === id)
      : undefined
  }
  const matches = canonical.filter((r) => aiRecommendationsMatch(r, selector))
  if (matches.length === 0) return undefined
  let best = matches[0]
  let bestRank = canonicalRecommendationRank(best)
  for (let i = 1; i < matches.length; i++) {
    const rank = canonicalRecommendationRank(matches[i])
    if (rank > bestRank) {
      best = matches[i]
      bestRank = rank
    }
  }
  return best
}

function resolveMarkerSelectionToCanonical(
  canonical: Recommendation[],
  selectors: Recommendation[]
): Recommendation[] {
  const seen = new Set<string>()
  const out: Recommendation[] = []
  for (const selector of selectors) {
    const resolved = resolveCanonicalRecommendation(canonical, selector)
    if (!resolved) continue
    const id = String(resolved.id || '')
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push(resolved)
  }
  return out
}

const REC_TRACE_PREFIX = '[RECOMMENDATION-TRACE]'
const REC_TRACE_STORAGE_KEY = 'recommendation-trace-v1'
const REC_TRACE_STORAGE_KEY_LEGACY = 'cafe-felix-trace-v1'
const recTraceBuffer: string[] = []
const recTraceListeners = new Set<() => void>()

function tracedPlaceKey(title: string | undefined): 'cafe-felix' | 'marras-wines' | null {
  const n = normalizeAiPlaceName(title || '')
  if (n.includes('cafe felix')) return 'cafe-felix'
  if (n.includes('marras wines') || n === 'marras') return 'marras-wines'
  return null
}

function isTracedPlaceRec(rec: { title?: string } | null | undefined): boolean {
  return tracedPlaceKey(rec?.title) != null
}

function recTraceSnapshot(rec: Recommendation) {
  return {
    tracePlace: tracedPlaceKey(rec.title),
    id: rec.id,
    title: rec.title,
    lat: rec.location?.lat ?? null,
    lng: rec.location?.lng ?? null,
    googlePlaceId: rec.googlePlaceId ?? null,
    placeId: rec.placeId ?? null,
    placeKey: rec.placeKey ?? null,
    photoUrl: rec.photoUrl ?? null,
    mediaUrl: rec.mediaUrl ?? null,
    website: rec.website ?? null,
    isAISuggestion: rec.isAISuggestion === true,
  }
}

function pushRecTrace(stage: string, payload: unknown) {
  const body =
    typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2)
  const line = `${REC_TRACE_PREFIX} ${stage}\n${body}`
  console.log(REC_TRACE_PREFIX, stage, payload)
  recTraceBuffer.push(`${new Date().toISOString()} ${line}`)
  if (recTraceBuffer.length > 250) {
    recTraceBuffer.splice(0, recTraceBuffer.length - 250)
  }
  if (typeof window !== 'undefined') {
    const w = window as Window & {
      __RECOMMENDATION_TRACE__?: string[]
      __CAFE_FELIX_TRACE__?: string[]
    }
    w.__RECOMMENDATION_TRACE__ = recTraceBuffer
    w.__CAFE_FELIX_TRACE__ = recTraceBuffer
    const joined = recTraceBuffer.join('\n\n')
    try {
      sessionStorage.setItem(REC_TRACE_STORAGE_KEY, joined)
      sessionStorage.setItem(REC_TRACE_STORAGE_KEY_LEGACY, joined)
    } catch {
      // ignore quota
    }
  }
  recTraceListeners.forEach((fn) => fn())
}

function recTraceDistanceMeters(a: Recommendation, b: Recommendation): number | null {
  const ac = recFiniteCoords(a)
  const bc = recFiniteCoords(b)
  if (!ac || !bc) return null
  return Math.round(haversineDistanceMeters(ac, bc))
}

function recTraceRejectReason(selector: Recommendation, candidate: Recommendation): string {
  if (!selector.isAISuggestion) {
    if (candidate.isAISuggestion) return 'rejected: community selector vs AI candidate'
    if (String(selector.id || '') && String(selector.id) === String(candidate.id)) {
      return 'match: community same id'
    }
    return `rejected: community id mismatch (${selector.id} vs ${candidate.id})`
  }
  if (!candidate.isAISuggestion) return 'rejected: not AI'
  if (String(selector.id || '') && String(selector.id) === String(candidate.id)) return 'match: same id'
  if (aiIdentityKey(selector) === aiIdentityKey(candidate)) return 'match: aiIdentityKey'
  const aPlace = googlePlaceIdFromRecommendationFields(selector)
  const bPlace = googlePlaceIdFromRecommendationFields(candidate)
  if (aPlace && bPlace && aPlace === bPlace) return 'match: Place ID'
  if (!aiPlaceNamesMatch(selector.title, candidate.title)) {
    return `rejected: names do not match (${normalizeAiPlaceName(selector.title)} vs ${normalizeAiPlaceName(candidate.title)})`
  }
  const dist = recTraceDistanceMeters(selector, candidate)
  if (dist == null) return 'rejected: missing coordinates'
  if (dist > AI_SAME_PLACE_MAX_DISTANCE_M) {
    return `rejected: distance ${dist}m > ${AI_SAME_PLACE_MAX_DISTANCE_M}m`
  }
  return `match: name+distance (${dist}m)`
}

function recTraceWouldMatch(selector: Recommendation, candidate: Recommendation): boolean {
  if (!selector.isAISuggestion) {
    return !candidate.isAISuggestion && String(selector.id || '') === String(candidate.id || '')
  }
  return aiRecommendationsMatch(selector, candidate)
}

function recTraceExplainResolve(selector: Recommendation, canonical: Recommendation[]) {
  const place = tracedPlaceKey(selector.title)
  const candidates = canonical.filter((row) => tracedPlaceKey(row.title) === place)
  const chosen = resolveCanonicalRecommendation(canonical, selector)
  return {
    tracePlace: place,
    selector: recTraceSnapshot(selector),
    gItemId: selector.id,
    selectorNormalizedName: normalizeAiPlaceName(selector.title),
    candidates: candidates.map((candidate) => ({
      ...recTraceSnapshot(candidate),
      normalizedName: normalizeAiPlaceName(candidate.title),
      distanceMeters: recTraceDistanceMeters(selector, candidate),
      richness: canonicalRecommendationRank(candidate),
      why: recTraceRejectReason(selector, candidate),
      wouldMatch: recTraceWouldMatch(selector, candidate),
      chosen: !!chosen && String(chosen.id) === String(candidate.id),
    })),
    chosen: chosen ? recTraceSnapshot(chosen) : null,
    chosenId: chosen?.id ?? null,
  }
}

const REC_TRACE_BUCKET_DEG = 0.0045
const CAFE_FELIX_DIAG_LAT = -33.3833536
const CAFE_FELIX_DIAG_LNG = 18.8912034

function recTraceAreaKey(lat: number, lng: number): string {
  const iLat = Math.round(lat / REC_TRACE_BUCKET_DEG)
  const iLng = Math.round(lng / REC_TRACE_BUCKET_DEG)
  return `${(iLat * REC_TRACE_BUCKET_DEG).toFixed(4)},${(iLng * REC_TRACE_BUCKET_DEG).toFixed(4)}`
}

function recTraceNeighborAreaKeys(lat: number, lng: number): string[] {
  const iLat = Math.round(lat / REC_TRACE_BUCKET_DEG)
  const iLng = Math.round(lng / REC_TRACE_BUCKET_DEG)
  const keys: string[] = []
  for (let dLat = -1; dLat <= 1; dLat++) {
    for (let dLng = -1; dLng <= 1; dLng++) {
      keys.push(
        `${((iLat + dLat) * REC_TRACE_BUCKET_DEG).toFixed(4)},${((iLng + dLng) * REC_TRACE_BUCKET_DEG).toFixed(4)}`
      )
    }
  }
  return keys
}

function classifyCafeQueryFailure(serverTrace: any, clientHasToken: boolean): string {
  const cafe = serverTrace?.cafeFelix
  const uid = serverTrace?.uid ?? null
  const areaQueried = cafe?.areaQueried === true
  const encounters = Array.isArray(cafe?.documentsEncountered) ? cafe.documentsEncountered : []
  const rejectedAuth = encounters.some(
    (row: any) => row?.rejectionReason === 'ai_no_uid' || row?.rejectionReason === 'ai_uid_mismatch'
  )
  const accepted = encounters.some((row: any) => row?.accepted === true)
  const noAuth = !uid || !clientHasToken
  if (!areaQueried && noAuth) return 'A+B'
  if (!areaQueried) return 'B'
  if (areaQueried && rejectedAuth && !accepted) return 'A'
  if (accepted) return 'OTHER: Café a_* was accepted by query'
  if (areaQueried && encounters.length === 0) {
    return 'OTHER: Café area queried, but a_* not in itemsSnap (limit/cell mismatch)'
  }
  return `OTHER: ${String(cafe?.classifiedFailure || cafe?.conclusion || 'unclassified')}`
}

function RecTracePanel() {
  const [open, setOpen] = useState(false)
  const [copyState, setCopyState] = useState('')
  const [, setTick] = useState(0)
  useEffect(() => {
    const onChange = () => setTick((n) => n + 1)
    recTraceListeners.add(onChange)
    return () => {
      recTraceListeners.delete(onChange)
    }
  }, [])
  const text = recTraceBuffer.join('\n\n')
  const count = recTraceBuffer.length
  return (
    <div
      style={{
        position: 'fixed',
        right: 8,
        bottom: 8,
        zIndex: 99999,
        maxWidth: '92vw',
        fontFamily: 'ui-monospace, monospace',
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          background: '#111827',
          color: '#fde68a',
          border: '1px solid #f59e0b',
          borderRadius: 999,
          padding: '8px 12px',
          fontSize: 12,
          fontWeight: 800,
          cursor: 'pointer',
        }}
      >
        REC TRACE ({count})
      </button>
      {open ? (
        <div
          style={{
            marginTop: 8,
            width: 'min(420px, 92vw)',
            maxHeight: '55vh',
            background: 'rgba(17,24,39,0.96)',
            color: '#e5e7eb',
            border: '1px solid #f59e0b',
            borderRadius: 12,
            padding: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 800, color: '#fde68a' }}>
            Temporary query-gate diagnostics (Café Felix + Marras). Open Discover, then copy GATE_CLASSIFICATION. Does not change recommendations.
          </div>
          <textarea
            readOnly
            value={text || 'No [RECOMMENDATION-TRACE] lines yet. Open Discover, then tap Marras Wines or Café Felix.'}
            style={{
              width: '100%',
              height: 220,
              fontSize: 10,
              background: '#030712',
              color: '#fef3c7',
              border: '1px solid #374151',
              borderRadius: 8,
              padding: 8,
            }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(text)
                  setCopyState('copied')
                } catch {
                  setCopyState('select-all in the box and copy')
                }
              }}
              style={{
                flex: 1,
                background: '#f59e0b',
                color: '#111827',
                border: 0,
                borderRadius: 8,
                padding: '8px 10px',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Copy trace
            </button>
            <button
              type="button"
              onClick={() => {
                recTraceBuffer.splice(0, recTraceBuffer.length)
                try {
                  sessionStorage.removeItem(REC_TRACE_STORAGE_KEY)
                  sessionStorage.removeItem(REC_TRACE_STORAGE_KEY_LEGACY)
                } catch {
                  // ignore
                }
                setCopyState('')
                recTraceListeners.forEach((fn) => fn())
              }}
              style={{
                background: 'transparent',
                color: '#fde68a',
                border: '1px solid #f59e0b',
                borderRadius: 8,
                padding: '8px 10px',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Clear
            </button>
          </div>
          {copyState ? (
            <div style={{ fontSize: 11, color: '#fde68a' }}>{copyState}</div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function buildDiscoverDetailShare(rec: Recommendation) {
  const title = rec.title || 'Check this place out'
  const placeId = googlePlaceIdFromRecommendationFields(rec)
  const shareUrl = buildGoogleMapsSearchUrl({
    latitude: rec.location?.lat,
    longitude: rec.location?.lng,
    placeName: title,
    placeId,
  })
  const shareText = `${title}\nThought you might like this place!\n📍 Open in Google Maps:\n${shareUrl}\nShared from Mappo`
  return { title, shareUrl, shareText }
}

const discoverDetailShareBtn: React.CSSProperties = {
  background: 'rgba(79,59,43,0.08)',
  border: '1px solid rgba(79,59,43,0.15)',
  color: '#4f3b2b',
  fontWeight: 900,
  padding: '0.7rem 0.9rem',
  borderRadius: 12,
  cursor: 'pointer',
  textDecoration: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
}

interface ClusteredPin {
  id: string
  location: { lat: number; lng: number }
  count: number
  recommendations: Recommendation[]
  category: string
}

/** List: photoUrl → mediaUrl → FsqImage → emoji → 📍. Detail adds detailImageUrl before emoji. */
function RecommendationHeroImage({
  rec,
  variant = 'list',
  detailImageUrl,
}: {
  rec: Recommendation
  variant?: 'list' | 'detail'
  detailImageUrl?: string | null
}) {
  const isDetail = variant === 'detail'
  const resolvedDetailUrl =
    isDetail && detailImageUrl && genuineCommunityPhotoUrl(detailImageUrl)
      ? genuineCommunityPhotoUrl(detailImageUrl) || null
      : null
  const recPhotoUrl = genuineCommunityPhotoUrl(rec.photoUrl)
  const recMediaUrl = genuineCommunityPhotoUrl(rec.mediaUrl)
  const hasUrlImage = !!(recPhotoUrl || recMediaUrl || resolvedDetailUrl)

  const containerStyle: React.CSSProperties = isDetail
    ? {
        width: '100%',
        height: '300px',
        borderRadius: '16px',
        background: 'rgba(79,59,43,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative',
      }
    : {
        width: '60px',
        height: '100%',
        borderRadius: '12px',
        background: 'rgba(79,59,43,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '24px',
        border: '1px solid rgba(79,59,43,0.1)',
        overflow: 'hidden',
        flexShrink: 0,
        position: 'relative',
        minHeight: '60px',
      }

  const fallbackEmojiSize = isDetail ? '4rem' : rec.fallbackImage ? '32px' : '20px'
  const pinEmojiSize = isDetail ? '4rem' : '20px'

  const imgCoverStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  }

  const onImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.currentTarget
    target.style.display = 'none'
    const fallback = target.parentElement?.querySelector(
      '.image-fallback'
    ) as HTMLElement
    if (fallback) fallback.style.display = 'flex'
  }

  const urlImage =
    recPhotoUrl ? (
      <img src={recPhotoUrl} alt={rec.title} style={imgCoverStyle} onError={onImgError} />
    ) : recMediaUrl ? (
      <img src={recMediaUrl} alt={rec.title} style={imgCoverStyle} onError={onImgError} />
    ) : resolvedDetailUrl ? (
      <img src={resolvedDetailUrl} alt={rec.title} style={imgCoverStyle} onError={onImgError} />
    ) : null

  return (
    <div style={containerStyle}>
      {urlImage}
      {!isDetail && !recPhotoUrl && !recMediaUrl && rec.fsq_id ? (
        <FsqImage
          fsqId={rec.fsq_id}
          lat={rec.location?.lat}
          lng={rec.location?.lng}
          alt={rec.title}
          fill
          style={{ objectFit: 'cover' }}
        />
      ) : null}

      <div
        className="image-fallback"
        style={{
          display: hasUrlImage ? 'none' : 'flex',
          width: '100%',
          height: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          position: hasUrlImage ? 'absolute' : 'relative',
          top: 0,
          left: 0,
          background: rec.fallbackImage ? 'transparent' : 'rgba(79,59,43,0.08)',
        }}
      >
        {rec.fallbackImage ? (
          <span style={{ fontSize: fallbackEmojiSize }}>{rec.fallbackImage}</span>
        ) : (
          <span style={{ fontSize: pinEmojiSize }}>📍</span>
        )}
      </div>
    </div>
  )
}

interface AIRecommendationsHubProps {
  onBack: () => void
  /** Same addPin as app/page.tsx so Library sees saves in-session. */
  addPin: (pin: PinData) => boolean
  /** Parent popstate: return true if back was consumed (e.g. detail overlay closed). */
  onRegisterSystemBack?: (handler: (() => boolean) | null) => void
  userLocation?: any
  // NEW: Receive recommendations from parent component
  initialRecommendations?: Recommendation[]
  onSharePin?: (pin: PinData) => void
  // Pin editing props
  editingPin?: any
  editingPinLocation?: { lat: number; lng: number } | null
  onPinLocationUpdate?: (lat: number, lng: number) => void
  onPinEditDone?: () => void
  onPinEditCancel?: () => void
}

export default function AIRecommendationsHub({ 
  onBack, 
  addPin: addPinToLibrary,
  onRegisterSystemBack,
  userLocation, 
  initialRecommendations,
  onSharePin,
  editingPin,
  editingPinLocation,
  onPinLocationUpdate,
  onPinEditDone,
  onPinEditCancel
}: AIRecommendationsHubProps) {
  const [viewMode, setViewMode] = useState<"map" | "list" | "insights">("map")
  const { insights, getLearningStatus, getPersonalizedRecommendations } = useAIBehaviorTracker()
  const { location: hookLocation, watchLocation, getCurrentLocation } = useLocationServices()
  const { addPin } = usePinStorage()
  const [learningProgress, setLearningProgress] = useState<any>(null)
  const [selectedRecommendation, setSelectedRecommendation] = useState<any>(null)
  const [showReadOnlyRecommendation, setShowReadOnlyRecommendation] = useState(false)
  const [detailImageUrl, setDetailImageUrl] = useState<string | null>(null)
  const [showDetailShareOptions, setShowDetailShareOptions] = useState(false)
  const [showRecommendationForm, setShowRecommendationForm] = useState(false)
  const [recommendationFormData, setRecommendationFormData] = useState<{
    mediaUrl: string
    locationName: string
    placeDescription?: string | null
  } | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isDiscoverMapLoading, setIsDiscoverMapLoading] = useState(true)

  // NEW: Add ref to track the user location marker
  
  // Use passed userLocation if available, otherwise fall back to hook location
  const location = userLocation || hookLocation
  
  // Initialize component when location becomes available
  useEffect(() => {
    // Handle both location formats: {latitude, longitude} or {lat, lng}
    const lat = location?.latitude || location?.lat
    const lng = location?.longitude || location?.lng
    if (location && lat && lng && !isInitialized) {
      console.log('🧠 AIRecommendationsHub: Initializing with location:', location)
      console.log('[Discover Debug] Discover startup userLocation', {
        lat,
        lng,
        source: userLocation ? 'userLocation prop' : 'hookLocation',
      })
      setIsInitialized(true)
    }
  }, [location, isInitialized])
  
  // Map view - Google Maps implementation
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<GoogleMapInstance | null>(null)
  const googleMapsNsRef = useRef<GoogleMapsNs | null>(null)
  const discoverMapLoadCancelledRef = useRef(false)
  const recommendationMarkersRef = useRef<GoogleHtmlMarkerHandle[]>([])
  const poiMarkersRef = useRef<Map<string, GoogleHtmlMarkerHandle>>(new Map())
  const userMarkerRef = useRef<GoogleHtmlMarkerHandle | null>(null)
  const isMapInitializedRef = useRef<boolean>(false)
  const discoverMapTilesLoadedRef = useRef<boolean>(false)
  const lastLocationCoordsRef = useRef<{ lat: number; lng: number } | null>(null)
  
  // AI Recommendations
  const [recommendations, setRecommendations] = useState<Recommendation[]>(initialRecommendations || [])
  const recommendationMarkerSignature = useMemo(
    () =>
      recommendations
        .map((r) => `${r.id}:${r.location?.lat}:${r.location?.lng}`)
        .join('|'),
    [recommendations]
  )
  const [clusteredPins, setClusteredPins] = useState<ClusteredPin[]>([])
  const [dismissedRecommendationIds, setDismissedRecommendationIds] = useState<Set<string>>(() => new Set())
  
  // NEW: Load cached recommendations - will be defined after getLocationCacheKey and clusterPins
  
  // Marker/cluster List is a view of canonical `recommendations`, keyed by selection identity.
  const [markerSelectionItems, setMarkerSelectionItems] = useState<Recommendation[]>([])
  const filteredRecommendations = useMemo(
    () => resolveMarkerSelectionToCanonical(recommendations, markerSelectionItems),
    [recommendations, markerSelectionItems]
  )
  const recTraceCanonicalSigRef = useRef('')
  const [isShowingCluster, setIsShowingCluster] = useState(false)
  const [currentCluster, setCurrentCluster] = useState<ClusteredPin | null>(null)
  
  // NEW: State for filtering by User vs AI recommendations
  const [recommendationFilter, setRecommendationFilter] = useState<"all" | "user" | "ai">("all")

  // Shared clustering logic (exact coordinate grouping).
  // Defined here so it can be used before the hook-defined `clusterPins`.
  function clusterPinsImpl(pins: Recommendation[]) {
    const clustersByKey = new Map<string, ClusteredPin>()
    const validPins = pins.filter((pin) => {
      if (
        !pin.location ||
        !pin.location.lat ||
        !pin.location.lng ||
        !isFinite(pin.location.lat) ||
        !isFinite(pin.location.lng)
      ) {
        return false
      }
      return true
    })

    validPins.forEach((pin) => {
      const key = `${pin.location.lat.toFixed(6)},${pin.location.lng.toFixed(6)}`
      const existing = clustersByKey.get(key)
      if (existing) {
        existing.recommendations.push(pin)
        existing.count = existing.recommendations.length
        if (pin.category && !existing.category.includes(pin.category)) {
          existing.category = existing.category ? `${existing.category}, ${pin.category}` : pin.category
        }
      } else {
        clustersByKey.set(key, {
          id: `cluster-${pin.id}`,
          location: pin.location,
          count: 1,
          recommendations: [pin],
          category: pin.category || 'general'
        })
      }
    })

    return Array.from(clustersByKey.values())
  }

  /** Merge incoming into prev. Community: by id (Marras). AI: also by title+coords / Place ID. */
  function mergeRecommendationsById(
    prev: Recommendation[],
    incoming: Recommendation[]
  ): Recommendation[] {
    const byId = new Map(prev.map((r) => [String(r.id), r]))
    const added: Recommendation[] = []
    for (const r of incoming) {
      const id = String(r?.id ?? '')
      if (!id) continue
      const existing = findExistingRecommendation(Array.from(byId.values()), r)
      if (existing) {
        const enriched = enrichRecommendationIdentity(existing, r)
        byId.set(String(existing.id), enriched)
        continue
      }
      byId.set(id, r)
      added.push(r)
    }
    return [...prev.map((r) => byId.get(String(r.id)) || r), ...added]
  }

  const getIdToken = useCallback(async (): Promise<string | null> => {
    try {
      const u: any = (auth as any)?.currentUser
      if (!u?.getIdToken) return null
      return await u.getIdToken()
    } catch {
      return null
    }
  }, [])

  const persistAIRecommendationsToServer = useCallback(
    async (items: Recommendation[]) => {
      if (!items || items.length === 0) return
      const token = await getIdToken()
      if (!token) return
      try {
        await fetch('/api/recommendations/upsert-ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            items: items
              .filter((r) => r.isAISuggestion)
              .map((r) => ({
                id: r.id,
                title: r.title,
                description: sanitizePlaceDescription(r.description),
                category: r.category,
                location: r.location,
                rating: r.rating,
                confidence: r.confidence,
                reason: r.reason,
                googlePlaceId: r.googlePlaceId,
                placeId: r.placeId,
                placeKey: r.placeKey,
                mediaUrl: r.mediaUrl || r.photoUrl,
                website: r.website,
                closedPermanently: r.closedPermanently === true,
              }))
          })
        })
      } catch {
        // ignore
      }
    },
    [getIdToken]
  )
  
  // NEW: Request management to prevent duplicate API calls
  const [isGeneratingRecommendations, setIsGeneratingRecommendations] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const lastRequestParamsRef = useRef<{lat: number, lng: number, timestamp: number} | null>(null)
  
  // NEW: Location-based recommendation cache for consistency
  const recommendationCacheRef = useRef<Map<string, { recommendations: Recommendation[], timestamp: number }>>(new Map())
  
  // Helper to create cache key from location (rounded to ~500m precision for consistency)
  const getLocationCacheKey = useCallback((lat: number, lng: number): string => {
    // Round to ~500m precision (0.0045 degrees ≈ 500m)
    const roundedLat = Math.round(lat / 0.0045) * 0.0045
    const roundedLng = Math.round(lng / 0.0045) * 0.0045
    return `${roundedLat.toFixed(4)},${roundedLng.toFixed(4)}`
  }, [])
  
  // NEW: Enhanced motion detection state with throttling
  const [isUserMoving, setIsUserMoving] = useState(false)
  const [lastMotionCheck, setLastMotionCheck] = useState(Date.now())
  const [lastLocationUpdate, setLastLocationUpdate] = useState(Date.now())
  
  // Google Maps marker code removed - migrating to Mapbox

  // NEW: Pin clustering function
  const clusterPins = useCallback((pins: Recommendation[]) => {
    const clustersByKey = new Map<string, ClusteredPin>()
    
    // Filter out pins without valid locations
    const validPins = pins.filter((pin) => {
      if (!pin.location || !pin.location.lat || !pin.location.lng || 
          !isFinite(pin.location.lat) || !isFinite(pin.location.lng)) {
        console.warn('🧠 Skipping pin without valid location:', pin.title || pin.id)
        return false
      }
      return true
    })
    
    console.log(`🧠 Clustering ${validPins.length} valid pins (filtered ${pins.length - validPins.length} invalid)`)
    
    // IMPORTANT: cluster by exact coordinate (rounded) so pins stay at their true location.
    // This avoids "nearby" clustering that can make a recommendation look misplaced.
    validPins.forEach((pin) => {
      const key = `${pin.location.lat.toFixed(6)},${pin.location.lng.toFixed(6)}`
      const existing = clustersByKey.get(key)
      if (existing) {
        existing.recommendations.push(pin)
        existing.count = existing.recommendations.length
        if (pin.category && !existing.category.includes(pin.category)) {
          existing.category = existing.category ? `${existing.category}, ${pin.category}` : pin.category
        }
      } else {
        clustersByKey.set(key, {
          id: `cluster-${pin.id}`,
          location: pin.location,
          count: 1,
          recommendations: [pin],
          category: pin.category || 'general'
        })
      }
    })
    
    const clusters = Array.from(clustersByKey.values())
    console.log(`🧠 Clustered ${pins.length} pins into ${clusters.length} clusters (exact coords)`)
    return clusters
  }, [])

  // Helper function to get POI icon based on category
  const getPOIIcon = useCallback((category: string = ''): string => {
    const cat = category.toLowerCase()
    if (cat.includes('restaurant') || cat.includes('food') || cat.includes('dining')) return '🍽️'
    if (cat.includes('cafe') || cat.includes('coffee')) return '☕'
    if (cat.includes('museum') || cat.includes('gallery') || cat.includes('art')) return '🎨'
    if (cat.includes('monument') || cat.includes('memorial') || cat.includes('landmark')) return '🏛️'
    if (cat.includes('park') || cat.includes('garden')) return '🌳'
    if (cat.includes('beach') || cat.includes('nature')) return '🏖️'
    if (cat.includes('hotel') || cat.includes('lodging')) return '🏨'
    if (cat.includes('church') || cat.includes('temple') || cat.includes('worship')) return '⛪'
    return '📍' // Default icon
  }, [])

  // Fetch POIs from pin-intel and display them on the map
  const fetchAndDisplayPOIs = useCallback(async (map: GoogleMapInstance, lat: number, lng: number) => {
    const mapsNs = googleMapsNsRef.current
    if (!mapsNs) return

    try {
      console.log('🏪 Fetching POIs for map display...')
      const response = await fetch('/api/pinit/pin-intel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lat: lat,
          lng: lng,
          precision: 5
        })
      })
      
      if (!response.ok) {
        console.warn('⚠️ Failed to fetch POIs:', response.status)
        return
      }
      
      const data = await response.json()
      const places = data.places || []
      
      console.log(`✅ Found ${places.length} POIs to display on map`)
      
      // Clear existing POI markers
      poiMarkersRef.current.forEach(marker => marker.remove())
      poiMarkersRef.current.clear()
      
      // Add markers for each POI (limit to 30 to avoid clutter)
      places.slice(0, 30).forEach((place: any) => {
        if (!place || !isFinite(place.lat) || !isFinite(place.lng)) return
        const category = place.categories?.[0] || ''
        const icon = getPOIIcon(category)
        
        // Create POI marker element. Hover scale lives on an inner node so it
        // does not overwrite the overlay's positioning transform.
        const poiElement = document.createElement('div')
        poiElement.style.width = '28px'
        poiElement.style.height = '28px'
        poiElement.style.display = 'flex'
        poiElement.style.alignItems = 'center'
        poiElement.style.justifyContent = 'center'
        poiElement.style.cursor = 'pointer'
        poiElement.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))'
        poiElement.title = place.name || category || 'POI'

        const poiInner = document.createElement('div')
        poiInner.style.fontSize = '20px'
        poiInner.style.lineHeight = '1'
        poiInner.style.transition = 'transform 0.2s ease'
        poiInner.textContent = icon
        poiElement.appendChild(poiInner)
        
        poiElement.addEventListener('mouseenter', () => {
          poiInner.style.transform = 'scale(1.3)'
        })
        poiElement.addEventListener('mouseleave', () => {
          poiInner.style.transform = 'scale(1)'
        })
        
        poiElement.addEventListener('click', () => {
          console.log('📍 POI clicked:', place.name)
        })
        
        const marker = createGoogleHtmlMarker(mapsNs, map, {
          lat: Number(place.lat),
          lng: Number(place.lng),
          element: poiElement,
        })
        
        poiMarkersRef.current.set(place.id || `poi-${Math.random().toString(36).substr(2, 9)}`, marker)
      })
      
      console.log(`✅ Added ${poiMarkersRef.current.size} POI markers to map`)
    } catch (error) {
      console.error('❌ Error fetching POIs for map:', error)
    }
  }, [getPOIIcon])

  // NEW: Function to fetch real place names from pin-intel gateway
  const fetchPlaceName = useCallback(async (lat: number, lng: number): Promise<{name: string, category: string, photoUrl?: string} | null> => {
    try {
      console.log('🧠 Fetching place name for coordinates:', lat, lng)
      
      // Call our pin-intel gateway
      const response = await fetch('/api/pinit/pin-intel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lat: lat,
          lng: lng,
          precision: 5
        })
      })
      
      if (!response.ok) {
        console.log('🧠 Pin-intel gateway error:', response.status)
        return null
      }
      
      const data = await response.json()
      console.log('🧠 Pin-intel gateway response:', data)
      
      if (data.places && data.places.length > 0) {
        const place = data.places[0] // Get the closest place
        return {
          name: place.name || data.geocode?.formatted || 'Unknown Place',
          category: place.categories?.[0] || 'general',
          photoUrl: data.imagery?.image_url || undefined
        }
      }
      
      // Fallback to just the geocoded address if no places found
      if (data.geocode?.formatted) {
        return {
          name: data.geocode.formatted,
          category: 'general',
          photoUrl: data.imagery?.image_url || undefined
        }
      }
      
      return null
    } catch (error) {
      console.log('🧠 Error fetching place name:', error)
      return null
    }
  }, [])

  // NEW: Fallback clipart system for when Google photos aren't available
  const getFallbackImage = useCallback((category: string): string => {
    const categoryMap: { [key: string]: string } = {
      // Food & Drink
      'restaurant': '🍽️',
      'cafe': '☕',
      'bar': '🍺',
      'bakery': '🥐',
      'food': '🍕',
      
      // Shopping
      'store': '🛍️',
      'shopping_mall': '🏬',
      'clothing_store': '👕',
      'jewelry_store': '💍',
      'book_store': '📚',
      
      // Entertainment
      'movie_theater': '🎬',
      'museum': '🏛️',
      'art_gallery': '🎨',
      'theater': '🎭',
      'amusement_park': '🎢',
      
      // Outdoor & Nature
      'park': '🌳',
      'natural_feature': '🏔️',
      'beach': '🏖️',
      'hiking_trail': '🥾',
      'garden': '🌺',
      
      // Health & Fitness
      'gym': '💪',
      'spa': '🧖‍♀️',
      'hospital': '🏥',
      'pharmacy': '💊',
      
      // Transportation
      'airport': '✈️',
      'train_station': '🚂',
      'bus_station': '🚌',
      'subway_station': '🚇',
      
      // Business & Services
      'bank': '🏦',
      'post_office': '📮',
      'library': '📖',
      'school': '🎓',
      'university': '🎓',
      
      // Accommodation
      'hotel': '🏨',
      'lodging': '🛏️',
      'campground': '⛺',
      
      // Default fallbacks
      'general': '📍',
      'adventure': '🗺️',
      'discovery': '🔍'
    }
    
    // Try to match the category, fall back to general if no match
    return categoryMap[category] || categoryMap['general']
  }, [])
  
  /** User recommendations from saved pins only — valid coordinates required; no mock padding (V1). */
  const getUserRecommendations = useCallback(async (): Promise<Recommendation[]> => {
    try {
      const pinsJson = localStorage.getItem('pinit-pins') || '[]'
      const pins: any[] = JSON.parse(pinsJson)

      const userRecommendedPins = pins.filter(
        (pin) => pin.isRecommended && !pin.isAISuggestion
      )

      const out: Recommendation[] = []
      for (const pin of userRecommendedPins) {
        const lat = pin.latitude
        const lng = pin.longitude
        if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng)) {
          continue
        }
        out.push({
          id: pin.id,
          title: pin.title || pin.locationName || 'User Recommendation',
          description: sanitizePlaceDescription(
            pin.description || pin.personalThoughts || 'A recommended place'
          ),
          category: pin.category || 'general',
          location: { lat, lng },
          rating: typeof pin.rating === 'number' && Number.isFinite(pin.rating) ? pin.rating : 4,
          isAISuggestion: false,
          confidence: 0,
          reason: 'Recommended by community',
          timestamp: new Date(pin.timestamp),
          photoUrl: genuineCommunityPhotoUrl(pin.mediaUrl),
          mediaUrl: genuineCommunityPhotoUrl(pin.mediaUrl),
          fallbackImage: genuineCommunityPhotoUrl(pin.mediaUrl)
            ? undefined
            : getFallbackImage(pin.category || 'general'),
          googlePlaceId: googlePlaceIdFromRecommendationFields({
            googlePlaceId: pin.googlePlaceId,
            placeId: pin.placeId,
            placeKey: pin.placeKey,
          }),
          placeId: googlePlaceIdFromRecommendationFields({
            googlePlaceId: pin.googlePlaceId,
            placeId: pin.placeId,
            placeKey: pin.placeKey,
          }),
          placeKey: trimPlaceKey(pin.placeKey),
        })
      }
      return out
    } catch (error) {
      console.error('Error loading user recommendations:', error)
      return []
    }
  }, [getFallbackImage])

  const recommendationsRef = useRef<Recommendation[]>(recommendations)
  useEffect(() => {
    recommendationsRef.current = recommendations
  }, [recommendations])

  useEffect(() => {
    const rows = recommendations.filter(isTracedPlaceRec)
    const sig = JSON.stringify(rows.map(recTraceSnapshot))
    if (sig === recTraceCanonicalSigRef.current) return
    recTraceCanonicalSigRef.current = sig
    pushRecTrace('CANONICAL', { count: rows.length, records: rows.map(recTraceSnapshot) })
  }, [recommendations])

  useEffect(() => {
    const selectorHits = markerSelectionItems.filter(isTracedPlaceRec)
    const rows = filteredRecommendations.filter(isTracedPlaceRec)
    if (selectorHits.length === 0 && rows.length === 0) return
    pushRecTrace('FILTERED_RECOMMENDATIONS', {
      selectorCount: selectorHits.length,
      count: rows.length,
      records: rows.map(recTraceSnapshot),
    })
  }, [filteredRecommendations, markerSelectionItems])

  useEffect(() => {
    if (!showReadOnlyRecommendation || !selectedRecommendation) return
    if (!isTracedPlaceRec(selectedRecommendation)) return
    pushRecTrace('DETAIL', recTraceSnapshot(selectedRecommendation))
  }, [showReadOnlyRecommendation, selectedRecommendation])

  const fillStarterInFlightRef = useRef(false)
  const fillStarterDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const PLACES_SEARCH_CATEGORIES =
    'restaurant,cafe,monument,museum,art_gallery,place_of_worship,tourism'

  const fillStarterRecommendationsIfNeeded = useCallback(async () => {
    const lat = Number(location?.latitude || location?.lat)
    const lng = Number(location?.longitude || location?.lng)
    const existingRecommendationCount = recommendationsRef.current.length

    console.log('[Discover Debug] starter fill check', {
      userLocationLat: lat,
      userLocationLng: lng,
      existingRecommendationCount,
    })

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      console.log('[Discover Debug] starter fill skipped: invalid lat/lng', { lat, lng })
      return
    }
    if (fillStarterInFlightRef.current) {
      console.log('[Discover Debug] starter fill skipped: already in flight')
      return
    }

    const visible = recommendationsRef.current.filter(
      (r) => !dismissedRecommendationIds.has(String(r.id))
    )
    const communityCount = visible.filter((r) => !r.isAISuggestion).length
    const starterCount = Math.max(0, 6 - communityCount)

    console.log('[Discover Debug] starter fill counts', {
      communityCount,
      existingRecommendationCount: visible.length,
      starterCountCalculated: starterCount,
    })

    if (communityCount >= 2) {
      console.log('[Discover Debug] starter fill skipped: communityCount >= 2', {
        communityCount,
      })
      return
    }

    if (starterCount === 0) {
      console.log('[Discover Debug] starter fill skipped: starterCount is 0', {
        communityCount,
      })
      return
    }

    const existingStarterCount = visible.filter((r) =>
      String(r.id).startsWith('starter-')
    ).length
    if (existingStarterCount >= starterCount) {
      console.log('[Discover Debug] starter fill skipped: enough starters already', {
        existingStarterCount,
        starterCount,
      })
      return
    }

    fillStarterInFlightRef.current = true
    const radius = 5000
    const limit = Math.min(50, starterCount + 4)
    const placesSearchUrl = `/api/places/search?lat=${lat}&lng=${lng}&radius=${radius}&limit=${limit}&categories=${PLACES_SEARCH_CATEGORIES}`

    console.log('[Discover Debug] /api/places/search request', {
      lat,
      lng,
      radius,
      categories: PLACES_SEARCH_CATEGORIES,
      limit,
      url: placesSearchUrl,
    })

    try {
      const response = await fetch(placesSearchUrl)
      let data: { pois?: unknown[]; error?: string } | null = null
      try {
        data = await response.json()
      } catch {
        data = null
      }

      if (!response.ok || (data?.error && String(data.error).includes('GEOAPIFY'))) {
        console.warn('[Discover] starter recommendations unavailable')
        console.log('[Discover Debug] starter fill ended: API unavailable', {
          responseOk: response.ok,
          error: data?.error,
        })
        return
      }

      const places = Array.isArray(data?.pois) ? data.pois : []
      const validCoordinatePlaces = places.filter((place: any) => {
        const placeLat = place?.location?.lat
        const placeLng = place?.location?.lng
        return (
          typeof placeLat === 'number' &&
          typeof placeLng === 'number' &&
          Number.isFinite(placeLat) &&
          Number.isFinite(placeLng)
        )
      })

      console.log('[Discover Debug] /api/places/search response', {
        placesReturned: places.length,
        validCoordinatePlaces: validCoordinatePlaces.length,
      })

      if (places.length === 0) {
        console.warn('[Discover] no nearby places returned')
        console.log('[Discover Debug] starter fill ended: zero places returned')
        return
      }

      const sortedPlaces = [...places].sort((a: any, b: any) =>
        String(a.id || '').localeCompare(String(b.id || ''))
      )

      const existingIds = new Set(
        recommendationsRef.current.map((r) => String(r.id))
      )
      const starters: Recommendation[] = []

      for (const place of sortedPlaces) {
        if (starters.length >= starterCount) break
        const placeLat = (place as any).location?.lat
        const placeLng = (place as any).location?.lng
        if (
          typeof placeLat !== 'number' ||
          typeof placeLng !== 'number' ||
          !Number.isFinite(placeLat) ||
          !Number.isFinite(placeLng)
        ) {
          continue
        }
        const placeId = (place as any).id || `${placeLat},${placeLng}`
        const id = `starter-${placeId}`
        if (dismissedRecommendationIds.has(id) || existingIds.has(id)) continue

        const category = (place as any).category || 'general'
        starters.push({
          id,
          title: (place as any).name || 'Nearby place',
          description: sanitizePlaceDescription(
            (place as any).description ||
              (category ? `${category} near you` : 'A place nearby')
          ),
          category,
          location: { lat: placeLat, lng: placeLng },
          rating: 4,
          isAISuggestion: true,
          confidence: 25,
          reason: 'Nearby discovery',
          timestamp: new Date(),
          fallbackImage: getFallbackImage(category),
        })
      }

      console.log('[Discover Debug] starter recommendations built', {
        starterRecommendationsBuilt: starters.length,
        starterCountTarget: starterCount,
      })

      if (starters.length === 0) {
        console.warn('[Discover] no nearby places returned')
        console.log('[Discover Debug] starter fill ended: zero starters built after filtering')
        return
      }

      setRecommendations((prev) => {
        const merged = mergeRecommendationsById(prev, starters)
        console.log('[Discover Debug] final recommendations count after merge', {
          before: prev.length,
          added: starters.length,
          after: merged.length,
        })
        return merged
      })
    } catch (err) {
      console.warn('[Discover] starter recommendations unavailable')
      console.log('[Discover Debug] starter fill ended: fetch error', { err })
    } finally {
      fillStarterInFlightRef.current = false
    }
  }, [
    dismissedRecommendationIds,
    getFallbackImage,
    location?.lat,
    location?.latitude,
    location?.lng,
    location?.longitude,
  ])

  const scheduleFillStarterRecommendations = useCallback(() => {
    console.log('[Discover Debug] starter fill scheduled', {
      existingRecommendationCount: recommendationsRef.current.length,
    })
    if (fillStarterDebounceRef.current) clearTimeout(fillStarterDebounceRef.current)
    fillStarterDebounceRef.current = setTimeout(() => {
      fillStarterDebounceRef.current = null
      void fillStarterRecommendationsIfNeeded()
    }, 50)
  }, [fillStarterRecommendationsIfNeeded])

  const loadRecommendationsFromServer = useCallback(async (reason: string = 'GPS_INIT') => {
    const lat = location?.latitude || location?.lat
    const lng = location?.longitude || location?.lng
    console.log('[Discover Debug] server load started', {
      userLocationLat: lat,
      userLocationLng: lng,
      existingRecommendationCount: recommendationsRef.current.length,
    })
    if (!lat || !lng) {
      console.log('[Discover Debug] server load skipped: missing lat/lng')
      return
    }
    try {
      const currentUser: any = (auth as any)?.currentUser
      const token = await getIdToken()
      const neighborAreaKeys = recTraceNeighborAreaKeys(Number(lat), Number(lng))
      const cafeAreaKey = recTraceAreaKey(CAFE_FELIX_DIAG_LAT, CAFE_FELIX_DIAG_LNG)
      pushRecTrace('QUERY_CLIENT_AUTH', {
        timestamp: new Date().toISOString(),
        gps: { lat, lng },
        authCurrentUserExists: !!currentUser,
        currentUserUid: currentUser?.uid ? String(currentUser.uid) : null,
        idTokenObtained: !!token,
        authorizationHeaderSent: !!token,
        hydrationReason: reason,
        cafeAreaKey,
        neighborAreaKeys,
        cafeAreaInNine: neighborAreaKeys.includes(cafeAreaKey),
      })
      const resp = await fetch(`/api/recommendations/query?lat=${lat}&lng=${lng}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      })
      if (!resp.ok) {
        console.log('[Discover Debug] server load failed', { status: resp.status })
        pushRecTrace('QUERY_SERVER', {
          httpStatus: resp.status,
          conclusion: 'query HTTP failed; cannot classify A/B from server itemsSnap',
        })
        scheduleFillStarterRecommendations()
        return
      }
      const data = await resp.json()
      const serverTrace = data?._recommendationQueryTrace
      if (serverTrace) {
        pushRecTrace('QUERY_SERVER', serverTrace)
        pushRecTrace('GATE_CLASSIFICATION', {
          classifiedFailure: classifyCafeQueryFailure(serverTrace, !!token),
          cafeAreaKey: serverTrace?.cafeFelix?.areaKey,
          cafeAreaQueried: serverTrace?.cafeFelix?.areaQueried,
          cafeConclusion: serverTrace?.cafeFelix?.conclusion,
          cafeDocumentsEncountered: serverTrace?.cafeFelix?.documentsEncountered,
          marrasAreaIncluded: serverTrace?.marras?.areaIncluded,
          marrasRichDocumentAccepted: serverTrace?.marras?.richDocumentAccepted,
          marrasDocumentsEncountered: serverTrace?.marras?.documentsEncountered,
          bearerReceived: serverTrace?.bearerReceived,
          tokenVerified: serverTrace?.tokenVerified,
          requestUid: serverTrace?.uid ?? null,
        })
      }
      const serverRecs: Recommendation[] = Array.isArray(data?.recommendations)
        ? data.recommendations
        : []
      const visible = serverRecs.filter(
        (r) => !dismissedRecommendationIds.has(String(r.id))
      )
      const tracedServer = serverRecs.filter(isTracedPlaceRec)
      const tracedVisible = visible.filter(isTracedPlaceRec)
      if (tracedServer.length > 0 || tracedVisible.length > 0) {
        pushRecTrace('SERVER/HYDRATION', {
          serverCount: tracedServer.length,
          visibleCount: tracedVisible.length,
          serverRecords: tracedServer.map(recTraceSnapshot),
          visibleRecords: tracedVisible.map(recTraceSnapshot),
        })
      }
      setRecommendations((prev) => {
        const merged = mergeRecommendationsById(prev, visible)
        const communityCount = merged.filter((r) => !r.isAISuggestion).length
        console.log('[Discover Debug] server merge complete', {
          serverReturned: serverRecs.length,
          mergedVisible: visible.length,
          finalRecommendationCount: merged.length,
          communityCount,
        })
        return merged
      })
      scheduleFillStarterRecommendations()
    } catch (err) {
      console.log('[Discover Debug] server load error', { err })
      scheduleFillStarterRecommendations()
    }
  }, [
    dismissedRecommendationIds,
    getIdToken,
    location?.lat,
    location?.latitude,
    location?.lng,
    location?.longitude,
    scheduleFillStarterRecommendations,
  ])

  // Firestore-backed recommendations (community + personalized AI) for this area.
  useEffect(() => {
    if (!isInitialized) return
    loadRecommendationsFromServer()
  }, [isInitialized, loadRecommendationsFromServer])

  // Get learning status when component mounts
  useEffect(() => {
    try {
      const learningStatus = getLearningStatus()
      setLearningProgress({
        level: learningStatus.isLearning ? 'Learning' : 'Beginner',
        progress: Math.min(learningStatus.confidence * 100, 100),
        pinsAnalyzed: learningStatus.totalBehaviors,
        confidence: Math.round(learningStatus.confidence * 100)
      })
    } catch (error) {
      console.log('🧠 AI not ready yet:', error)
      setLearningProgress({
        level: 'Beginner',
        progress: 0,
        pinsAnalyzed: 0,
        confidence: 0
      })
    }
  }, [getLearningStatus])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECS_DISMISSED_IDS_KEY)
      const arr = raw ? (JSON.parse(raw) as any) : []
      if (Array.isArray(arr)) {
        setDismissedRecommendationIds(new Set(arr.filter((v) => typeof v === 'string')))
      }
    } catch {
      setDismissedRecommendationIds(new Set())
    }
  }, [])

  const dismissRecommendation = useCallback((rec: Recommendation) => {
    const id = rec?.id ? String(rec.id) : ""
    if (!id) return

    setDismissedRecommendationIds((prev) => {
      const next = new Set(prev)
      next.add(id)
      try {
        localStorage.setItem(RECS_DISMISSED_IDS_KEY, JSON.stringify(Array.from(next)))
      } catch {
        // ignore
      }
      return next
    })

    // Update UI immediately. Marker List is derived from canonical recommendations.
    setRecommendations((prev) => prev.filter((r) => String(r.id) !== id))
    setMarkerSelectionItems((prev) =>
      prev.filter((selector) => {
        if (String(selector.id) === id) return false
        if (rec.isAISuggestion && selector.isAISuggestion && aiRecommendationsMatch(selector, rec)) {
          return false
        }
        return true
      })
    )
  }, [])

  // Debug location data
  useEffect(() => {
    console.log('🧠 AIRecommendationsHub: Location data received:', {
      userLocation,
      hookLocation,
      finalLocation: location,
      hasLatLng: location && location.latitude && location.longitude
    })
  }, [userLocation, hookLocation, location])
  
  // Initialize location watching and get current location
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      console.log('🧠 AIRecommendationsHub: Setting up location services...')
      
      // Get current location immediately
      getCurrentLocation({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0 // Always get fresh location
      }).then((locationData) => {
        console.log('🧠 AIRecommendationsHub: Got current location:', locationData)
      }).catch((error) => {
        console.log('🧠 AIRecommendationsHub: Location error:', error)
      })
      
      // Start watching for location changes
      if (location) {
        console.log('🧠 AIRecommendationsHub: Starting location watch...')
        watchLocation()
      }
    }
  }, [getCurrentLocation, watchLocation, location])

  // NEW: Update clusters whenever recommendations change
  useEffect(() => {
    if (recommendations.length > 0) {
      // ENHANCED: Don't process recommendations if user is moving
      if (isUserMoving) {
        console.log('🧠 Skipping cluster update - user is moving, recommendations will be processed when stationary')
        // Clear existing clusters when moving to prevent driving artifacts
        setClusteredPins([])
        return
      }
      
      const clusters = clusterPins(recommendations)
      setClusteredPins(clusters)
      console.log('🧠 Updated clusters:', clusters.length, 'clusters from', recommendations.length, 'recommendations')
    } else {
      console.log('🧠 No recommendations to cluster')
      setClusteredPins([])
    }
  }, [recommendations, clusterPins, isUserMoving])

  // Generate AI recommendations when location changes - with rate limiting
  useEffect(() => {
    if (location && location.latitude && location.longitude && insights && recommendations.length < 5 && isInitialized) { // Limit total recommendations
      // ENHANCED: Use the dedicated motion detection state
      if (isUserMoving) {
        console.log('🧠 Skipping recommendation generation - user is moving (motion state: true)')
        console.log('🧠 Use the 🔄 button to manually generate recommendations while moving')
        return
      }
      
      // ADDITIONAL SAFEGUARD: Double-check speed directly
      const currentSpeed = location.speed || 0
      if (currentSpeed > 1.5) {
        console.log('🧠 Additional safeguard: Speed check failed - user moving at', currentSpeed.toFixed(2), 'm/s')
        return
      }
      
      // CACHE CHECK: First check if we have cached recommendations for this location
      const cacheKey = getLocationCacheKey(location.latitude, location.longitude)
      const cached = recommendationCacheRef.current.get(cacheKey)
      const now = Date.now()
      
      // Use cached recommendations if available and recent (within 1 hour)
      if (cached && (now - cached.timestamp) < 3600000) {
        console.log('🧠 Using cached recommendations for location:', cacheKey)
        if (cached.recommendations.length > 0) {
          setRecommendations(cached.recommendations)
          const clusters = clusterPins(cached.recommendations)
          setClusteredPins(clusters)
          console.log(`✅ Loaded ${cached.recommendations.length} cached recommendations (${clusters.length} clusters)`)
        }
        return // Don't generate new recommendations if cache is valid
      }
      
      // Only generate new recommendations if we don't have many already
      // and if enough time has passed since last generation
      const lastGeneration = localStorage.getItem('last-ai-recommendation-time')
      const timeSinceLastGeneration = lastGeneration ? now - parseInt(lastGeneration) : 60000
      
      // Only generate new recommendations every 30 seconds minimum
      if (timeSinceLastGeneration < 30000) {
        console.log('🧠 Skipping recommendation generation - too soon since last batch')
        return
      }
      
      console.log('🧠 Generating new AI recommendations for location:', cacheKey)
      
      // Prevent duplicate requests - check if already generating
      if (isGeneratingRecommendations) {
        console.log('🧠 Recommendation generation already in progress, skipping...')
        return
      }
      
      // Check if we're making the same request (same location within 100m and within 5 seconds)
      const currentParams = {
        lat: Math.round(location.latitude * 1000) / 1000, // Round to ~100m precision
        lng: Math.round(location.longitude * 1000) / 1000,
        timestamp: now
      }
      if (lastRequestParamsRef.current && 
          lastRequestParamsRef.current.lat === currentParams.lat &&
          lastRequestParamsRef.current.lng === currentParams.lng &&
          (now - lastRequestParamsRef.current.timestamp) < 5000) {
        console.log('🧠 Duplicate request detected (same location, too soon), skipping...')
        return
      }
      
      setIsGeneratingRecommendations(true)
      lastRequestParamsRef.current = currentParams
      
      // Cancel any previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      abortControllerRef.current = new AbortController()
      const signal = abortControllerRef.current.signal
      
      const generateRecommendations = async () => {
        const aiRecs: Recommendation[] = []
        
        try {
            // Generate AI recommendations based on user preferences
            if (insights.userPersonality && insights.userPersonality.confidence > 0.3) {
              const categories = Object.entries(insights.userPersonality)
                .filter(([key, value]) => key !== 'confidence' && value === true)
                .map(([key]) => key.replace('is', '').toLowerCase())
              
              // Only generate 2-3 recommendations at a time, not continuously
              const numToGenerate = Math.min(2 + Math.floor(Math.random() * 2), categories.length)
              const shuffledCategories = categories.sort(() => 0.5 - Math.random()).slice(0, numToGenerate)
              
              // OPTIMIZED: Make a SINGLE API call for all categories instead of one per category
              try {
                console.log('🧠 Fetching travel places from pin-intel gateway (Foursquare) for all categories in one request...')
                // Use pin-intel gateway which already filters for travel-related POIs
                // Categories: restaurants, cafes, monuments, museums, art galleries, churches, tourism, etc.
                const response = await fetch(`/api/pinit/pin-intel`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    lat: location.latitude || location.lat,
                    lng: location.longitude || location.lng,
                    precision: 5
                  }),
                  signal // Add abort signal
                })
                
                if (signal.aborted) {
                  console.log('🧠 Request aborted')
                  return
                }
                
                if (response.ok) {
                  const data = await response.json()
                  const allPlaces = data.places || [] // pin-intel returns 'places', not 'pois'
                  console.log(`🧠 Fetched ${allPlaces.length} travel places from pin-intel gateway`)
                  
                  // Process each category from the same API response
                  // DETERMINISTIC: Sort places by ID for consistent selection (same region = same places)
                  const sortedPlaces = [...allPlaces].sort((a: any, b: any) => {
                    const idA = a.id || ''
                    const idB = b.id || ''
                    return idA.localeCompare(idB)
                  })
                  
                  for (const category of shuffledCategories) {
                    if (signal.aborted) break
                    
                    // Filter places by category preference - match category names from Foursquare
                    const categoryPlaces = sortedPlaces.filter((place: any) => {
                      const placeCategories = place.categories || []
                      const categoryStr = placeCategories.join(' ').toLowerCase() || place.category?.toLowerCase() || ''
                      const categoryLower = category.toLowerCase()
                      
                      return (
                        categoryStr.includes(categoryLower) ||
                        (categoryLower === 'food' && ['restaurant', 'cafe', 'food', 'dining', 'catering', 'coffee'].some(c => categoryStr.includes(c))) ||
                        (categoryLower === 'adventure' && ['activity', 'leisure', 'tourism', 'outdoor', 'sport'].some(c => categoryStr.includes(c))) ||
                        (categoryLower === 'culture' && ['entertainment', 'art', 'museum', 'theater', 'gallery', 'cultural', 'monument', 'historic'].some(c => categoryStr.includes(c))) ||
                        (categoryLower === 'nature' && ['park', 'natural', 'outdoor', 'garden', 'beach', 'hiking'].some(c => categoryStr.includes(c)))
                      )
                    })
                    
                    if (categoryPlaces.length > 0) {
                      // DETERMINISTIC: Use first place (sorted by ID) instead of random for consistency
                      // Same region will always get the same recommendations
                      const selectedPlace = categoryPlaces[0]
                      
                      // CRITICAL: Validate coordinates before adding recommendation
                      // Foursquare format: { lat, lng } directly on the place object
                      const placeLat = selectedPlace.lat || selectedPlace.location?.lat || selectedPlace.geometry?.location?.lat
                      const placeLng = selectedPlace.lng || selectedPlace.location?.lng || selectedPlace.geometry?.location?.lng
                      
                      // Skip places without valid coordinates
                      if (!placeLat || !placeLng || !isFinite(placeLat) || !isFinite(placeLng)) {
                        console.warn('🧠 Skipping place without valid coordinates:', selectedPlace.name)
                        continue
                      }
                      
                    // Foursquare doesn't provide photos in pin-intel response
                    const photoUrl = undefined
                      
                      // Use Foursquare's real name and categories
                      const placeTitle = selectedPlace.name || 'Interesting Place'
                      const placeCategories = selectedPlace.categories || []
                      const categoryStr = placeCategories.join(', ') || selectedPlace.category || category
                      const placeDescription = sanitizePlaceDescription(
                        `${categoryStr} • ${selectedPlace.distance_m ? `${selectedPlace.distance_m}m away` : 'Nearby'}`
                      )
                      
                      console.log(`🧠 AI Recommendation using Foursquare data for ${placeTitle}:`, {
                        categories: placeCategories,
                        category: categoryStr,
                        distance: selectedPlace.distance_m,
                        hasPhoto: !!photoUrl
                      })
                      
                      aiRecs.push({
                        id: `ai-${category}-${selectedPlace.id || Date.now()}`,
                        title: placeTitle,
                        description: placeDescription,
                        category: categoryStr,
                        location: {
                          lat: placeLat,
                          lng: placeLng,
                        },
                        rating: selectedPlace.rating || 4.0,
                        isAISuggestion: true,
                        confidence: Math.round(insights.userPersonality.confidence * 100),
                        reason: `Learned from your ${category} preferences`,
                        timestamp: new Date(),
                        fallbackImage: photoUrl ? undefined : getFallbackImage(selectedPlace.category || category),
                        photoUrl: photoUrl || undefined,
                        mediaUrl: photoUrl || undefined,
                        fsq_id: selectedPlace.id || undefined
                      } as Recommendation)
                    }
                  }
                }
              } catch (error: any) {
                if (error.name === 'AbortError') {
                  console.log('🧠 Request was aborted')
                  return
                }
                console.log(`🧠 Error fetching recommendations:`, error)
              }
            } else {
              // NEW USER FALLBACK: Generate local area recommendations when AI hasn't learned enough yet
              console.log('🧠 New user detected - generating local area recommendations')
              
              // API SAFEGUARD: Check if we've already made requests recently
              const lastRequestTime = localStorage.getItem('last-new-user-request')
              const timeSinceLastRequest = lastRequestTime ? now - parseInt(lastRequestTime) : Infinity
              
              // Only make API request if it's been at least 5 minutes since last request
              if (timeSinceLastRequest > 5 * 60 * 1000) {
                try {
                  console.log('🧠 Fetching local places for new user...')
                  
                  // Use Mapbox Search API with safeguards - focus on travel POIs
                  const response = await fetch(`/api/places/search?lat=${location.latitude || location.lat}&lng=${location.longitude || location.lng}&radius=5000&limit=5&categories=restaurant,cafe,monument,museum,art_gallery,place_of_worship,tourism`, {
                    signal // Add abort signal
                  })
                  
                  if (signal.aborted) {
                    console.log('🧠 Request aborted')
                    return
                  }
                
                if (response.ok) {
                  const data = await response.json()
                  // Mapbox Search returns {pois: [...]}
                  const places = data.pois || []
                  
                  // DETERMINISTIC: Sort places by ID for consistent selection
                  const sortedPlaces = [...places].sort((a: any, b: any) => {
                    const idA = a.id || ''
                    const idB = b.id || ''
                    return idA.localeCompare(idB)
                  })
                  
                  // Generate 3-4 recommendations from local places (deterministic - same places each time)
                  const numRecommendations = Math.min(4, sortedPlaces.length)
                  const selectedPlaces = sortedPlaces.slice(0, numRecommendations)
                  
                  for (const place of selectedPlaces) {
                    // Handle both new format (category) and old format (types)
                    const category = place.category || "general"
                    
                    // CRITICAL: Extract location coordinates - must have valid lat/lng or skip this place
                    const placeLat = place.location?.lat
                    const placeLng = place.location?.lng
                    
                    // Skip places without valid coordinates - don't fall back to user location!
                    if (!placeLat || !placeLng || !isFinite(placeLat) || !isFinite(placeLng)) {
                      console.warn('🧠 Skipping place without valid coordinates:', place.name, place)
                      continue
                    }
                    
                    // Mapbox doesn't provide photos, so no photoUrl
                    let photoUrl = undefined
                    
                    console.log(`🧠 Recommendation image for ${place.name}:`, {
                      hasPhotoUrl: false,
                      hasMediaUrl: false,
                      hasPhotosArray: false,
                      finalPhotoUrl: 'none',
                      id: place.id
                    })
                    
                    // Use Mapbox's real title and description - prioritize actual data over generic text
                    const placeTitle = place.name || 'Local Spot'
                    const placeDescription = sanitizePlaceDescription(
                      place.description ||
                        (place.category
                          ? `${place.category} near you`
                          : `A ${category.toLowerCase()} place nearby`)
                    )
                    
                    console.log(`🧠 New User Recommendation using Mapbox data for ${placeTitle}:`, {
                      hasDescription: !!place.description,
                      description: place.description?.substring(0, 50) + '...',
                      category: place.category || category,
                      hasPhoto: !!photoUrl
                    })
                    
                    aiRecs.push({
                      id: `new-user-${place.id}`,
                      title: placeTitle,
                      description: placeDescription, // Use real Mapbox description
                      category: place.category || category,
                      location: {
                        lat: placeLat,
                        lng: placeLng,
                      },
                      rating: place.rating || 4.0,
                      isAISuggestion: true,
                      confidence: 25, // Low confidence for new users
                      reason: "Local area discovery - exploring your neighborhood",
                      timestamp: new Date(),
                      fallbackImage: photoUrl ? undefined : getFallbackImage(place.category || category),
                      photoUrl: photoUrl || undefined,
                      mediaUrl: photoUrl || undefined, // Also set mediaUrl for compatibility
                      fsq_id: place.id || undefined
                    } as Recommendation)
                  }
                  
                  // Update last request time to prevent API loops
                  localStorage.setItem('last-new-user-request', now.toString())
                  console.log(`🧠 Generated ${aiRecs.length} local area recommendations for new user`)
                }
              } catch (error) {
                console.log('🧠 Error fetching local places for new user:', error)
              }
            } else {
              console.log('🧠 Skipping API request - too soon since last request (rate limiting)')
            }
          }
          
            // Add only 1-2 discovery recommendations (40% as specified, but limited)
            // OPTIMIZED: Reuse the same API response if we already fetched places above
            const discoveryCount = Math.min(1 + Math.floor(Math.random() * 2), 2)
            
            let discoveryPlaces: any[] = []
            
            // If we already fetched places for categories, reuse them for discovery
            if (insights.userPersonality && insights.userPersonality.confidence > 0.3) {
              // We already have places from the category fetch above - reuse them
              try {
                // Focus on travel-related POIs for discovery recommendations
                const response = await fetch(`/api/places/search?lat=${location.latitude || location.lat}&lng=${location.longitude || location.lng}&radius=5000&limit=30&categories=restaurant,cafe,monument,museum,art_gallery,place_of_worship,tourism`, {
                  signal
                })
                
                if (!signal.aborted && response.ok) {
                  const data = await response.json()
                  discoveryPlaces = data.pois || []
                  console.log(`🧠 Reusing Mapbox places for discovery: ${discoveryPlaces.length} places`)
                }
              } catch (error: any) {
                if (error.name !== 'AbortError') {
                  console.log('🧠 Error fetching discovery places:', error)
                }
              }
            } else {
              // For new users, fetch discovery places separately
              try {
                // Focus on travel-related POIs for discovery
                const discoveryResponse = await fetch(`/api/places/search?lat=${location.latitude || location.lat}&lng=${location.longitude || location.lng}&radius=3000&limit=10&categories=restaurant,cafe,monument,museum,art_gallery,place_of_worship,tourism`, {
                  signal
                })
                
                if (signal.aborted) {
                  console.log('🧠 Discovery request aborted')
                  return
                }
                
                if (discoveryResponse.ok) {
                  const discoveryData = await discoveryResponse.json()
                  discoveryPlaces = discoveryData.pois || []
                }
              } catch (error: any) {
                if (error.name === 'AbortError') {
                  console.log('🧠 Discovery request was aborted')
                  return
                }
                console.log('🧠 Error fetching discovery recommendations:', error)
              }
            }
            
            if (!signal.aborted) {
            
              // DETERMINISTIC: Sort discovery places by ID for consistent selection
              const sortedDiscoveryPlaces = [...discoveryPlaces].sort((a: any, b: any) => {
                const idA = a.id || ''
                const idB = b.id || ''
                return idA.localeCompare(idB)
              })
              
              // Select places from Mapbox results deterministically (same region = same places)
            for (let i = 0; i < discoveryCount; i++) {
              let placeTitle: string
              let placeDescription: string
              let recLat: number
              let recLng: number
              let photoUrl: string | undefined
              let fsqId: string | undefined
              let rating: number
              let category: string
              
              if (sortedDiscoveryPlaces.length > 0 && i < sortedDiscoveryPlaces.length) {
                // Use real Mapbox place (deterministic - same index = same place)
                const place = sortedDiscoveryPlaces[i]
                // CRITICAL: Use EXACT coordinates from Mapbox API
                recLat = place.location?.lat
                recLng = place.location?.lng
                
                // CRITICAL: Validate coordinates are exact and valid
                if (recLat && recLng && isFinite(recLat) && isFinite(recLng)) {
                  // Use EXACT coordinates from Mapbox (no rounding or approximation)
                  placeTitle = place.name || `Hidden Gem #${i + 1}`
                  placeDescription = sanitizePlaceDescription(
                    place.description ||
                      (place.category
                        ? `${place.category} near you`
                        : 'A place nearby')
                  )
                  category = place.category || 'adventure'
                  // DETERMINISTIC: Use fixed rating based on place ID instead of random
                  const placeId = place.id || ''
                  rating = place.rating || (3.5 + (placeId.charCodeAt(0) % 10) / 10) // Deterministic rating
                  fsqId = place.id
                  
                  // Mapbox doesn't provide photos
                  photoUrl = undefined
                  if (false && place.photos && Array.isArray(place.photos) && place.photos.length > 0) {
                    const firstPhoto = place.photos[0]
                    photoUrl = firstPhoto.url || firstPhoto.prefix || firstPhoto.href || firstPhoto.link
                  }
                  
                  console.log(`🧠 Discovery Recommendation using Mapbox data for ${placeTitle}:`, {
                    hasDescription: !!place.description,
                    description: place.description?.substring(0, 50) + '...',
                    category: category,
                    hasPhoto: !!photoUrl
                  })
                } else {
                  // Skip places without valid coordinates - don't use fallback random locations
                  console.warn('🧠 Skipping discovery place without valid coordinates:', place.title || place.name)
                  continue
                }
              } else {
                // No more places available - skip this discovery recommendation
                console.log('🧠 No more discovery places available, skipping')
                break
              }
              
              // CRITICAL: Use EXACT coordinates from Mapbox API (no approximation)
              aiRecs.push({
                id: `discovery-${fsqId || Date.now()}-${i}`, // Use place ID for deterministic IDs
                title: placeTitle,
                description: placeDescription,
                category: category,
                location: {
                  lat: recLat, // EXACT coordinate from Mapbox
                  lng: recLng  // EXACT coordinate from Mapbox
                },
                rating: rating,
                isAISuggestion: true,
                confidence: Math.round((insights.userPersonality?.confidence || 0.5) * 60),
                reason: "Discovery mode - expanding your horizons",
                timestamp: new Date(),
                fallbackImage: photoUrl ? undefined : getFallbackImage(category),
                photoUrl: photoUrl || undefined,
                mediaUrl: photoUrl || undefined,
                fsq_id: fsqId
              } as Recommendation)
            }
            }
            
            // Store the timestamp of this generation
            localStorage.setItem('last-ai-recommendation-time', now.toString())
            
            // CACHE: Store recommendations by location for consistency
            if (aiRecs.length > 0 && location && location.latitude && location.longitude) {
              const cacheKey = getLocationCacheKey(location.latitude, location.longitude)
              recommendationCacheRef.current.set(cacheKey, {
                recommendations: aiRecs,
                timestamp: now
              })
              console.log(`💾 Cached ${aiRecs.length} recommendations for location: ${cacheKey}`)
            }
            
            // Add new recommendations to existing ones (don't replace)
            setRecommendations((prev) => {
              const merged = mergeRecommendationsById(prev, aiRecs)
              const unresolved = merged.filter(
                (row) => row.isAISuggestion && !googlePlaceIdFromRecommendationFields(row)
              )
              const drop = new Set(
                unresolved.slice(0, Math.max(0, unresolved.length - 10)).map((row) => String(row.id))
              )
              return merged.filter((row) => !drop.has(String(row.id)))
            })

            // Persist AI recommendations to Firestore for cross-device consistency.
            // (Best-effort; silently ignored if user is not signed in.)
            persistAIRecommendationsToServer(aiRecs)
            
            // NEW: Update clustered pins whenever recommendations change
            setRecommendations(prev => {
              const updatedClusters = clusterPins(prev)
              setClusteredPins(updatedClusters)
              return prev
            })
            
            console.log(`🧠 Generated ${aiRecs.length} new AI recommendations (cached for consistency)`)
        } catch (error: any) {
          if (error.name === 'AbortError') {
            console.log('🧠 Request was aborted')
            return
          }
          console.log('🧠 Error in recommendation generation:', error)
          if (error.name === 'AbortError') {
            console.log('🧠 Recommendation generation aborted')
            return
          }
          console.log('🧠 Error generating recommendations:', error)
        } finally {
          setIsGeneratingRecommendations(false)
        }
      }
      
      generateRecommendations().catch((error) => {
        console.log('🧠 Error in recommendation generation effect:', error)
        setIsGeneratingRecommendations(false)
      })
    }
  }, [location, insights, recommendations.length, isInitialized, isGeneratingRecommendations, getLocationCacheKey, clusterPins, persistAIRecommendationsToServer]) // Added cache key and cluster functions

  // Load user recommendations on mount and location change
  useEffect(() => {
    if (location && location.latitude && location.longitude && isInitialized) {
      const loadUserRecs = async () => {
        try {
          const userRecs = await getUserRecommendations()
          const visible = userRecs.filter(
            (r) => !dismissedRecommendationIds.has(String(r.id))
          )
          if (visible.length > 0) {
            console.log(`👥 Loaded ${visible.length} user recommendations from pins`)
            setRecommendations((prev) => mergeRecommendationsById(prev, visible))
          }
          scheduleFillStarterRecommendations()
        } catch (error) {
          console.error('Error loading user recommendations:', error)
          scheduleFillStarterRecommendations()
        }
      }
      loadUserRecs()
    }
  }, [
    dismissedRecommendationIds,
    location,
    isInitialized,
    getUserRecommendations,
    scheduleFillStarterRecommendations,
  ])

  useEffect(() => {
    let cancelled = false
    const pendingPlaceIds: string[] = []
    const coordsByPlaceId = new Map<string, { lat: number; lng: number }>()

    for (const rec of recommendations) {
      if (genuineCommunityPhotoUrl(rec.photoUrl) || genuineCommunityPhotoUrl(rec.mediaUrl)) continue
      const placeId = googlePlaceIdFromRecommendationFields(rec)
      if (!placeId) continue
      if (communityPhotoByPlaceIdRef.current.has(placeId)) continue
      if (communityPhotoInFlightRef.current.has(placeId)) continue
      if (!pendingPlaceIds.includes(placeId)) pendingPlaceIds.push(placeId)
      const lat = rec.location?.lat
      const lng = rec.location?.lng
      if (
        typeof lat === 'number' &&
        typeof lng === 'number' &&
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        !coordsByPlaceId.has(placeId)
      ) {
        coordsByPlaceId.set(placeId, { lat, lng })
      }
    }

    const applyResolvedPhoto = (placeId: string, photoUrl: string | null) => {
      communityPhotoByPlaceIdRef.current.set(placeId, photoUrl)
      if (!photoUrl) return
      setRecommendations((prev) =>
        prev.map((rec) => {
          if (googlePlaceIdFromRecommendationFields(rec) !== placeId) return rec
          if (genuineCommunityPhotoUrl(rec.photoUrl) || genuineCommunityPhotoUrl(rec.mediaUrl)) return rec
          return { ...rec, photoUrl, mediaUrl: photoUrl }
        })
      )
      setSelectedRecommendation((prev: Recommendation | null) => {
        if (!prev) return prev
        if (googlePlaceIdFromRecommendationFields(prev) !== placeId) return prev
        if (genuineCommunityPhotoUrl(prev.photoUrl) || genuineCommunityPhotoUrl(prev.mediaUrl)) return prev
        return { ...prev, photoUrl, mediaUrl: photoUrl }
      })
    }

    for (const placeId of pendingPlaceIds) {
      communityPhotoInFlightRef.current.add(placeId)
      const coords = coordsByPlaceId.get(placeId)
      const params = new URLSearchParams({ placeId })
      if (coords) {
        params.set('lat', String(coords.lat))
        params.set('lng', String(coords.lng))
      }
      void fetch(`/api/recommendations/photo?${params.toString()}`)
        .then((resp) => resp.json())
        .then((data) => {
          const photoUrl = genuineCommunityPhotoUrl(data?.photoUrl) || null
          communityPhotoByPlaceIdRef.current.set(placeId, photoUrl)
          if (cancelled) return
          applyResolvedPhoto(placeId, photoUrl)
        })
        .catch(() => {
          communityPhotoByPlaceIdRef.current.set(placeId, null)
          if (cancelled) return
          applyResolvedPhoto(placeId, null)
        })
        .finally(() => {
          communityPhotoInFlightRef.current.delete(placeId)
        })
    }

    return () => {
      cancelled = true
    }
  }, [recommendations])

  useEffect(() => {
    if (viewMode !== 'list' && !showReadOnlyRecommendation) return

    const navToken = `${viewMode}|${showReadOnlyRecommendation ? 'detail' : 'list'}`
    if (aiIdentityNavTokenRef.current !== navToken) {
      aiIdentityTransientRef.current.clear()
      aiIdentityNavTokenRef.current = navToken
    }

    const pendingKeys: string[] = []
    const recByKey = new Map<string, Recommendation>()

    for (const rec of recommendations) {
      if (!rec.isAISuggestion) continue
      if (googlePlaceIdFromRecommendationFields(rec)) continue
      const title = String(rec.title || '').trim()
      const lat = rec.location?.lat
      const lng = rec.location?.lng
      if (
        !title ||
        typeof lat !== 'number' ||
        typeof lng !== 'number' ||
        !Number.isFinite(lat) ||
        !Number.isFinite(lng)
      ) {
        continue
      }
      const key = aiIdentityKey(rec)
      const prior = aiIdentityByKeyRef.current.get(key)
      // `limited` is not a confirmed miss — stale quota from the old Nearby path must not stick.
      if (prior && prior !== 'limited') continue
      if (aiIdentityInFlightRef.current.has(key)) continue
      if (aiIdentityTransientRef.current.has(key)) continue
      if (!pendingKeys.includes(key)) pendingKeys.push(key)
      if (!recByKey.has(key)) recByKey.set(key, rec)
    }

    const applyIdentity = (
      key: string,
      rec: Recommendation,
      data: {
        placeId: string
        photoUrl?: string | null
        website?: string | null
      }
    ) => {
      const placeId = String(data.placeId || '').trim()
      if (!placeId) return
      const photoUrl = genuineCommunityPhotoUrl(data.photoUrl)
      const website =
        typeof data.website === 'string' && data.website.trim().startsWith('http')
          ? data.website.trim()
          : undefined
      const stamp = (row: Recommendation): Recommendation => {
        if (aiIdentityKey(row) !== key && String(row.id) !== String(rec.id)) return row
        let next: Recommendation = {
          ...row,
          googlePlaceId: row.googlePlaceId || placeId,
          placeId: row.placeId || placeId,
          placeKey: row.placeKey?.startsWith('place:') ? row.placeKey : `place:${placeId}`,
        }
        if (photoUrl && !genuineCommunityPhotoUrl(next.photoUrl) && !genuineCommunityPhotoUrl(next.mediaUrl)) {
          next = { ...next, photoUrl, mediaUrl: photoUrl }
        }
        if (website && !next.website) next = { ...next, website }
        return next
      }
      persistAIRecommendationsToServer([stamp(rec)])
      if (!aiIdentityMountedRef.current) return
      setRecommendations((prev) => prev.map(stamp))
      setSelectedRecommendation((prev: Recommendation | null) => (prev ? stamp(prev) : prev))
    }

    for (const key of pendingKeys) {
      const rec = recByKey.get(key)
      if (!rec) continue
      aiIdentityInFlightRef.current.add(key)
      const params = new URLSearchParams({
        title: rec.title,
        lat: String(rec.location.lat),
        lng: String(rec.location.lng),
      })
      void fetch(`/api/recommendations/ai-identity?${params.toString()}`)
        .then((resp) => resp.json())
        .then((data) => {
          if (data?.closedPermanently) {
            aiIdentityByKeyRef.current.set(key, 'closed')
            persistAIRecommendationsToServer([{ ...rec, closedPermanently: true }])
            if (!aiIdentityMountedRef.current) return
            setRecommendations((prev) => prev.filter((row) => aiIdentityKey(row) !== key))
            setSelectedRecommendation((prev: Recommendation | null) => {
              if (!prev || aiIdentityKey(prev) !== key) return prev
              setShowReadOnlyRecommendation(false)
              setDetailImageUrl(null)
              setShowDetailShareOptions(false)
              return null
            })
            return
          }
          const placeId = typeof data?.placeId === 'string' ? data.placeId.trim() : ''
          if (data?.ok && placeId) {
            aiIdentityByKeyRef.current.set(key, placeId)
            applyIdentity(key, rec, {
              placeId,
              photoUrl: data.photoUrl,
              website: data.website,
            })
            return
          }
          const reason = typeof data?.reason === 'string' ? data.reason : ''
          if (reason === 'no_match') {
            aiIdentityByKeyRef.current.set(key, 'miss')
            return
          }
          // Transient: limiter/network/route/abort. Do not sticky-miss; later List/Detail may peek again.
          aiIdentityByKeyRef.current.delete(key)
          aiIdentityTransientRef.current.add(key)
        })
        .catch(() => {
          aiIdentityTransientRef.current.add(key)
        })
        .finally(() => {
          aiIdentityInFlightRef.current.delete(key)
        })
    }
  }, [recommendations, persistAIRecommendationsToServer, viewMode, showReadOnlyRecommendation])

  useEffect(() => {
    setSelectedRecommendation((prev: Recommendation | null) => {
      if (!prev) return prev
      const current = recommendations.find((r) => String(r.id) === String(prev.id))
      if (!current) return prev
      return enrichRecommendationIdentity(prev, current)
    })
  }, [recommendations])

  // Handle view mode changes
  const handleViewModeChange = (newViewMode: "map" | "list" | "insights") => {
    console.log('🗺️ Switching to view mode:', newViewMode)
    setViewMode(newViewMode)
  }

  const closeRecommendationDetail = useCallback(() => {
    setShowReadOnlyRecommendation(false)
    setDetailImageUrl(null)
    setShowDetailShareOptions(false)
  }, [])

  useEffect(() => {
    if (!onRegisterSystemBack) return
    onRegisterSystemBack(() => {
      if (showReadOnlyRecommendation) {
        closeRecommendationDetail()
        return true
      }
      return false
    })
    return () => onRegisterSystemBack(null)
  }, [onRegisterSystemBack, showReadOnlyRecommendation, closeRecommendationDetail])

  // Detail-only: lazy Wikimedia hero when recommendation has no photo URLs
  useEffect(() => {
    if (!showReadOnlyRecommendation || !selectedRecommendation) {
      setDetailImageUrl(null)
      return
    }

    if (genuineCommunityPhotoUrl(selectedRecommendation.photoUrl) || genuineCommunityPhotoUrl(selectedRecommendation.mediaUrl)) {
      setDetailImageUrl(null)
      return
    }

    const name = String(selectedRecommendation.title || '').trim()
    if (!name) {
      setDetailImageUrl(null)
      return
    }

    const lat = selectedRecommendation.location?.lat
    const lng = selectedRecommendation.location?.lng
    const params = new URLSearchParams({ name })
    if (typeof lat === 'number' && Number.isFinite(lat)) {
      params.set('lat', String(lat))
    }
    if (typeof lng === 'number' && Number.isFinite(lng)) {
      params.set('lng', String(lng))
    }

    let aborted = false
    setDetailImageUrl(null)

    fetch(`/api/wikimedia/resolve?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (aborted) return
        const url =
          typeof data?.imageUrl === 'string' ? data.imageUrl.trim() : ''
        if (
          url &&
          (url.startsWith('https://') || url.startsWith('http://'))
        ) {
          setDetailImageUrl(url)
        } else {
          setDetailImageUrl(null)
        }
      })
      .catch(() => {
        if (!aborted) setDetailImageUrl(null)
      })

    return () => {
      aborted = true
    }
  }, [
    showReadOnlyRecommendation,
    selectedRecommendation?.id,
    selectedRecommendation?.title,
    selectedRecommendation?.photoUrl,
    selectedRecommendation?.mediaUrl,
    selectedRecommendation?.location?.lat,
    selectedRecommendation?.location?.lng,
  ])

  const handleDetailHome = useCallback(() => {
    setShowReadOnlyRecommendation(false)
    onBack()
  }, [onBack])

  const centerDiscoverMapOnUser = useCallback(() => {
    const map = mapInstanceRef.current
    const lat = location?.latitude || location?.lat
    const lng = location?.longitude || location?.lng
    if (!map || !isMapInitializedRef.current) return
    if (typeof lat !== 'number' || typeof lng !== 'number') return
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return

    try {
      map.panTo({ lat, lng })
      map.setZoom(16)
      if (userMarkerRef.current) {
        userMarkerRef.current.setLngLat([lng, lat])
      }
    } catch {
      // ignore
    }
  }, [
    location?.latitude,
    location?.longitude,
    location?.lat,
    location?.lng,
  ])

  useEffect(() => {
    if (viewMode === 'map') {
      setIsDiscoverMapLoading(true)
      discoverMapTilesLoadedRef.current = false
    }
  }, [viewMode])

  const tryMarkDiscoverMapDisplayReady = useCallback(() => {
    if (!discoverMapTilesLoadedRef.current) return
    setIsDiscoverMapLoading(false)
  }, [])

  const lastRecommendationsSignatureRef = useRef<string>("")
  const communityPhotoByPlaceIdRef = useRef<Map<string, string | null>>(new Map())
  const communityPhotoInFlightRef = useRef<Set<string>>(new Set())
  const aiIdentityByKeyRef = useRef<Map<string, string>>(new Map())
  const aiIdentityInFlightRef = useRef<Set<string>>(new Set())
  const aiIdentityTransientRef = useRef<Set<string>>(new Set())
  const aiIdentityNavTokenRef = useRef('')
  const aiIdentityMountedRef = useRef(true)

  useEffect(() => {
    aiIdentityMountedRef.current = true
    return () => {
      aiIdentityMountedRef.current = false
    }
  }, [])

  // Function to update recommendation markers on map
  const updateRecommendationMarkers = useCallback((map: GoogleMapInstance) => {
    const mapsNs = googleMapsNsRef.current
    if (!mapsNs) return

    if (!recommendations || recommendations.length === 0) {
      recommendationMarkersRef.current.forEach((marker) => marker.remove())
      recommendationMarkersRef.current = []
      console.log('🗺️ No recommendations to display on map')
      lastRecommendationsSignatureRef.current = ""
      tryMarkDiscoverMapDisplayReady()
      return
    }

    // Apply map filter to reduce clutter.
    const visibleRecommendations =
      recommendationFilter === "all"
        ? recommendations
        : recommendations.filter((r) =>
            recommendationFilter === "ai" ? r.isAISuggestion === true : r.isAISuggestion !== true
          )

    if (!visibleRecommendations || visibleRecommendations.length === 0) {
      recommendationMarkersRef.current.forEach((marker) => marker.remove())
      recommendationMarkersRef.current = []
      console.log("🗺️ No visible recommendations for filter:", recommendationFilter)
      lastRecommendationsSignatureRef.current = `filter:${recommendationFilter}|empty`
      tryMarkDiscoverMapDisplayReady()
      return
    }

    const currentSignature =
      `filter:${recommendationFilter}|` +
      visibleRecommendations
        .map((r) => `${r.id}:${r.location?.lat}:${r.location?.lng}`)
        .sort()
        .join('|')

    if (currentSignature === lastRecommendationsSignatureRef.current) {
      if (recommendationMarkersRef.current.length > 0) {
        tryMarkDiscoverMapDisplayReady()
      }
      return
    }

    recommendationMarkersRef.current.forEach((marker) => marker.remove())
    recommendationMarkersRef.current = []
    lastRecommendationsSignatureRef.current = currentSignature

    // Group markers by place identity + type (user vs AI). Badge = times this place was recommended.
    type MarkerGroup = {
      key: string
      markerCoordKey: string
      isAISuggestion: boolean
      lat: number
      lng: number
      items: Recommendation[]
    }

    const groupsByKey = new Map<string, MarkerGroup>()
    const typeCoordToPresence = new Map<string, { user: boolean; ai: boolean }>()

    for (const rec of visibleRecommendations) {
      if (!rec.location || !isFinite(rec.location.lat) || !isFinite(rec.location.lng)) continue
      const lat0 = rec.location.lat
      const lng0 = rec.location.lng

      const typeKey = rec.isAISuggestion ? 'ai' : 'user'
      const identity = placeIdentityKey(rec)
      const key = `${typeKey}|${identity}`

      const existing = groupsByKey.get(key)
      if (existing) {
        existing.items.push(rec)
      } else {
        const markerCoordKey = `${lat0.toFixed(6)},${lng0.toFixed(6)}`
        const presence = typeCoordToPresence.get(markerCoordKey) || { user: false, ai: false }
        presence[typeKey] = true
        typeCoordToPresence.set(markerCoordKey, presence)

        groupsByKey.set(key, {
          key,
          markerCoordKey,
          isAISuggestion: !!rec.isAISuggestion,
          lat: lat0,
          lng: lng0,
          items: [rec],
        })
      }
    }

    const groups = Array.from(groupsByKey.values())
    for (const g of groups) {
      const markerSizePx = 22
      const hitTargetPx = 38

      const el = document.createElement("div")
      el.style.position = "relative"
      el.style.width = `${hitTargetPx}px`
      el.style.height = `${hitTargetPx}px`
      el.style.cursor = "pointer"
      el.style.display = "flex"
      el.style.alignItems = "center"
      el.style.justifyContent = "center"
      el.style.userSelect = "none"

      const dot = document.createElement("div")
      dot.style.width = `${markerSizePx}px`
      dot.style.height = `${markerSizePx}px`
      dot.style.borderRadius = "50%"
      dot.style.border = "1.5px solid rgba(255,255,255,0.92)"
      dot.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)"
      dot.style.background = g.isAISuggestion ? "rgba(59,130,246,0.95)" : "rgba(16,185,129,0.95)"
      dot.style.pointerEvents = "none"
      el.appendChild(dot)

      // If both types exist at the same coordinate, offset them slightly so both are visible.
      const presence = typeCoordToPresence.get(g.markerCoordKey)
      if (presence?.user && presence?.ai) {
        el.dataset.anchorOffsetX = g.isAISuggestion ? "8" : "-8"
      }

      el.title = `${g.items.length} ${g.isAISuggestion ? "AI" : "user"} recommendation${g.items.length === 1 ? "" : "s"}`

      if (g.items.length > 1) {
        const badge = document.createElement("div")
        badge.textContent = String(g.items.length)
        badge.style.position = "absolute"
        badge.style.top = "-6px"
        badge.style.right = "-6px"
        badge.style.minWidth = "16px"
        badge.style.height = "16px"
        badge.style.padding = "0 4px"
        badge.style.borderRadius = "999px"
        badge.style.background = "rgba(255,255,255,0.95)"
        badge.style.color = "#0f172a"
        badge.style.fontSize = "10px"
        badge.style.fontWeight = "800"
        badge.style.display = "flex"
        badge.style.alignItems = "center"
        badge.style.justifyContent = "center"
        badge.style.boxShadow = "0 2px 8px rgba(0,0,0,0.25)"
        badge.style.border = "1px solid rgba(15, 23, 42, 0.15)"
        el.appendChild(badge)
      }

      const marker = createGoogleHtmlMarker(mapsNs, map, {
        lat: g.lat,
        lng: g.lng,
        element: el,
      })

      el.addEventListener("click", () => {
        const tracedSelectors = g.items.filter(isTracedPlaceRec)
        if (tracedSelectors.length > 0) {
          const canonicalNow = recommendationsRef.current
          pushRecTrace('MARKER_CLICK', {
            gItems: g.items.map(recTraceSnapshot),
            selectors: tracedSelectors.map((selector) =>
              recTraceExplainResolve(selector, canonicalNow)
            ),
          })
        }
        // Keep selection identity only; List derives current objects from recommendations.
        setRecommendationFilter(g.isAISuggestion ? "ai" : "user")
        setMarkerSelectionItems(g.items)
        setIsShowingCluster(false)
        setCurrentCluster(null)
        setViewMode("list")
      })

      recommendationMarkersRef.current.push(marker)
    }

    console.log(`✅ Added ${recommendationMarkersRef.current.length} recommendation markers to Discover map`)
    tryMarkDiscoverMapDisplayReady()
  }, [recommendations, recommendationFilter, tryMarkDiscoverMapDisplayReady])

  // Effect A: create map once per Map visit when coords are available (no cleanup on GPS updates)
  useEffect(() => {
    if (viewMode !== "map" || !mapRef.current || isMapInitializedRef.current) return

    const lat = location?.latitude ?? location?.lat
    const lng = location?.longitude ?? location?.lng
    const coordsExist =
      typeof lat === "number" &&
      typeof lng === "number" &&
      Number.isFinite(lat) &&
      Number.isFinite(lng)
    if (!coordsExist) return

    const apiKey = (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "").trim()
    if (!apiKey) {
      console.error("❌ Google Maps API key is missing")
      setIsDiscoverMapLoading(false)
      return
    }

    if (mapInstanceRef.current) return

    lastLocationCoordsRef.current = { lat, lng }
    isMapInitializedRef.current = true
    discoverMapLoadCancelledRef.current = false

    const container = mapRef.current

    loadGoogleMapsJs(apiKey)
      .then((maps) => {
        if (discoverMapLoadCancelledRef.current || !container.isConnected) return
        googleMapsNsRef.current = maps

        const map = new maps.Map(container, {
          center: { lat, lng },
          zoom: 16,
          gestureHandling: "greedy",
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: false,
          clickableIcons: false,
        })

        mapInstanceRef.current = map

        let idleHandled = false
        const onIdle = () => {
          if (idleHandled || discoverMapLoadCancelledRef.current) return
          idleHandled = true
          console.log("🗺️ Discover Google Maps loaded")
          discoverMapTilesLoadedRef.current = true

          const userEl = document.createElement("div")
          userEl.style.width = "20px"
          userEl.style.height = "20px"
          userEl.style.borderRadius = "50%"
          userEl.style.backgroundColor = "#22C55E"
          userEl.style.border = "3px solid white"
          userEl.style.boxShadow = "0 2px 8px rgba(0,0,0,0.4)"
          userEl.style.cursor = "pointer"
          userEl.title = "📍 Your Location"

          userMarkerRef.current = createGoogleHtmlMarker(maps, map, {
            lat,
            lng,
            element: userEl,
          })

          fetchAndDisplayPOIs(map, lat, lng)

          setTimeout(() => {
            if (discoverMapLoadCancelledRef.current) return
            updateRecommendationMarkers(map)
          }, 100)
        }

        if (maps.event.addListenerOnce) {
          maps.event.addListenerOnce(map, "idle", onIdle)
        } else {
          maps.event.addListener(map, "idle", onIdle)
        }
      })
      .catch((error) => {
        console.error("❌ Failed to initialize Discover Google map:", error)
        isMapInitializedRef.current = false
        setIsDiscoverMapLoading(false)
      })
  }, [
    viewMode,
    location?.latitude,
    location?.longitude,
    location?.lat,
    location?.lng,
    updateRecommendationMarkers,
    fetchAndDisplayPOIs,
  ])

  // Effect B: teardown only when viewMode changes (leaving Map tab or unmount)
  useEffect(() => {
    return () => {
      discoverMapLoadCancelledRef.current = true

      recommendationMarkersRef.current.forEach((marker) => marker.remove())
      recommendationMarkersRef.current = []

      poiMarkersRef.current.forEach((marker) => marker.remove())
      poiMarkersRef.current.clear()
      if (userMarkerRef.current) {
        userMarkerRef.current.remove()
        userMarkerRef.current = null
      }

      const maps = googleMapsNsRef.current
      if (maps && mapInstanceRef.current) {
        maps.event.clearInstanceListeners(mapInstanceRef.current)
      }
      mapInstanceRef.current = null
      googleMapsNsRef.current = null

      isMapInitializedRef.current = false
      discoverMapTilesLoadedRef.current = false
      lastRecommendationsSignatureRef.current = ""
      lastLocationCoordsRef.current = null
    }
  }, [viewMode])

  // Update map center when location changes significantly (without re-initializing)
  useEffect(() => {
    if (viewMode !== "map" || !mapInstanceRef.current || !isMapInitializedRef.current || !location) return
    
    const lat = location?.latitude || location?.lat
    const lng = location?.longitude || location?.lng
    
    if (!lat || !lng) return
    
    // Only update if location has changed significantly (more than 100m)
    const lastCoords = lastLocationCoordsRef.current
    if (lastCoords) {
      const distance = Math.sqrt(
        Math.pow((lastCoords.lat - lat) * 111000, 2) + 
        Math.pow((lastCoords.lng - lng) * 111000 * Math.cos(lat * Math.PI / 180), 2)
      )
      if (distance < 100) {
        // Location hasn't changed significantly, don't update
        return
      }
    }
    
    // Update map center
    try {
      mapInstanceRef.current.setCenter({ lat, lng })
      
      // Update user marker position
      if (userMarkerRef.current) {
        userMarkerRef.current.setLngLat([lng, lat])
      }
      
      // Refresh POIs when location changes significantly
      if (mapInstanceRef.current && isMapInitializedRef.current) {
        fetchAndDisplayPOIs(mapInstanceRef.current, lat, lng)
      }
      
      // Update stored coordinates
      lastLocationCoordsRef.current = { lat, lng }
    } catch (error) {
      console.warn('⚠️ Error updating map center:', error)
    }
  }, [location?.latitude, location?.longitude, location?.lat, location?.lng, viewMode, fetchAndDisplayPOIs])

  // Update markers when recommendation content changes (ids + coordinates)
  useEffect(() => {
    if (viewMode === "map" && mapInstanceRef.current && isMapInitializedRef.current && recommendations.length > 0) {
      updateRecommendationMarkers(mapInstanceRef.current)
    }
  }, [recommendationMarkerSignature, viewMode, updateRecommendationMarkers])

  // Resize map and refresh markers when returning to Map tab (container remounts)
  useEffect(() => {
    if (viewMode !== "map" || !mapInstanceRef.current || !isMapInitializedRef.current) return

    const frameId = requestAnimationFrame(() => {
      const map = mapInstanceRef.current
      const maps = googleMapsNsRef.current
      if (!map) return

      try {
        maps?.event.trigger(map, "resize")
      } catch {
        // ignore
      }

      if (recommendations.length > 0) {
        updateRecommendationMarkers(map)
      }

      if (discoverMapTilesLoadedRef.current) {
        tryMarkDiscoverMapDisplayReady()
      }
    })

    return () => cancelAnimationFrame(frameId)
  }, [
    viewMode,
    recommendations.length,
    updateRecommendationMarkers,
    tryMarkDiscoverMapDisplayReady,
  ])

  // Don't render if location is not properly initialized
  if (!location || !location.latitude || !location.longitude || !isInitialized) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: 'url(/brand/mappo/mappo-discover-bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundColor: '#eef8f4',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        color: '#3a2e1e',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>📍</div>
        <h2 style={{ margin: '0 0 10px 0', fontSize: '20px' }}>Initializing Recommendations</h2>
        <p style={{ margin: 0, opacity: 0.8, fontSize: '14px' }}>
          {!location ? 'Waiting for location services...' : 'Preparing personalized recommendations...'}
        </p>
        <button
          onClick={onBack}
          style={{
            marginTop: '20px',
            background: 'rgba(255,255,255,0.7)',
            border: '1px solid rgba(79,59,43,0.12)',
            borderRadius: '12px',
            padding: '12px 24px',
            color: '#4f3b2b',
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            backdropFilter: 'blur(10px)'
          }}
        >
          ← Go Back
        </button>
      </div>
    )
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundImage: 'url(/brand/mappo/mappo-discover-bg.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundColor: '#eef8f4',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 1000
    }}>
      {/* Header */}
      <div style={{ ...mappoHeaderBarStyle, textAlign: 'center', color: '#3a2e1e' }}>
        <button type="button" onClick={onBack} style={mappoBackButtonAbsoluteStyle}>
          <ArrowLeft size={20} />
          Back
        </button>
        <img
          src="/brand/mappo/mappo-picked-for-you-title.png"
          alt="Picked for You"
          style={mappoTitleImageStyle}
        />
      </div>

      {/* View Mode Tabs - Map view disabled (migrating to Mapbox) */}
      <div style={{
        display: 'flex',
        padding: '0 20px',
        marginTop: '20px',
        gap: '10px'
      }}>
        {[
          { key: "map", label: "Map", icon: "🗺️" },
          { key: "list", label: "List", icon: "📋" },
          { key: "insights", label: "Insights", icon: "🧠" }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleViewModeChange(tab.key as any)}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '0.75rem',
              border: '1px solid rgba(79,59,43,0.12)',
              background: viewMode === tab.key 
                ? 'rgba(79,59,43,0.12)' 
                : 'rgba(255,255,255,0.55)',
              color: '#4f3b2b',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              backdropFilter: 'blur(10px)',
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Map legend — shown above the map when in map view */}
      {viewMode === "map" && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          padding: '8px 20px 0',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            background: 'rgba(255,255,255,0.72)',
            border: '1px solid rgba(79,59,43,0.1)',
            borderRadius: 999,
            padding: '6px 16px',
            fontSize: 12,
            color: '#4f3b2b',
            backdropFilter: 'blur(10px)',
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: 'rgba(16,185,129,0.95)',
                display: 'inline-block',
              }} />
              Users
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: 'rgba(59,130,246,0.95)',
                display: 'inline-block',
              }} />
              AI
            </span>
          </div>
        </div>
      )}

      {/* Content Area */}
      <div style={{ flex: 1, padding: '20px', overflow: 'hidden' }}>
        {viewMode === "map" && (
          <div style={{
            background: 'rgba(255,255,255,0.6)',
            borderRadius: '16px',
            height: '100%',
            position: 'relative',
            overflow: 'hidden',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(79,59,43,0.1)',
          }}>
            {/* Discover map container */}
            <div
              ref={mapRef}
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '16px',
                overflow: 'hidden'
              }}
            />

            {isDiscoverMapLoading && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  padding: '24px',
                  background: 'rgba(255,255,255,0.55)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '16px',
                  zIndex: 10,
                  pointerEvents: 'none',
                  textAlign: 'center',
                }}
                aria-live="polite"
                aria-busy="true"
              >
                <p
                  style={{
                    ...mappoTitleSubtitleStyle,
                    margin: 0,
                    maxWidth: 280,
                    fontWeight: 700,
                    color: '#4f3b2b',
                  }}
                >
                  Looking for places you might love...
                </p>
              </div>
            )}

            {!isDiscoverMapLoading && (
              <button
                type="button"
                onClick={centerDiscoverMapOnUser}
                aria-label="Center map on your location"
                style={{
                  position: 'absolute',
                  bottom: 14,
                  right: 14,
                  zIndex: 11,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 12px',
                  borderRadius: 999,
                  border: '1px solid rgba(79,59,43,0.12)',
                  background: 'rgba(255,255,255,0.78)',
                  color: '#4f3b2b',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  backdropFilter: 'blur(12px)',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
                }}
              >
                <span aria-hidden="true" style={{ fontSize: '14px', lineHeight: 1 }}>
                  ⊕
                </span>
                Center
              </button>
            )}

            {/* In-map overlay removed — legend moved outside map frame */}
          </div>
        )}

        {viewMode === "list" && (
          <div style={{
            background: 'rgba(255,255,255,0.6)',
            borderRadius: '16px',
            height: '100%',
            padding: '20px',
            color: '#3a2e1e',
            overflow: 'auto',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(79,59,43,0.1)',
          }}>
            {/* Dynamic header based on filter type */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              marginBottom: '20px',
              gap: '15px'
            }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 'bold' }}>
                  {recommendationFilter === "user" ? 
                    '👥 User Recommendations' :
                    recommendationFilter === "ai" ?
                    '🤖 AI Recommendations' :
                    isShowingCluster ?
                    `📍 ${currentCluster?.count || 0} Recommendations` : 
                    '🧠 Recommendations'
                  }
                </h3>
                {isShowingCluster && currentCluster && (
                  <p style={{ margin: 0, fontSize: '14px', opacity: 0.65, color: 'rgba(79,59,43,0.7)' }}>
                    {currentCluster.category} • {currentCluster.location.lat.toFixed(4)}, {currentCluster.location.lng.toFixed(4)}
                  </p>
                )}
              </div>
              
              {(isShowingCluster || recommendationFilter !== "all") && (
                <button
                  onClick={() => {
                    setIsShowingCluster(false)
                    setCurrentCluster(null)
                    setMarkerSelectionItems([])
                    setRecommendationFilter("all")
                    console.log('🧠 Returning to all recommendations')
                  }}
                  style={{
                      background: 'rgba(79,59,43,0.08)',
                    border: '1px solid rgba(79,59,43,0.15)',
                      borderRadius: '0.75rem',
                      padding: '0.5rem 0.75rem',
                    color: '#4f3b2b',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                      whiteSpace: 'nowrap',
                      backdropFilter: 'blur(10px)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(79,59,43,0.15)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(79,59,43,0.08)'
                  }}
                >
                  ← Back to All
                </button>
              )}
            </div>
            
            {/* NEW: Show filtered recommendations based on filter type */}
            {(() => {
              let displayRecs: Recommendation[] = []
              if (recommendationFilter === "user") {
                displayRecs = filteredRecommendations
              } else if (recommendationFilter === "ai") {
                displayRecs = filteredRecommendations
              } else if (isShowingCluster) {
                displayRecs = filteredRecommendations
              } else {
                // Normal List view: dedupe by place identity (Map groups by identity).
                // Preserve ordering: first occurrence wins; later duplicates skipped.
                const seen = new Set<string>()
                displayRecs = []
                for (const rec of recommendations) {
                  const typeKey = rec?.isAISuggestion ? 'ai' : 'user'
                  const identity = placeIdentityKey(rec)
                  const key = `${typeKey}|${identity}`
                  if (seen.has(key)) continue
                  seen.add(key)
                  displayRecs.push(rec)
                }
              }
              
              return displayRecs.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {displayRecs.map((rec) => (
                  <div
                    key={rec.id}
                    onClick={() => {
                      console.log('📍 Card clicked for:', rec.title)
                      if (isTracedPlaceRec(rec)) {
                        pushRecTrace('LIST_CARD_CLICK', recTraceSnapshot(rec))
                      }
                      setSelectedRecommendation(rec)
                      // First show read-only view, then user can choose to save/share
                      setShowReadOnlyRecommendation(true)
                    }}
                    style={{
                      background: 'rgba(255,255,255,0.78)',
                      padding: '18px',
                      borderRadius: '16px',
                      border: '1px solid rgba(79,59,43,0.1)',
                      backdropFilter: 'blur(12px)',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.9)'
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.1)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.78)'
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'stretch', gap: '12px', height: '100%' }}>
                      <RecommendationHeroImage rec={rec} variant="list" />
                      
                      {/* Content area */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        {/* Top section - Title and AI badge */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600', flex: 1 }}>
                            {rec.title}
                          </h4>
                          <span style={{
                            background: rec.isAISuggestion ? 'rgba(59, 130, 246, 0.8)' : 'rgba(16, 185, 129, 0.8)',
                            padding: '4px 8px',
                            borderRadius: '8px',
                            fontSize: '10px',
                            fontWeight: '500',
                            whiteSpace: 'nowrap',
                            marginLeft: '8px'
                          }}>
                            {rec.isAISuggestion ? '🤖 AI' : '👥 Community'}
                          </span>
                        </div>
                        
                        {/* Category */}
                        <span style={{
                          background: 'rgba(79,59,43,0.08)',
                          padding: '4px 8px',
                          borderRadius: '8px',
                          fontSize: '11px',
                          color: 'rgba(79,59,43,0.7)',
                          alignSelf: 'flex-start',
                          marginBottom: '8px'
                        }}>
                          {rec.category}
                        </span>
                      </div>
                    </div>
                    
                    <p style={{ margin: '0 0 12px 0', fontSize: '14px', opacity: 0.9, lineHeight: '1.5' }}>
                      {rec.description}
                    </p>
                    
                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                      <button 
                        type="button"
                        onClick={() => {
                          console.log('🗺️ Switching to map view for:', rec.location)
                          setViewMode('map')
                        }}
                        style={{
                          background: 'rgba(79,59,43,0.08)',
                          border: '1px solid rgba(79,59,43,0.15)',
                          borderRadius: '6px',
                          padding: '4px 8px',
                          color: '#4f3b2b',
                          fontSize: '11px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          whiteSpace: 'nowrap'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(79,59,43,0.15)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(79,59,43,0.08)'
                        }}
                      >
                        🗺️ Map
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          const label = rec.isAISuggestion ? "this recommendation" : "this item"
                          if (confirm(`Remove ${label} from your list?`)) {
                            dismissRecommendation(rec)
                          }
                        }}
                        style={{
                          background: 'rgba(239, 68, 68, 0.12)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          borderRadius: '6px',
                          padding: '4px 8px',
                          color: '#b91c1c',
                          fontSize: '11px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          whiteSpace: 'nowrap'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.22)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)'
                        }}
                      >
                        ✕ Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                background: 'rgba(255,255,255,0.65)',
                padding: '40px 20px',
                borderRadius: '16px',
                textAlign: 'center',
                border: '1px solid rgba(79,59,43,0.1)'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '20px' }}>
                  {isShowingCluster ? '📍' : '🧠'}
                </div>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>
                  {isShowingCluster ? 
                    'No recommendations in this cluster' : 
                    'No recommendations yet'
                  }
                </h4>
                <p style={{ margin: 0, opacity: 0.8, fontSize: '14px' }}>
                  {isShowingCluster ? 
                    'Try another area on the map.' :
                    'Explore the map or add recommendations from places you visit.'
                  }
                </p>
              </div>
              )
            })()}
          </div>
        )}

        {viewMode === "insights" && (
          <div style={{
            background: 'rgba(255,255,255,0.6)',
            borderRadius: '16px',
            height: '100%',
            padding: '20px',
            color: '#3a2e1e',
            overflow: 'auto',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(79,59,43,0.1)',
          }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: 'bold' }}>
              🧠 Your AI Learning Progress
            </h3>
            
            {learningProgress ? (
              <div style={{ marginBottom: '20px' }}>
                <div style={{
                  background: 'rgba(255,255,255,0.55)',
                  padding: '15px',
                  borderRadius: '12px',
                  marginBottom: '15px'
                }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>
                    📊 Learning Level: {learningProgress.level}
                  </h4>
                  <div style={{
                    background: 'rgba(0,0,0,0.1)',
                    height: '8px',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${learningProgress.progress}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #10b981, #3b82f6)',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                  <p style={{ margin: '8px 0 0 0', fontSize: '14px', opacity: 0.8 }}>
                    {learningProgress.pinsAnalyzed} pins analyzed • {Math.round(learningProgress.confidence)}% confidence
                  </p>
                </div>

                {/* AI Personality Insights */}
                {insights && insights.userPersonality && insights.userPersonality.confidence > 0.2 && (
                  <div style={{
                    background: 'rgba(255,255,255,0.55)',
                    padding: '15px',
                    borderRadius: '12px',
                    marginBottom: '15px'
                  }}>
                    <h4 style={{ margin: '0 0 15px 0', fontSize: '16px' }}>
                      🎭 Your AI Personality
                    </h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {Object.entries(insights.userPersonality)
                        .filter(([key, value]) => key !== 'confidence' && value === true)
                        .map(([key, value]) => (
                          <span key={key} style={{
                            background: 'rgba(59, 130, 246, 0.8)',
                            padding: '6px 12px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: '500'
                          }}>
                            {key.replace('is', '').replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                        ))}
                    </div>
                    <p style={{ margin: '10px 0 0 0', fontSize: '12px', opacity: 0.7 }}>
                      AI Confidence: {Math.round(insights.userPersonality.confidence * 100)}%
                    </p>
                  </div>
                )}

                {/* Recommendation Preferences */}
                {insights && insights.recommendationPreferences && (
                  <div style={{
                    background: 'rgba(255,255,255,0.55)',
                    padding: '15px',
                    borderRadius: '12px',
                    marginBottom: '15px'
                  }}>
                    <h4 style={{ margin: '0 0 15px 0', fontSize: '16px' }}>
                      🎯 Recommendation Style
                    </h4>
                    <div style={{ marginBottom: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <span style={{ fontSize: '14px' }}>Similar to what you love</span>
                        <span style={{ fontSize: '14px', fontWeight: '600' }}>
                          {Math.round(insights.recommendationPreferences.similarToLikes * 100)}%
                        </span>
                      </div>
                      <div style={{
                        background: 'rgba(0,0,0,0.08)',
                        height: '6px',
                        borderRadius: '3px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${insights.recommendationPreferences.similarToLikes * 100}%`,
                          height: '100%',
                          background: '#10b981',
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                    </div>
                    
                    <div style={{ marginBottom: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <span style={{ fontSize: '14px' }}>Discovery & new experiences</span>
                        <span style={{ fontSize: '14px', fontWeight: '600' }}>
                          {Math.round(insights.recommendationPreferences.discoveryMode * 100)}%
                        </span>
                      </div>
                      <div style={{
                        background: 'rgba(0,0,0,0.08)',
                        height: '6px',
                        borderRadius: '3px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${insights.recommendationPreferences.discoveryMode * 100}%`,
                          height: '100%',
                          background: '#3b82f6',
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                background: 'rgba(255,255,255,0.55)',
                padding: '20px',
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <p style={{ margin: 0, opacity: 0.65 }}>
                  Start pinning places to see your AI insights!
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Read-Only Recommendation View - Shows completed recommendation first */}
      {showReadOnlyRecommendation && selectedRecommendation && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: 'url(/brand/mappo/mappo-discover-bg.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundColor: '#eef8f4',
            zIndex: 2000,
            overflowY: 'auto',
            padding: '20px',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', gap: '10px' }}>
            <button
              type="button"
              onClick={closeRecommendationDetail}
              style={{ ...mappoBackButtonStyle, flexShrink: 0 }}
            >
              <ArrowLeft size={20} />
              Back
            </button>
            <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#3a2e1e', textAlign: 'center', flex: 1 }}>
              {selectedRecommendation.isAISuggestion ? '🤖 AI Recommendation' : '👤 User Recommendation'}
            </div>
            <button
              type="button"
              onClick={handleDetailHome}
              style={{ ...mappoBackButtonStyle, flexShrink: 0 }}
            >
              Home
            </button>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <RecommendationHeroImage
              rec={selectedRecommendation}
              variant="detail"
              detailImageUrl={detailImageUrl}
            />
          </div>

          {/* Content Card */}
          <div
            style={{
              background: 'rgba(255,255,255,0.78)',
              backdropFilter: 'blur(14px)',
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '20px',
              border: '1px solid rgba(79,59,43,0.08)',
            }}
          >
            <h2 style={{ color: '#3a2e1e', fontSize: '1.5rem', marginBottom: '12px', marginTop: 0 }}>
              {selectedRecommendation.title || 'Location'}
            </h2>

            {selectedRecommendation.description && (
              <p style={{ color: 'rgba(58,46,30,0.85)', lineHeight: '1.6', margin: '0 0 16px 0' }}>
                {selectedRecommendation.description}
              </p>
            )}

            {selectedRecommendation.reason && (
              <div
                style={{
                  background: 'rgba(79,59,43,0.06)',
                  borderRadius: '12px',
                  padding: '12px',
                  marginTop: '12px',
                }}
              >
                <div style={{ fontSize: '0.85rem', color: 'rgba(79,59,43,0.6)', marginBottom: '4px' }}>
                  Why we recommend this:
                </div>
                <div style={{ color: '#3a2e1e', fontSize: '0.95rem' }}>
                  {selectedRecommendation.reason}
                </div>
              </div>
            )}

            {selectedRecommendation.category && (
              <div
                style={{
                  display: 'inline-block',
                  background: 'rgba(79,59,43,0.1)',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '0.85rem',
                  color: '#4f3b2b',
                  marginTop: '16px',
                }}
              >
                {selectedRecommendation.category}
              </div>
            )}
          </div>

          {Number.isFinite(Number(selectedRecommendation.location?.lat)) &&
            Number.isFinite(Number(selectedRecommendation.location?.lng)) && (
              <button
                type="button"
                onClick={() => {
                  const placeId = googlePlaceIdFromRecommendationFields(selectedRecommendation)
                  if (isTracedPlaceRec(selectedRecommendation)) {
                    pushRecTrace('GO_THERE', {
                      ...recTraceSnapshot(selectedRecommendation),
                      googlePlaceIdResolved: placeId || null,
                      navigationBranch: placeId ? 'PLACE ID' : 'COORDINATES',
                    })
                  }
                  openGoogleMapsNavigation({
                    latitude: Number(selectedRecommendation.location.lat),
                    longitude: Number(selectedRecommendation.location.lng),
                    placeName: selectedRecommendation.title,
                    placeId,
                  })
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.92)'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.12)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.85)'
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.08)'
                }}
                style={{
                  width: '100%',
                  marginBottom: '20px',
                  background: 'rgba(255,255,255,0.85)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(79,59,43,0.18)',
                  padding: '16px 20px',
                  borderRadius: '12px',
                  color: '#4f3b2b',
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
                  minHeight: '48px',
                }}
              >
                🗺️ Go There
              </button>
            )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={() => {
                const savedPin: PinData = {
                  id: Date.now().toString(),
                  latitude: selectedRecommendation.location?.lat || 0,
                  longitude: selectedRecommendation.location?.lng || 0,
                  locationName: selectedRecommendation.title || 'Location',
                  mediaUrl:
                    selectedRecommendation.photoUrl ||
                    selectedRecommendation.mediaUrl ||
                    null,
                  mediaType:
                    selectedRecommendation.photoUrl ||
                    selectedRecommendation.mediaUrl
                      ? 'photo'
                      : null,
                  audioUrl: null,
                  timestamp: new Date().toISOString(),
                  title: selectedRecommendation.title || 'Location',
                  description: selectedRecommendation.description || undefined,
                  tags: [
                    'recommendation',
                    selectedRecommendation.category?.toLowerCase() || 'general',
                    ...(selectedRecommendation.isAISuggestion
                      ? ['discover-ai']
                      : ['discover']),
                  ],
                  isRecommended: true,
                  types: ['recommendation'],
                  category: selectedRecommendation.category || 'general',
                  isAISuggestion:
                    selectedRecommendation.isAISuggestion || false,
                  googlePlaceId:
                    googlePlaceIdFromRecommendationFields(selectedRecommendation),
                  placeId:
                    googlePlaceIdFromRecommendationFields(selectedRecommendation),
                  website: selectedRecommendation.website,
                }
                const ok = addPinToLibrary(savedPin)
                console.log("Recommendation save result", {
                  ok,
                  title: savedPin.title,
                  id: savedPin.id,
                })
                if (!ok) {
                  alert("Couldn't save recommendation. Please try again.")
                  return
                }
                setShowReadOnlyRecommendation(false)
                setDetailImageUrl(null)
                setShowDetailShareOptions(false)
                setSelectedRecommendation(null)
                alert('Saved to My Library → Recommended')
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.92)'
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.78)'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'
              }}
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.78)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(79,59,43,0.12)',
                padding: '16px',
                borderRadius: '12px',
                color: '#4f3b2b',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              }}
            >
              💾 Save to Library
            </button>
            <button
              type="button"
              onClick={() => setShowDetailShareOptions((prev) => !prev)}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.92)'
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.78)'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'
              }}
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.78)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(79,59,43,0.12)',
                padding: '16px',
                borderRadius: '12px',
                color: '#4f3b2b',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              }}
            >
              📤 Share
            </button>
          </div>

          {showDetailShareOptions && (() => {
            const { title: shareTitle, shareUrl, shareText } =
              buildDiscoverDetailShare(selectedRecommendation)
            return (
              <div
                style={{
                  width: '100%',
                  marginTop: 4,
                  marginBottom: 8,
                  background: 'rgba(255,255,255,0.72)',
                  border: '1px solid rgba(79,59,43,0.1)',
                  borderRadius: 16,
                  padding: 14,
                  backdropFilter: 'blur(12px)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div style={{ fontWeight: 950, fontSize: '1.05rem', color: '#3a2e1e' }}>
                  Share this place
                </div>
                <div
                  style={{
                    opacity: 0.9,
                    lineHeight: 1.35,
                    color: '#3a2e1e',
                    fontSize: '0.9rem',
                  }}
                >
                  Send {shareTitle} to someone.
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                    style={discoverDetailShareBtn}
                    rel="noreferrer"
                    target="_blank"
                  >
                    WhatsApp
                  </a>
                  <a
                    href={`mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(shareText)}`}
                    style={discoverDetailShareBtn}
                  >
                    Email
                  </a>
                  <a
                    href={`sms:?&body=${encodeURIComponent(shareText)}`}
                    style={discoverDetailShareBtn}
                  >
                    SMS
                  </a>
                  <button
                    type="button"
                    style={discoverDetailShareBtn}
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(shareUrl)
                        alert('Link copied')
                      } catch {
                        alert('Copy failed')
                      }
                    }}
                  >
                    Copy link
                  </button>
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* Recommendation Form Modal - Enhanced for recommendations (Editable) */}
      {showRecommendationForm && recommendationFormData && selectedRecommendation && (
        <RecommendationForm
          mediaUrl={recommendationFormData.mediaUrl || ''}
          locationName={recommendationFormData.locationName}
          placeDescription={recommendationFormData.placeDescription ?? selectedRecommendation?.description ?? null}
          additionalPhotos={selectedRecommendation.additionalPhotos || (selectedRecommendation.photoUrl ? [{ url: selectedRecommendation.photoUrl, placeName: selectedRecommendation.title }] : undefined)}
          onSave={() => {
            console.log('📍 Saving recommendation to library (without recommending)')
            // Use the existing onSkip logic for saving
            const savedPin: PinData = {
              id: Date.now().toString(),
              latitude: selectedRecommendation.location?.lat || 0,
              longitude: selectedRecommendation.location?.lng || 0,
              locationName: selectedRecommendation.title || 'Location',
              mediaUrl: selectedRecommendation.photoUrl || selectedRecommendation.mediaUrl || null,
              mediaType: (selectedRecommendation.photoUrl || selectedRecommendation.mediaUrl) ? "photo" : null,
              audioUrl: null,
              timestamp: new Date().toISOString(),
              title: selectedRecommendation.title || 'Location',
              description: selectedRecommendation.description || undefined,
              tags: [
                "saved",
                selectedRecommendation.category?.toLowerCase() || "general"
              ],
              isRecommended: false,
              types: ["saved"],
              category: selectedRecommendation.category || "general",
              isAISuggestion: selectedRecommendation.isAISuggestion || false
            }
            addPin(savedPin)
            setShowRecommendationForm(false)
            setShowReadOnlyRecommendation(false)
            setRecommendationFormData(null)
            setSelectedRecommendation(null)
            console.log('✅ Pin saved to library!')
          }}
          onShare={async () => {
            if (!selectedRecommendation) return
            const title = selectedRecommendation.title || 'Check this place out'
            const text = `${title} — discovered on Mappo! Postcards from anywhere.`
            const url = typeof window !== 'undefined' ? window.location.origin : ''
            if (typeof navigator !== 'undefined' && navigator.share) {
              try {
                await navigator.share({ title: `Mappo — ${title}`, text, url })
              } catch { /* user cancelled */ }
            } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
              await navigator.clipboard.writeText(`${text}\n${url}`)
              alert('Link copied!')
            }
          }}
          onRecommend={async (rating: number, review: string, placeName?: string) => {
            console.log('📍 Recommendation submitted:', { rating, review, placeName, rec: selectedRecommendation })
            
            // Create a new recommendation pin
            const chosenName = (placeName || "").trim() || selectedRecommendation.title || 'Location'
            const newRecommendation: PinData = {
              id: Date.now().toString(),
              latitude: selectedRecommendation.location?.lat || 0,
              longitude: selectedRecommendation.location?.lng || 0,
              locationName: chosenName,
              mediaUrl: selectedRecommendation.photoUrl || selectedRecommendation.mediaUrl || null,
              mediaType: (selectedRecommendation.photoUrl || selectedRecommendation.mediaUrl) ? "photo" : null,
              audioUrl: null,
              timestamp: new Date().toISOString(),
              title: `Recommendation - ${chosenName}`,
              description: selectedRecommendation.description 
                ? `${review}\n\n${selectedRecommendation.description}` 
                : review,
              tags: [
                "recommendation", 
                "user-submitted",
                selectedRecommendation.category?.toLowerCase() || "general"
              ],
              isRecommended: true,
              rating: rating,
              types: ["recommendation"],
              category: selectedRecommendation.category || "general",
              personalThoughts: review,
              isAISuggestion: selectedRecommendation.isAISuggestion || false
            }

            console.log('📍 Created recommendation pin:', newRecommendation)
            
            // Save to library as a recommendation
            addPin(newRecommendation)
            
            // Close the form
            setShowRecommendationForm(false)
            setShowReadOnlyRecommendation(false)
            setRecommendationFormData(null)
            setSelectedRecommendation(null)
            
            // Show success message (you can add a toast/notification here)
            console.log('✅ Recommendation saved!')
          }}
          onSkip={() => {
            console.log('📍 Recommendation skipped - saving to library without recommendation')
            
            // Save to library without recommendation (just as a saved pin)
            const savedPin: PinData = {
              id: Date.now().toString(),
              latitude: selectedRecommendation.location?.lat || 0,
              longitude: selectedRecommendation.location?.lng || 0,
              locationName: selectedRecommendation.title || 'Location',
              mediaUrl: selectedRecommendation.photoUrl || selectedRecommendation.mediaUrl || null,
              mediaType: (selectedRecommendation.photoUrl || selectedRecommendation.mediaUrl) ? "photo" : null,
              audioUrl: null,
              timestamp: new Date().toISOString(),
              title: selectedRecommendation.title || 'Location',
              description: selectedRecommendation.description || undefined,
              tags: [
                "saved",
                selectedRecommendation.category?.toLowerCase() || "general"
              ],
              isRecommended: false, // Not a recommendation, just saved
              types: ["saved"],
              category: selectedRecommendation.category || "general",
              isAISuggestion: selectedRecommendation.isAISuggestion || false
            }

            console.log('📍 Created saved pin:', savedPin)
            
            // Save to library
            addPin(savedPin)
            
            // Close the form
            setShowRecommendationForm(false)
            setShowReadOnlyRecommendation(false)
            setRecommendationFormData(null)
            setSelectedRecommendation(null)
            
            console.log('✅ Pin saved to library!')
          }}
        />
      )}
      <RecTracePanel />
    </div>
  )
} 
