import { useState } from "react";
import type { Ingredient } from "../lib/types";

interface Props {
  ingredients: Ingredient[];
  onChange: (next: Ingredient[]) => void;
  /** Names that will be used in the YouTube search, highlighted on the chips. */
  searchNames: string[];
  /** Names left out because they don't fit the diet filter, e.g. "chicken" when vegan. */
  excluded: Set<string>;
  /** Shown on excluded chips, e.g. "vegan". */
  dietLabel?: string;
}

export function IngredientChips({ ingredients, onChange, searchNames, excluded, dietLabel }: Props) {
  const [draft, setDraft] = useState("");

  function add(e: React.FormEvent) {
    e.preventDefault();
    const names = draft
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const existing = new Set(ingredients.map((i) => i.name));
    const added = names.filter((n) => !existing.has(n)).map((name) => ({ name, confidence: 1, userAdded: true }));
    if (added.length) onChange([...added, ...ingredients]);
    setDraft("");
  }

  function remove(name: string) {
    onChange(ingredients.filter((i) => i.name !== name));
  }

  return (
    <div className="chips-block">
      {ingredients.length > 0 ? (
        <ul className="chips" aria-label="Ingredients">
          {ingredients.map((i) => {
            const inSearch = searchNames.includes(i.name);
            const out = excluded.has(i.name);
            const cls = out ? "chip chip--excluded" : inSearch ? "chip chip--search" : "chip";
            return (
              <li key={i.name} className={cls} title={out ? `Not ${dietLabel}, so it's left out of the search` : undefined}>
                <span className="chip__name">{i.name}</span>
                {out && <span className="visually-hidden"> (not {dietLabel}, left out)</span>}
                {!i.userAdded && i.confidence < 0.6 && (
                  <span className="chip__unsure" title="Gemini isn't sure about this one">?</span>
                )}
                <button type="button" className="chip__remove" onClick={() => remove(i.name)} aria-label={`Remove ${i.name}`}>
                  <svg aria-hidden="true" viewBox="0 0 16 16" width="14" height="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M4 4l8 8M12 4l-8 8" />
                  </svg>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="muted">No ingredients yet. Add what you have below.</p>
      )}

      <form className="add-form" onSubmit={add}>
        <label htmlFor="add-ingredient" className="visually-hidden">
          Add an ingredient
        </label>
        <input
          id="add-ingredient"
          className="input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add an ingredient, e.g. rice"
          autoComplete="off"
          maxLength={80}
        />
        <button type="submit" className="btn btn--secondary" disabled={!draft.trim()}>
          Add
        </button>
      </form>
      {searchNames.length > 0 && (
        <p className="hint">
          Searching with the {searchNames.length === 1 ? "highlighted ingredient" : `${searchNames.length} highlighted ingredients`}.
          Remove ones you don't want to cook with.
          {excluded.size > 0 && ` Crossed-out items aren't ${dietLabel}.`}
        </p>
      )}
      {searchNames.length === 0 && excluded.size > 0 && (
        <p className="hint">None of these are {dietLabel}. Add an ingredient or change the diet filter.</p>
      )}
    </div>
  );
}
