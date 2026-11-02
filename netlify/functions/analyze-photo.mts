// POST /api/analyze-photo
// Body: { image: <base64, no data: prefix>, mimeType: "image/jpeg" | "image/png" | "image/heic" | ... }
// Returns: { ingredients: [{ name, confidence }], model }
//
// The photo is forwarded to Gemini and never stored.

import type { Config } from "@netlify/functions";
import { env, fail, geminiModels, json } from "../lib/shared.ts";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
// Netlify caps request bodies at 6 MB; base64 adds ~33%, so keep the decoded image under ~4.4 MB.
const MAX_BASE64_CHARS = 5_900_000;
const TIME_BUDGET_MS = 24_000;

const PROMPT = `You are looking at a photo of the inside of a fridge, freezer, pantry or a kitchen counter.
List the distinct food ingredients you can see that someone could cook with.
Rules:
- Use short, common grocery names in English, singular where natural (e.g. "egg", "spinach", "cheddar cheese", "chicken breast").
- Merge duplicates. Skip non-food items, containers you cannot see into, and condiments unless clearly visible.
- confidence is 0 to 1: how sure you are the item is present and correctly named.
- Order by confidence, highest first. At most 25 items.
- Set foodDetected to false if the photo contains no food at all.
- Set photoQuality to "blurry" or "dark" if that prevents you from identifying most items, otherwise "good".`;

const SCHEMA = {
  type: "object",
  properties: {
    foodDetected: { type: "boolean" },
    photoQuality: { type: "string", enum: ["good", "blurry", "dark"] },
    ingredients: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          confidence: { type: "number" },
        },
        required: ["name", "confidence"],
      },
    },
  },
  required: ["foodDetected", "photoQuality", "ingredients"],
};

interface GeminiResult {
  foodDetected: boolean;
  photoQuality: "good" | "blurry" | "dark";
  ingredients: { name: string; confidence: number }[];
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== "POST") return fail("BAD_REQUEST", "Use POST.", 405);

  const apiKey = env("GEMINI_API_KEY");
  if (!apiKey) return fail("CONFIG", "The server is missing its Gemini API key.", 500);

  let body: { image?: unknown; mimeType?: unknown };
  try {
    body = await req.json();
  } catch {
    return fail("BAD_REQUEST", "Expected a JSON body.", 400);
  }
  const { image, mimeType } = body;
  if (typeof image !== "string" || !image || typeof mimeType !== "string" || !ALLOWED_TYPES.has(mimeType)) {
    return fail("BAD_REQUEST", "Send a JPG, PNG or HEIC photo.", 400);
  }
  if (image.length > MAX_BASE64_CHARS) {
    return fail("IMAGE_TOO_LARGE", "That photo is too large to analyze.", 413);
  }

  const deadline = Date.now() + TIME_BUDGET_MS;
  let lastStatus = 0;

  for (const model of geminiModels()) {
    const remaining = deadline - Date.now();
    if (remaining < 2_000) break;

    let res: globalThis.Response;
    try {
      res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
        signal: AbortSignal.timeout(remaining),
        body: JSON.stringify({
          contents: [{ parts: [{ inline_data: { mime_type: mimeType, data: image } }, { text: PROMPT }] }],
          generationConfig: { responseMimeType: "application/json", responseJsonSchema: SCHEMA, temperature: 0.2 },
        }),
      });
    } catch {
      lastStatus = 504;
      continue; // timeout or network error: try the next model
    }

    if (res.status === 503 || res.status === 500 || res.status === 429) {
      lastStatus = res.status;
      continue; // overloaded or rate limited: fall back to the next model
    }
    if (!res.ok) {
      console.error("Gemini error", model, res.status, (await res.text()).slice(0, 500));
      return fail("UPSTREAM", "The ingredient scanner had a problem. Please try again.", 502);
    }

    const data = await res.json();
    const text: string | undefined = data?.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p.text ?? "")
      .join("");
    let result: GeminiResult;
    try {
      result = JSON.parse(text ?? "");
    } catch {
      console.error("Gemini returned non-JSON", model, data?.candidates?.[0]?.finishReason);
      return fail("UPSTREAM", "The ingredient scanner had a problem. Please try again.", 502);
    }

    const ingredients = cleanIngredients(result.ingredients);
    if (!ingredients.length) {
      if (result.photoQuality !== "good") {
        return fail("BLURRY", "The photo is too blurry or dark to read.", 422);
      }
      return fail("NO_FOOD", "No food was found in this photo.", 422);
    }
    return json({ ingredients, model, photoQuality: result.photoQuality }, 200, { "cache-control": "no-store" });
  }

  if (lastStatus === 429) return fail("QUOTA", "The free Gemini limit has been reached for now.", 429);
  return fail("BUSY", "The ingredient scanner is busy right now. Please try again in a minute.", 503);
};

function cleanIngredients(raw: GeminiResult["ingredients"] | undefined) {
  const seen = new Set<string>();
  const out: { name: string; confidence: number }[] = [];
  for (const item of raw ?? []) {
    const name = String(item?.name ?? "").trim().toLowerCase().slice(0, 40);
    if (!name || seen.has(name)) continue;
    seen.add(name);
    const confidence = Math.min(1, Math.max(0, Number(item.confidence) || 0));
    out.push({ name, confidence: Math.round(confidence * 100) / 100 });
  }
  return out.sort((a, b) => b.confidence - a.confidence).slice(0, 25);
}

export const config: Config = { path: "/api/analyze-photo" };
