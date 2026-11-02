import { AppError, type ErrorCode, type Ingredient, type Video } from "./types";

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

/** The ingredients used for the search: the most confident (typed-in ones count as certain), in a stable order. */
export function searchIngredients(ingredients: Ingredient[]): string[] {
  return [...ingredients]
    .sort((a, b) => (b.userAdded ? 1 : b.confidence) - (a.userAdded ? 1 : a.confidence))
    .slice(0, MAX_SEARCH_INGREDIENTS)
    .map((i) => i.name.toLowerCase())
    .sort(); // sorted so the same set always hits the same cache entry
}

export async function findVideos(names: string[]): Promise<{ query: string; videos: Video[] }> {
  const key = CACHE_PREFIX + names.join(",");
  const cached = readCache<{ query: string; videos: Video[] }>(key);
  if (cached) return cached;

  const data = await request<{ query: string; videos: Video[] }>(
    `/api/find-videos?ingredients=${encodeURIComponent(names.join(","))}`,
  );
  writeCache(key, data);
  return data;
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
