"use client"

export type QuickPinCandidate = {
  placeId: string
  name: string
  lat: number
  lng: number
  distanceM: number
  types: string[]
  category?: string
}

export type QuickPinSelectedCandidate = {
  placeId: string
  name: string
  lat: number
  lng: number
}

type QuickPinPlaceChooserProps = {
  candidates: QuickPinCandidate[]
  selected?: QuickPinSelectedCandidate | null
  busy?: boolean
  error?: string | null
  onSelect: (candidate: QuickPinCandidate) => void
  onNoneOfThese: () => void
  onDismissHeld?: () => void
}

const FRIENDLY_TYPE_LABELS: Record<string, string> = {
  cafe: "Café",
  coffee_shop: "Café",
  restaurant: "Restaurant",
  bakery: "Bakery",
  bar: "Bar",
  night_club: "Nightclub",
  lodging: "Lodging",
  hotel: "Hotel",
  park: "Park",
  museum: "Museum",
  store: "Shop",
  supermarket: "Supermarket",
  grocery_or_supermarket: "Grocery",
  shopping_mall: "Mall",
  gym: "Gym",
  spa: "Spa",
  church: "Church",
  tourist_attraction: "Attraction",
  art_gallery: "Gallery",
  library: "Library",
  school: "School",
  university: "University",
  hospital: "Hospital",
  pharmacy: "Pharmacy",
  gas_station: "Fuel",
  parking: "Parking",
  bank: "Bank",
}

const TECHNICAL_TYPES = new Set([
  "point_of_interest",
  "establishment",
  "food",
  "geocode",
  "political",
  "premise",
  "subpremise",
  "route",
  "street_address",
  "plus_code",
  "locality",
  "neighborhood",
  "sublocality",
  "colloquial_area",
])

