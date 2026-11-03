// GET /api/recipe-card?id=<YouTube video id>     (PRD F11)
// Returns: { recipe: { title, servings, totalTime, ingredients: [{ name, amount, staple }], steps: [{ text, time }], tips } }
//
// Gemini watches the video (and reads its description, where many creators put exact
// amounts). The card doesn't depend on the user, so it's cached on Netlify's CDN for a
// week: each video is analyzed once, not once per visitor. The shopping list is worked
// out in the browser by comparing the card against the user's own ingredients.

import type { Config } from "@netlify/functions";
import { geminiJson } from "../lib/gemini.ts";
import { cleanText, env, fail, json } from "../lib/shared.ts";
import { fetchVideoMeta, VIDEO_ID, videoPart } from "../lib/youtube.ts";

// ~1.3 s of Gemini time per video minute; 35 min keeps us well inside Netlify's 60 s limit.
const MAX_VIDEO_SECONDS = 35 * 60;
const WEEK_SECONDS = 7 * 86_400;

const SCHEMA = {
  type: "object",
  properties: {
    isRecipe: { type: "boolean" },
    title: { type: "string" },
    servings: { type: "string" },
    totalTime: { type: "string" },
    ingredients: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          amount: { type: "string" },
          staple: { type: "boolean" },
        },
        required: ["name", "amount", "staple"],
      },
    },
    steps: {
      type: "array",
      items: {
        type: "object",
        properties: { text: { type: "string" }, time: { type: "string" } },
        required: ["text", "time"],
      },
    },
    tips: { type: "array", items: { type: "string" } },
  },
  required: ["isRecipe", "title", "servings", "totalTime", "ingredients", "steps", "tips"],
};

interface Raw {
  isRecipe: boolean;
  title: string;
  servings: string;
  totalTime: string;
  ingredients: { name: string; amount: string; staple: boolean }[];
  steps: { text: string; time: string }[];
  tips: string[];
}

function prompt(title: string, description: string): string {
  return `Watch this cooking video and write it up as a recipe card.
Video title: ${title}
Video description (may contain the written recipe; if it does, prefer its exact amounts):
"""
${description.slice(0, 4000)}
"""
Rules:
- isRecipe: false if the video does not show how to cook a dish. Then leave the other fields empty.
- title: the dish name, short.
- servings and totalTime: as stated, or a sensible estimate prefixed with "~" (e.g. "~4", "~25 min"). Empty if unknown.
- ingredients: every ingredient used. name = plain grocery name for a shopping list, lowercase, singular
  (e.g. "garlic", "soy sauce", "chicken thigh"). amount = quantity and prep (e.g. "3 cloves, minced");
  if the amount is not stated, estimate it and start it with "~". List what you would buy: split mixtures
  into their raw ingredients (a "slurry" is cornstarch + water; "stock" made in the video is not bought).
  staple = true only for salt, pepper,
  water, cooking oil and sugar.
- steps: short imperative steps in order, at most 12. time = when the step starts in the video as "M:SS" (or "" if unsure).
- tips: up to 3 short tips shown in the video. May be empty.
- Write plain ASCII only, with no accents.`;
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== "GET") return fail("BAD_REQUEST", "Use GET.", 405);
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!VIDEO_ID.test(id)) return fail("BAD_REQUEST", "That isn't a YouTube video id.", 400);

  const ytKey = env("YOUTUBE_API_KEY");
  if (!ytKey) return fail("CONFIG", "The server is missing its YouTube API key.", 500);

  const meta = await fetchVideoMeta(id, ytKey);
  if (meta instanceof Response) return meta;
  if (!meta || !meta.isPublic) return fail("VIDEO_UNAVAILABLE", "This video isn't public, so Gemini can't watch it.", 422);
  if (meta.durationSeconds > MAX_VIDEO_SECONDS) {
    return fail("VIDEO_UNAVAILABLE", "This video is over 35 minutes long, too long to turn into a recipe card.", 422);
  }

  const out = await geminiJson<Raw>({
    parts: [videoPart(meta), { text: prompt(meta.title, meta.description) }],
    schema: SCHEMA,
    thinkingLevel: "low",
    mediaResolution: "MEDIA_RESOLUTION_LOW",
    budgetMs: 55_000, // Netlify allows 60 s for a synchronous function
    failMessage: "Couldn't turn this video into a recipe card. Please try again.",
  });
  if (out instanceof Response) return out;
  const r = out.data;

  if (!r.isRecipe || !r.ingredients?.length) {
    return json({ error: { code: "NOT_RECIPE", message: "This video doesn't look like a recipe." } }, 422, {
      "cache-control": "public, max-age=3600",
      "netlify-cdn-cache-control": `public, durable, s-maxage=${WEEK_SECONDS}`,
      "netlify-vary": "query=id",
    });
  }

  const recipe = {
    title: cleanText(r.title, 80) || cleanText(meta.title, 80),
    servings: cleanText(r.servings, 20),
    totalTime: cleanText(r.totalTime, 20),
    ingredients: r.ingredients
      .map((i) => ({ name: cleanText(i.name, 40).toLowerCase(), amount: cleanText(i.amount, 60), staple: Boolean(i.staple) }))
      .filter((i) => i.name)
      .slice(0, 40),
    steps: (r.steps ?? [])
      .map((s) => ({ text: cleanText(s.text, 300), time: /^\d{1,2}(:\d{2}){1,2}$/.test(s.time?.trim() ?? "") ? s.time.trim() : "" }))
      .filter((s) => s.text)
      .slice(0, 12),
    tips: (r.tips ?? []).map((t) => cleanText(t, 200)).filter(Boolean).slice(0, 3),
  };

  return json({ recipe, model: out.model }, 200, {
    "cache-control": "public, max-age=86400",
    "netlify-cdn-cache-control": `public, durable, s-maxage=${WEEK_SECONDS}`,
    "netlify-vary": "query=id",
  });
};

export const config: Config = { path: "/api/recipe-card" };
