/**
 * PINIT AI Pin Text Generation
 * 
 * Generates titles and descriptions for pins using AI.
 * Returns strict JSON format with fallbacks.
 */

import { NextRequest, NextResponse } from 'next/server'
import { resolvePinContext, resolveTitleFallback, normalizeText, type PinContext } from '@/lib/pinText'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export type PinAiResult = {
  title: string;
  description: string;
  confidence: "high" | "medium" | "low";
  used_fallback: boolean;
};

const BANNED = [
  "special place",
  "diverse landscapes",
  "wonderful location",
  "remember and share",
  "Location Location",
];

function clampDesc(s: string, max = 240): string {
  const t = (s ?? "").trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1).trimEnd() + "…";
}

function removeBannedPhrases(s: string): string {
  let out = s;
  for (const b of BANNED) {
    out = out.replace(new RegExp(b, "ig"), "").replace(/\s{2,}/g, " ").trim();
  }
  return out;
}

// Call AI service (OpenAI, Anthropic, etc.)
async function callAi(system: string, user: string): Promise<string> {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  
  // If no OpenAI key, return null to trigger fallback
  if (!OPENAI_API_KEY) {
    console.warn("⚠️ OPENAI_API_KEY not configured, using fallback");
    return "";
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // Use cheaper model for cost efficiency
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.7,
        max_tokens: 200,
        response_format: { type: "json_object" }, // Force JSON output
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("❌ OpenAI API error:", response.status, error);
      return "";
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  } catch (error) {
    console.error("❌ Error calling OpenAI:", error);
    return "";
  }
}

async function generatePinText(ctx: PinContext): Promise<PinAiResult> {
  const name = normalizeText(ctx.name);
  const fallbackTitle = resolveTitleFallback(ctx);
  const usedFallback = !name;

  const system = `You generate concise, useful pin titles and descriptions for a travel app. Be specific, avoid generic filler.`;

  const user = `Create a title and description for a pinned location using ONLY the facts provided below.
Rules:
- Never output the word "Location" as the title.
- Title must be 2–6 words, no date/time, no emoji.
- Description must be 1–2 sentences, max 240 characters.
- If the place name is unknown, use a meaningful fallback like: "{street/suburb}, {city}" or "{suburb} spot".
- Do NOT use generic phrases like "special place", "diverse landscapes", "wonderful location".
- If you lack facts, write a neutral description referencing what you do know (area + address).
Return valid JSON exactly in this format:
{"title":"...","description":"...","confidence":"high|medium|low","used_fallback":true|false}

Facts:
name: ${name ?? ""}
category: ${ctx.category ?? ""}
address: ${ctx.address ?? ""}
suburb: ${ctx.suburb ?? ""}
city: ${ctx.city ?? ""}
region: ${ctx.region ?? ""}
country: ${ctx.country ?? ""}
lat: ${ctx.lat}
lng: ${ctx.lng}
provider: ${ctx.provider ?? ""}`;

  let raw = await callAi(system, user);

  // Parse JSON defensively
  let parsed: any = null;
  if (raw) {
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      console.warn("⚠️ Failed to parse AI response as JSON:", raw);
    }
  }

  // If AI failed or returned invalid data, use deterministic fallback
  if (!parsed || !parsed.title || !parsed.description) {
    const city = normalizeText(ctx.city);
    const region = normalizeText(ctx.region);
    const address = normalizeText(ctx.address);
    
    return {
      title: fallbackTitle,
      description: city 
        ? `Pinned near ${city}${address ? `: ${address}` : ""}.`
        : region
        ? `Pinned spot in ${region}${address ? `: ${address}` : ""}.`
        : address
        ? `Pinned at ${address}.`
        : "A pinned location worth exploring.",
      confidence: "low",
      used_fallback: true,
    };
  }

  const titleCandidate = normalizeText(parsed?.title) ?? fallbackTitle;
  const finalTitle = titleCandidate === "Location" ? fallbackTitle : titleCandidate;

  let desc = clampDesc(removeBannedPhrases(parsed?.description ?? ""));
  if (!desc) {
    const city = normalizeText(ctx.city);
    const region = normalizeText(ctx.region);
    const address = normalizeText(ctx.address);
    desc = city 
      ? `Pinned near ${city}${address ? `: ${address}` : ""}.`
      : region
      ? `Pinned spot in ${region}${address ? `: ${address}` : ""}.`
      : address
      ? `Pinned at ${address}.`
      : "A pinned location worth exploring.";
  }

  const confidence: PinAiResult["confidence"] =
    parsed?.confidence === "high" || parsed?.confidence === "medium" || parsed?.confidence === "low"
      ? parsed.confidence
      : (name ? "medium" : "low");

  return {
    title: finalTitle,
    description: desc,
    confidence,
    used_fallback: Boolean(parsed?.used_fallback ?? usedFallback),
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const ctx = resolvePinContext(body);

    // Validate coordinates
    if (!isFinite(ctx.lat) || !isFinite(ctx.lng)) {
      return NextResponse.json(
        { error: "Invalid coordinates" },
        { status: 400 }
      );
    }

    const result = await generatePinText(ctx);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("❌ Error generating pin text:", error);
    return NextResponse.json(
      { error: "Failed to generate pin text" },
      { status: 500 }
    );
  }
}

