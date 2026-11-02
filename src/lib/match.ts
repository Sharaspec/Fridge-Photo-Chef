import type { RecipeIngredient } from "./types";

/** "tomatoes" -> "tomato", "Cherry  Tomatoes!" -> ["cherry", "tomato"] */
function words(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (w.endsWith("oes") ? w.slice(0, -2) : w.endsWith("ies") ? w.slice(0, -3) + "y" : w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w));
}

/**
 * Whether the user has an ingredient, by comparing words: "cheese" matches
 * "cheddar cheese", "carrots" matches "carrot", but "chicken breast" does not
 * match "chicken leg".
 */
export function haveIngredient(name: string, have: string[]): boolean {
  const need = words(name);
  if (!need.length) return false;
  return have.some((h) => {
    const got = words(h);
    return got.length > 0 && (need.every((w) => got.includes(w)) || got.every((w) => need.includes(w)));
  });
}

export interface ShoppingSplit {
  have: RecipeIngredient[];
  buy: RecipeIngredient[];
  staples: RecipeIngredient[];
}

export function splitShopping(ingredients: RecipeIngredient[], have: string[]): ShoppingSplit {
  const out: ShoppingSplit = { have: [], buy: [], staples: [] };
  for (const i of ingredients) {
    if (haveIngredient(i.name, have)) out.have.push(i);
    else if (i.staple) out.staples.push(i);
    else out.buy.push(i);
  }
  return out;
}

/** "1:05" -> 65, "1:02:03" -> 3723, anything else -> null */
export function timeToSeconds(t: string): number | null {
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(t.trim());
  if (!m) return null;
  const [a, b, c] = [Number(m[1]), Number(m[2]), m[3] === undefined ? null : Number(m[3])];
  return c === null ? a * 60 + b : a * 3600 + b * 60 + c;
}
