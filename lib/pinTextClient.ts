// Client-side helper for pin text generation
// Calls the server-side API route

import { resolvePinContext, resolveTitleFallback, normalizeText, type PinContext } from './pinText'
import { areaOnlyFallbackDescription, sanitizePlaceDescription } from './sanitizePlaceDescription'

export type PinAiResult = {
  title: string;
  description: string;
  confidence: "high" | "medium" | "low";
  used_fallback: boolean;
};

/**
 * Generate pin title and description using AI
 * Falls back to deterministic title if AI fails
 */
export async function generatePinTextForPlace(rawPinData: any): Promise<PinAiResult> {
  const ctx = resolvePinContext(rawPinData);

  // Validate coordinates
  if (!isFinite(ctx.lat) || !isFinite(ctx.lng)) {
    const fallbackTitle = resolveTitleFallback(ctx);
    return {
      title: fallbackTitle,
      description: areaOnlyFallbackDescription({
        city: normalizeText(ctx.city),
        region: normalizeText(ctx.region),
      }),
      confidence: "low",
      used_fallback: true,
    };
  }

  try {
    const response = await fetch('/api/pinit/generate-pin-text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(rawPinData),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result: PinAiResult = await response.json();
    return {
      ...result,
      description: sanitizePlaceDescription(result.description),
    };
  } catch (error) {
    console.warn("⚠️ Failed to generate AI pin text, using fallback:", error);
    const fallbackTitle = resolveTitleFallback(ctx);
    return {
      title: fallbackTitle,
      description: areaOnlyFallbackDescription({
        city: normalizeText(ctx.city),
        region: normalizeText(ctx.region),
      }),
      confidence: "low",
      used_fallback: true,
    };
  }
}

