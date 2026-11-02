import { filtersToParams, fitsDiet, type Diet, type Filters } from "../../shared/filters";
import { AppError, type Dish, type ErrorCode, type Ingredient, type Video } from "./types";

const MAX_SEARCH_INGREDIENTS = 5; // PRD F4: top 3–5 ingredients
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_PREFIX = "fpc:videos:";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new AppError("NETWORK", "You seem to be offline. Check your connection and try again.");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const code: ErrorCode = data?.error?.code ?? "UPSTREAM";
    throw new AppError(code, data?.error?.message ?? "Something went wrong. Please try again.");
  }
  return data as T;
}

export async function analyzePhoto(base64: string, mimeType: string): Promise<Ingredient[]> {
  const data = await request<{ ingredients: Ingredient[] }>("/api/analyze-photo", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ image: base64, mimeType }),
  });
  return data.ingredients;
}

/** Ingredients that fit the chosen diet (e.g. no chicken when vegetarian). */
export function dietIngredients(ingredients: Ingredient[], diet: Diet | undefined): Ingredient[] {
  return ingredients.filter((i) => fitsDiet(i.kind, diet));
}

/** The ingredients used for the search: the most confident (typed-in ones count as certain), in a stable order. */
export function searchIngredients(ingredients: Ingredient[], diet?: Diet): string[] {
  return dietIngredients(ingredients, diet)
    .sort((a, b) => (b.userAdded ? 1 : b.confidence) - (a.userAdded ? 1 : a.confidence))
    .slice(0, MAX_SEARCH_INGREDIENTS)
    .map((i) => i.name.toLowerCase())
    .sort(); // sorted so the same set always hits the same cache entry
}

/** What to search YouTube for: the ingredient list, or one dish Gemini suggested. */
export type SearchTarget = { kind: "ingredients"; names: string[] } | { kind: "dish"; name: string };

export function targetKey(t: SearchTarget, f: Filters): string {
  const params = new URLSearchParams(
    t.kind === "dish" ? { dish: t.name, ...filtersToParams(f) } : { ingredients: t.names.join(","), ...filtersToParams(f) },
  );
  return params.toString();
}

export async function findVideos(target: SearchTarget, filters: Filters): Promise<{ query: string; videos: Video[] }> {
  const qs = targetKey(target, filters);
  const key = CACHE_PREFIX + qs;
  const cached = readCache<{ query: string; videos: Video[] }>(key);
  if (cached) return cached;

  const data = await request<{ query: string; videos: Video[] }>(`/api/find-videos?${qs}`);
  writeCache(key, data);
  return data;
}

export async function suggestDishes(ingredients: string[], filters: Filters): Promise<Dish[]> {
  const data = await request<{ dishes: Dish[] }>("/api/suggest-dishes", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ingredients, ...filters }),
  });
  return data.dishes;
}

// Browser-side cache, so repeat searches on this device cost no YouTube quota at all.
function readCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { at, value } = JSON.parse(raw);
    if (Date.now() - at > CACHE_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return value as T;
  } catch {
    return null;
  }
}

function writeCache(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify({ at: Date.now(), value }));
  } catch {
    /* storage full or blocked: caching is optional */
  }
}

const FILTERS_KEY = "fpc:filters";

export function loadFilters(): Filters {
  try {
    return JSON.parse(localStorage.getItem(FILTERS_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function saveFilters(f: Filters) {
  try {
    localStorage.setItem(FILTERS_KEY, JSON.stringify(f));
  } catch {
    /* optional */
  }
}
