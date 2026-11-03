// POST /api/suggest-dishes   (PRD F9)
// Body: { ingredients: string[], meal?, diet?, maxMinutes? }
// Returns: { dishes: [{ name, description, uses: string[] }] }  — exactly 3 when Gemini cooperates

import type { Config } from "@netlify/functions";
import { parseFilters, type Filters } from "../../shared/filters.ts";
import { geminiJson } from "../lib/gemini.ts";
import { cleanText, fail, json } from "../lib/shared.ts";

const SCHEMA = {
  type: "object",
  properties: {
    dishes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          uses: { type: "array", items: { type: "string" } },
        },
        required: ["name", "description", "uses"],
      },
    },
  },
  required: ["dishes"],
};

interface Dish {
  name: string;
  description: string;
  uses: string[];
}

function prompt(ingredients: string[], f: Filters): string {
  const rules = [
    f.diet === "vegan" && "Every dish must be vegan.",
    f.diet === "vegetarian" && "Every dish must be vegetarian (no meat or seafood).",
    f.diet === "high-protein" && "Every dish should be high in protein.",
    f.meal && `Every dish should suit ${f.meal}.`,
    f.maxMinutes && `Every dish should take under ${f.maxMinutes} minutes in total.`,
  ].filter(Boolean);
  return `A home cook has these ingredients: ${ingredients.join(", ")}.
Suggest 3 different dishes they could make, each using several of these ingredients.
They also have basic pantry staples (salt, pepper, oil, butter, flour, sugar, common spices).
${rules.join("\n")}
- name: the common name people would search on YouTube, 2–5 words, no brand names (e.g. "Vegetable fried rice").
- description: one short sentence, at most 14 words.
- uses: which of the given ingredients the dish uses, spelled exactly as given.
Make the 3 dishes clearly different from each other (e.g. not three omelettes).
Write plain ASCII only, with no accents (e.g. "sauteed", "jalapeno").`;
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== "POST") return fail("BAD_REQUEST", "Use POST.", 405);

  let body: { ingredients?: unknown; meal?: unknown; diet?: unknown; maxMinutes?: unknown };
  try {
    body = await req.json();
  } catch {
    return fail("BAD_REQUEST", "Expected a JSON body.", 400);
  }
  const ingredients = (Array.isArray(body.ingredients) ? body.ingredients : [])
    .filter((s): s is string => typeof s === "string")
    .map((s) => s.trim().slice(0, 40))
    .filter(Boolean)
    .slice(0, 25);
  if (!ingredients.length) return fail("BAD_REQUEST", "Add at least one ingredient.", 400);

  const out = await geminiJson<{ dishes: Dish[] }>({
    parts: [{ text: prompt(ingredients, parseFilters(body)) }],
    schema: SCHEMA,
    temperature: 0.7,
    thinkingLevel: "low",
    budgetMs: 20_000,
    failMessage: "Couldn't come up with dish ideas right now.",
  });
  if (out instanceof Response) return out;

  const given = new Set(ingredients.map((i) => i.toLowerCase()));
  const dishes = (out.data.dishes ?? [])
    .map((d) => ({
      name: cleanText(d.name, 60),
      description: cleanText(d.description, 140),
      uses: (d.uses ?? []).map((u) => cleanText(u, 40).toLowerCase()).filter((u) => given.has(u)),
    }))
    .filter((d) => d.name)
    .slice(0, 3);

  return json({ dishes, model: out.model }, 200, { "cache-control": "no-store" });
};

export const config: Config = { path: "/api/suggest-dishes" };
