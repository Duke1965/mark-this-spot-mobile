// PINIT Pin Text Utilities
// Functions for resolving pin context, generating fallback titles, and normalizing text

export type PinContext = {
  name?: string | null;
  category?: string | null;
  address?: string | null;
  suburb?: string | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  lat: number;
  lng: number;
  provider?: string | null;
};

export function normalizeText(s?: string | null): string | null {
  const t = (s ?? "").trim();
  if (!t) return null;
  // prevent placeholders
  if (t.toLowerCase() === "location") return null;
  if (t.toLowerCase() === "pinit placeholder") return null;
  if (t.toLowerCase() === "unknown place") return null;
  return t;
}

export function resolveTitleFallback(ctx: PinContext): string {
  const suburb = normalizeText(ctx.suburb);
  const city = normalizeText(ctx.city);
  const address = normalizeText(ctx.address);
  const region = normalizeText(ctx.region);
  const name = normalizeText(ctx.name);

  // If we have a name, use it
  if (name) return name;

  // Otherwise build from location components
  if (suburb && city) return `${suburb}, ${city}`;
  if (address && city) return `${address}, ${city}`;
  if (address) return address;
  if (city) return `${city} spot`;
  if (region) return `Pinned spot in ${region}`;
  return `Pinned spot`;
}

export function resolvePinContext(raw: any): PinContext {
  // Map raw pin/provider payload into PinContext
  // NOTE: keep it defensive; different providers have different keys.
  const lat = Number(raw?.lat ?? raw?.latitude ?? raw?.location?.lat);
  const lng = Number(raw?.lng ?? raw?.longitude ?? raw?.location?.lng);

  // Handle geocode data (from OpenCage, Mapbox, etc.)
  const geocode = raw?.geocode || raw?.address || {};
  
  return {
    name: normalizeText(raw?.name ?? raw?.poi?.name ?? raw?.placeName ?? geocode?.name),
    category: normalizeText(raw?.category ?? raw?.poi?.category ?? raw?.types?.[0]),
    address: normalizeText(raw?.address ?? raw?.formattedAddress ?? raw?.poi?.address ?? geocode?.formatted ?? geocode?.road),
    suburb: normalizeText(raw?.suburb ?? raw?.neighborhood ?? raw?.district ?? geocode?.suburb ?? geocode?.neighbourhood),
    city: normalizeText(raw?.city ?? raw?.municipality ?? raw?.locality ?? geocode?.city ?? geocode?.town),
    region: normalizeText(raw?.region ?? raw?.state ?? raw?.province ?? geocode?.state ?? geocode?.county),
    country: normalizeText(raw?.country ?? geocode?.country),
    lat: isFinite(lat) ? lat : 0,
    lng: isFinite(lng) ? lng : 0,
    provider: normalizeText(raw?.provider ?? raw?.source),
  };
}

