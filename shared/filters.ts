// Search filters (PRD F8), shared by the React app and the Netlify Functions.

export const MEALS = ["breakfast", "lunch", "dinner", "snack", "dessert"] as const;
export const DIETS = ["vegetarian", "vegan", "high-protein"] as const;
export const MAX_MINUTES = [15, 30, 60] as const;

export type Meal = (typeof MEALS)[number];
export type Diet = (typeof DIETS)[number];
export type MaxMinutes = (typeof MAX_MINUTES)[number];

export interface Filters {
  meal?: Meal;
  diet?: Diet;
  /** Longest video length to show, in minutes. */
  maxMinutes?: MaxMinutes;
}

/** What Gemini says each detected ingredient is, so diet filters can leave items out. */
export const INGREDIENT_KINDS = ["meat", "seafood", "dairy", "egg", "plant"] as const;
export type IngredientKind = (typeof INGREDIENT_KINDS)[number];

/** Whether an ingredient fits the chosen diet. Unknown kinds (typed in by the user) are always kept. */
export function fitsDiet(kind: IngredientKind | undefined, diet: Diet | undefined): boolean {
  if (!kind || !diet || diet === "high-protein") return true;
  if (diet === "vegetarian") return kind !== "meat" && kind !== "seafood";
  return kind === "plant"; // vegan
}

/** Extra words added to the YouTube query, e.g. ["vegan", "breakfast"]. */
export function queryTerms(f: Filters): string[] {
  const terms: string[] = [];
  if (f.diet) terms.push(f.diet === "high-protein" ? "high protein" : f.diet);
  if (f.meal) terms.push(f.meal);
  return terms;
}

export function filtersToParams(f: Filters): Record<string, string> {
  const p: Record<string, string> = {};
  if (f.meal) p.meal = f.meal;
  if (f.diet) p.diet = f.diet;
  if (f.maxMinutes) p.max = String(f.maxMinutes);
  return p;
}

/** Reads filters from query params or a JSON body, ignoring anything unexpected. */
export function parseFilters(src: { meal?: unknown; diet?: unknown; max?: unknown; maxMinutes?: unknown }): Filters {
  const f: Filters = {};
  if ((MEALS as readonly unknown[]).includes(src.meal)) f.meal = src.meal as Meal;
  if ((DIETS as readonly unknown[]).includes(src.diet)) f.diet = src.diet as Diet;
  const max = Number(src.max ?? src.maxMinutes);
  if ((MAX_MINUTES as readonly number[]).includes(max)) f.maxMinutes = max as MaxMinutes;
  return f;
}
