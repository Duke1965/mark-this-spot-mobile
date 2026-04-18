/**
 * Shared cleanup for human-facing place descriptions.
 * Removes street-style address lines and generic filler; keeps category/area context.
 */

function collapseWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim()
}

/** Substrings/phrases that read as generic demo copy (case-insensitive removal). */
const FILLER_PHRASES: string[] = [
  "a nice place",
  "a great spot worth remembering",
  "a special location worth exploring",
  "a special location",
  "special location",
  "special place",
  "worth exploring",
  "worth remembering",
  "worth stopping at",
  "worth visiting",
  "wonderful location",
  "diverse landscapes",
  "remember and share",
  "location location",
  "pinned location worth exploring",
  "a pinned location",
  "amazing spot",
  "this special place",
  "perfect for capturing memories",
  "sharing with friends",
  "to remember and share with others",
]

/** Typical street/address fragments to strip (keeps city-only phrases elsewhere). */
function stripAddressLikeFragments(text: string): string {
  let s = text
  // UK-style postcodes embedded in prose
  s = s.replace(/\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/gi, " ")
  // US-style "123 Main St" / "456 Oak Road" clauses
  s = s.replace(
    /\b\d{1,5}\s+[\w'.-]+(?:\s+[\w'.-]+){0,6}\s+(?:street|st\.?|road|rd\.?|avenue|ave\.?|drive|dr\.?|lane|ln\.?|boulevard|blvd\.?|way|crescent|cres\.?|court|ct\.?|place|pl\.?|terrace|highway|hwy\.?)\b[^.!?]*[.!?]?/gi,
    " "
  )
  // Trailing " — 123 Foo Rd" or " (123 Foo Street)"
  s = s.replace(/\s*[,–—-]\s*\d{1,5}\s+[^.!?]+$/i, "")
  // "at 12 Something Street" mid-sentence
  s = s.replace(/\bat\s+\d{1,5}\s+[\w\s,'-]+(?:street|st\.?|road|avenue)\b/gi, " ")
  return s
}

function removeFillerPhrases(text: string): string {
  let s = text
  for (const phrase of FILLER_PHRASES) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    s = s.replace(new RegExp(`\\b${escaped}\\b`, "gi"), " ")
  }
  // Repeated polite clauses
  s = s.replace(/\band sharing\.?/gi, " ")
  s = s.replace(/\bperfect for capturing memories\b/gi, " ")
  return collapseWhitespace(s)
}

/**
 * Clean a place description for display. Safe to run on any string; returns "" for null/empty.
 */
export function sanitizePlaceDescription(raw: string | null | undefined): string {
  if (raw == null) return ""
  let s = collapseWhitespace(String(raw))
  if (!s) return ""

  s = removeFillerPhrases(s)
  s = stripAddressLikeFragments(s)
  s = removeFillerPhrases(s)
  s = collapseWhitespace(s)

  // Tidy punctuation
  s = s.replace(/\s+,/g, ", ")
  s = s.replace(/\s+\./g, ".")
  s = s.replace(/,\s*\./g, ".")
  s = s.replace(/\.{2,}/g, ".")
  return collapseWhitespace(s)
}

/** Fallback description when only area is known — no raw street line. */
export function areaOnlyFallbackDescription(parts: {
  city?: string | null
  region?: string | null
}): string {
  const city = (parts.city || "").trim()
  const region = (parts.region || "").trim()
  if (city) return sanitizePlaceDescription(`A place in or near ${city}.`)
  if (region) return sanitizePlaceDescription(`A place in ${region}.`)
  return "A place to remember on your map."
}
