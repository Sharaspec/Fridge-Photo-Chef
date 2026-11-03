import type { SearchTarget } from "../lib/api";
import type { Dish } from "../lib/types";

interface Props {
  dishes: Dish[] | null;
  dishesLoading: boolean;
  active: SearchTarget | null;
  onPick: (target: SearchTarget | "ingredients") => void;
  disabled: boolean;
}

/**
 * PRD F9: "Your ingredients" plus up to 3 Gemini dish ideas. Tapping one searches
 * YouTube for it. Rendered as a group of toggle buttons (aria-pressed).
 */
export function SearchTabs({ dishes, dishesLoading, active, onPick, disabled }: Props) {
  if (!dishesLoading && !dishes?.length) return null;
  return (
    <div className="dish-ideas">
      <h3 className="dish-ideas__title">
        <SparkIcon /> Dish ideas from Gemini
      </h3>
      <div className="dish-ideas__list" role="group" aria-label="Choose what to search for">
        <button
          type="button"
          className="dish dish--all"
          aria-pressed={active?.kind === "ingredients"}
          onClick={() => onPick("ingredients")}
          disabled={disabled}
        >
          <span className="dish__name">All matches</span>
          <span className="dish__desc">Videos using your top ingredients</span>
        </button>
        {dishesLoading &&
          [0, 1, 2].map((i) => (
            <div key={i} className="dish dish--skeleton" aria-hidden="true">
              <span />
              <span />
            </div>
          ))}
        {dishes?.map((d) => (
          <button
            key={d.name}
            type="button"
            className="dish"
            aria-pressed={active?.kind === "dish" && active.name === d.name}
            onClick={() => onPick({ kind: "dish", name: d.name })}
            disabled={disabled}
          >
            <span className="dish__name">{d.name}</span>
            <span className="dish__desc">{d.description}</span>
          </button>
        ))}
      </div>
      {dishesLoading && <p className="visually-hidden">Loading dish ideas…</p>}
    </div>
  );
}

function SparkIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M12 2l1.9 5.6L19.5 9.5l-5.6 1.9L12 17l-1.9-5.6L4.5 9.5l5.6-1.9zM19 15l.9 2.6 2.6.9-2.6.9L19 22l-.9-2.6-2.6-.9 2.6-.9z" />
    </svg>
  );
}
