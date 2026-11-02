// POST /api/analyze-photo
// Body: { image: <base64, no data: prefix>, mimeType: "image/jpeg" | "image/png" | "image/heic" | ... }
// Returns: { ingredients: [{ name, confidence, kind }], model }
//
// The photo is forwarded to Gemini and never stored.

import type { Config } from "@netlify/functions";
import { INGREDIENT_KINDS, type IngredientKind } from "../../shared/filters.ts";
import { geminiJson } from "../lib/gemini.ts";
import { cleanText, fail, json } from "../lib/shared.ts";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
// Netlify caps request bodies at 6 MB; base64 adds ~33%, so keep the decoded image under ~4.4 MB.
const MAX_BASE64_CHARS = 5_900_000;

const PROMPT = `You are looking at a photo of the inside of a fridge, freezer, pantry or a kitchen counter.
List the distinct food ingredients you can see that someone could cook with.
Rules:
- Use short, common grocery names in plain ASCII English (no accents), singular where natural (e.g. "egg", "spinach", "cheddar cheese", "chicken breast").
- Merge duplicates. Skip non-food items, containers you cannot see into, and condiments unless clearly visible.
- confidence is 0 to 1: how sure you are the item is present and correctly named.
- kind is what the ingredient is: "meat" (incl. poultry, ham, bacon), "seafood", "dairy", "egg", or "plant" (everything else, incl. grains, tofu, oils).
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
          kind: { type: "string", enum: [...INGREDIENT_KINDS] },
        },
        required: ["name", "confidence", "kind"],
      },
    },
  },
  required: ["foodDetected", "photoQuality", "ingredients"],
};

interface GeminiResult {
  foodDetected: boolean;
  photoQuality: "good" | "blurry" | "dark";
  ingredients: { name: string; confidence: number; kind: IngredientKind }[];
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== "POST") return fail("BAD_REQUEST", "Use POST.", 405);

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

  const out = await geminiJson<GeminiResult>({
    parts: [{ inline_data: { mime_type: mimeType, data: image } }, { text: PROMPT }],
    schema: SCHEMA,
    thinkingLevel: "low",
    failMessage: "The ingredient scanner had a problem. Please try again.",
  });
  if (out instanceof Response) return out;
  const { data: result, model } = out;

  const ingredients = cleanIngredients(result.ingredients);
  if (!ingredients.length) {
    if (result.photoQuality !== "good") return fail("BLURRY", "The photo is too blurry or dark to read.", 422);
    return fail("NO_FOOD", "No food was found in this photo.", 422);
  }
  return json({ ingredients, model, photoQuality: result.photoQuality }, 200, { "cache-control": "no-store" });
};

function cleanIngredients(raw: GeminiResult["ingredients"] | undefined) {
  const seen = new Set<string>();
  const out: { name: string; confidence: number; kind: IngredientKind }[] = [];
  for (const item of raw ?? []) {
    const name = cleanText(item?.name, 40).toLowerCase();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    const confidence = Math.min(1, Math.max(0, Number(item.confidence) || 0));
    const kind = INGREDIENT_KINDS.includes(item.kind) ? item.kind : "plant";
    out.push({ name, confidence: Math.round(confidence * 100) / 100, kind });
  }
  return out.sort((a, b) => b.confidence - a.confidence).slice(0, 25);
}

export const config: Config = { path: "/api/analyze-photo" };