function titleCaseWords(value: string): string {
  return value
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

function friendlyCategoryLabel(category?: string, types?: string[]): string | undefined {
  const rawCategory = String(category || "").trim().toLowerCase()
  if (rawCategory) {
    const last = rawCategory.split(".").pop() || ""
    if (FRIENDLY_TYPE_LABELS[last]) return FRIENDLY_TYPE_LABELS[last]
    if (last && !TECHNICAL_TYPES.has(last)) {
      return titleCaseWords(last)
    }
  }

  for (const type of types || []) {
    const key = String(type || "").trim().toLowerCase()
    if (!key || TECHNICAL_TYPES.has(key)) continue
    if (FRIENDLY_TYPE_LABELS[key]) return FRIENDLY_TYPE_LABELS[key]
  }

  return undefined
}

function formatDistance(distanceM: number): string | undefined {
  if (!Number.isFinite(distanceM)) return undefined
  return `${Math.max(0, Math.round(distanceM))} m away`
}

function candidateSecondaryLine(candidate: QuickPinCandidate): string | undefined {
  const category = friendlyCategoryLabel(candidate.category, candidate.types)
  const distance = formatDistance(candidate.distanceM)
  return [category, distance].filter(Boolean).join(" · ") || undefined
}

export function parseQuickPinCandidates(raw: unknown): QuickPinCandidate[] {
  if (!Array.isArray(raw)) return []
  const out: QuickPinCandidate[] = []
  for (const row of raw) {
    const placeId = String(row?.placeId || "").trim()
    const name = String(row?.name || "").trim()
    const lat = Number(row?.lat)
    const lng = Number(row?.lng)
    const distanceM = Number(row?.distanceM)
    if (!placeId || !name) continue
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
    const types = Array.isArray(row?.types) ? row.types.map((t: unknown) => String(t)) : []
    const category = typeof row?.category === "string" && row.category.trim() ? row.category.trim() : undefined
    const item: QuickPinCandidate = {
      placeId,
      name,
      lat,
      lng,
      distanceM: Number.isFinite(distanceM) ? distanceM : 0,
      types,
    }
    if (category) item.category = category
    out.push(item)
    if (out.length >= 3) break
  }
  return out
}

export function QuickPinPlaceChooser({
  candidates,
  selected,
  busy,
  error,
  onSelect,
  onNoneOfThese,
  onDismissHeld,
}: QuickPinPlaceChooserProps) {
  if (selected) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 12000,
          background: "rgba(0, 0, 0, 0.45)",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          padding: "1rem",
          paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "420px",
            background: "var(--pinit-panel)",
            borderRadius: "1.25rem",
            border: "1px solid var(--pinit-border)",
            padding: "1.25rem",
            boxShadow: "0 20px 60px rgba(0,0,0,0.28)",
          }}
        >
          <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--pinit-fg)", lineHeight: 1.3 }}>
            You chose {selected.name}
          </div>
          <div style={{ marginTop: "0.5rem", fontSize: "0.95rem", color: "rgba(58,46,30,0.78)", lineHeight: 1.4 }}>
            We’ll finish attaching this place next. Nothing has been saved yet.
          </div>
          <button
            type="button"
            onClick={onDismissHeld}
            style={{
              marginTop: "1.1rem",
              width: "100%",
              minHeight: "52px",
              borderRadius: "0.9rem",
              border: "1px solid rgba(79,59,43,0.15)",
              background: "rgba(79,59,43,0.1)",
              color: "var(--pinit-fg)",
              fontWeight: 800,
              fontSize: "1rem",
              cursor: "pointer",
            }}
          >
            OK
          </button>
        </div>
      </div>
    )
  }

  const isSingle = candidates.length === 1
  const heading = isSingle ? "We found this place" : "Which place did you mean?"

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 12000,
        background: "rgba(0, 0, 0, 0.45)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: "1rem",
        paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "var(--pinit-panel)",
          borderRadius: "1.25rem",
          border: "1px solid var(--pinit-border)",
          padding: "1.15rem 1.15rem 1rem",
          boxShadow: "0 20px 60px rgba(0,0,0,0.28)",
        }}
      >
        <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--pinit-fg)", marginBottom: "0.85rem" }}>
          {heading}
        </div>

        {busy ? (
          <div style={{ marginBottom: "0.75rem", fontSize: "0.95rem", fontWeight: 700, color: "rgba(58,46,30,0.78)" }}>
            Finishing this place…
          </div>
        ) : null}
        {error && !busy ? (
          <div style={{ marginBottom: "0.75rem", fontSize: "0.92rem", fontWeight: 650, color: "rgba(146, 64, 14, 0.95)", lineHeight: 1.4 }}>
            {error}
          </div>
        ) : null}

        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", opacity: busy ? 0.6 : 1 }}>
          {candidates.map((candidate) => {
            const secondary = candidateSecondaryLine(candidate)
            if (isSingle) {
              return (
                <div key={candidate.placeId}>
                  <div
                    style={{
                      padding: "0.35rem 0.15rem 0.85rem",
                      color: "var(--pinit-fg)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "1.15rem",
                        fontWeight: 800,
                        lineHeight: 1.3,
                        overflowWrap: "anywhere",
                      }}
                    >
                      {candidate.name}
                    </div>
                    {secondary ? (
                      <div style={{ marginTop: "0.3rem", fontSize: "0.9rem", color: "rgba(58,46,30,0.7)" }}>
                        {secondary}
                      </div>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    disabled={!!busy}
                    onClick={() => {
                      if (busy) return
                      onSelect(candidate)
                    }}
                    style={{
                      width: "100%",
                      minHeight: "52px",
                      borderRadius: "0.9rem",
                      border: "1px solid rgba(79,59,43,0.18)",
                      background: "rgba(79,59,43,0.12)",
                      color: "var(--pinit-fg)",
                      fontWeight: 800,
                      fontSize: "1rem",
                      cursor: busy ? "not-allowed" : "pointer",
                    }}
                  >
                    Yes, that&apos;s it
                  </button>
                </div>
              )
            }

            return (
              <button
                key={candidate.placeId}
                type="button"
                disabled={!!busy}
                onClick={() => {
                  if (busy) return
                  onSelect(candidate)
                }}
                style={{
                  width: "100%",
                  textAlign: "left",
                  minHeight: "56px",
                  padding: "0.9rem 1rem",
                  borderRadius: "0.95rem",
                  border: "1px solid rgba(79,59,43,0.14)",
                  background: "rgba(255,255,255,0.72)",
                  color: "var(--pinit-fg)",
                  cursor: busy ? "not-allowed" : "pointer",
                }}
              >
                <div
                  style={{
                    fontSize: "1.05rem",
                    fontWeight: 800,
                    lineHeight: 1.3,
                    overflowWrap: "anywhere",
                  }}
                >
                  {candidate.name}
                </div>
                {secondary ? (
                  <div style={{ marginTop: "0.25rem", fontSize: "0.88rem", color: "rgba(58,46,30,0.7)" }}>
                    {secondary}
                  </div>
                ) : null}
              </button>
            )
          })}
        </div>

        <button
          type="button"
          disabled={!!busy}
          onClick={() => {
            if (busy) return
            onNoneOfThese()
          }}
          style={{
            marginTop: "0.85rem",
            width: "100%",
            minHeight: "48px",
            borderRadius: "0.9rem",
            border: "none",
            background: "transparent",
            color: "rgba(58,46,30,0.72)",
            fontWeight: 700,
            fontSize: "0.95rem",
            cursor: busy ? "not-allowed" : "pointer",
            opacity: busy ? 0.55 : 1,
            textDecoration: "underline",
            textUnderlineOffset: "3px",
          }}
        >
          None of these
        </button>
      </div>
    </div>
  )
}
