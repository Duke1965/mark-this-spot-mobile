/** True when a postcard has coordinates suitable for "Go there" navigation. */
export function hasPostcardNavigationCoords(lat?: number | null, lng?: number | null): boolean {
  return Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))
}
