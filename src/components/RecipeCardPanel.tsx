import { useEffect, useState } from "react";
import { getRecipeCard } from "../lib/api";
import { splitShopping, timeToSeconds } from "../lib/match";
import type { RecipeCard, RecipeIngredient } from "../lib/types";
import { videoErrorMessage } from "./videoErrors";

interface Props {
  videoId: string;
  /** Ingredient names the user has (from their fridge photo). */
  have: string[];
  onSeek: (seconds: number) => void;
}

/** PRD F11: the video as a written recipe card, plus a shopping list for what's missing. */
export function RecipeCardPanel({ videoId, have, onSeek }: Props) {
  const [card, setCard] = useState<RecipeCard | null>(null);
  const [error, setError] = useState<{ message: string; retryable: boolean } | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    setCard(null);
    setError(null);
    getRecipeCard(videoId)
      .then((c) => live && setCard(c))
      .catch((err) => live && setError(videoErrorMessage(err)));
    return () => {
      live = false;
    };
  }, [videoId, attempt]);

  if (error) {
    return (
      <div className="alert" role="alert">
        <span>{error.message}</span>
        {error.retryable && (
          <button type="button" className="btn btn--small" onClick={() => setAttempt((a) => a + 1)}>
            Try again
          </button>
        )}
      </div>
    );
  }

  if (!card) {
    return (
      <div className="loading loading--left" role="status">
        <span className="spinner" aria-hidden="true" />
        Gemini is watching the video and writing the recipe… this can take up to a minute.
      </div>
    );
  }

  const split = splitShopping(card.ingredients, have);
  const meta = [card.servings && `Serves ${card.servings}`, card.totalTime].filter(Boolean).join(" · ");

  return (
    <article className="recipe" aria-labelledby="recipe-title">
      <header className="recipe__head">
        <h3 id="recipe-title">{card.title}</h3>
        {meta && <p className="muted">{meta}</p>}
      </header>

      <ShoppingList split={split} title={card.title} hasFridge={have.length > 0} />

      <section aria-labelledby="ing-title">
        <h4 id="ing-title">Ingredients</h4>
        <ul className="recipe__ingredients">
          {card.ingredients.map((i) => {
            const got = split.have.includes(i);
            return (
              <li key={i.name + i.amount} className={got ? "ing ing--have" : "ing"}>
                <span className="ing__mark" aria-hidden="true">{got ? "✓" : i.staple ? "•" : "+"}</span>
                <span>
                  <strong>{i.name}</strong>
                  {i.amount && <span className="muted"> — {i.amount}</span>}
                  {got && <span className="visually-hidden"> (you have this)</span>}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {card.steps.length > 0 && (
        <section aria-labelledby="steps-title">
          <h4 id="steps-title">Steps</h4>
          <ol className="recipe__steps">
            {card.steps.map((s, n) => {
              const secs = timeToSeconds(s.time);
              return (
                <li key={n}>
                  <span>{s.text}</span>
                  {secs !== null && (
                    <button type="button" className="time-link" onClick={() => onSeek(secs)} aria-label={`Watch this step at ${s.time}`}>
                      ▶ {s.time}
                    </button>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {card.tips.length > 0 && (
        <section aria-labelledby="tips-title">
          <h4 id="tips-title">Tips</h4>
          <ul className="recipe__tips">
            {card.tips.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </section>
      )}

      <p className="hint">Written by Gemini from the video. Amounts starting with “~” are estimates; check allergens yourself.</p>
    </article>
  );
}

function ShoppingList({ split, title, hasFridge }: { split: ReturnType<typeof splitShopping>; title: string; hasFridge: boolean }) {
  const [copied, setCopied] = useState(false);
  const line = (i: RecipeIngredient) => `${i.name}${i.amount ? ` (${i.amount})` : ""}`;
  const text = [
    `Shopping list: ${title}`,
    ...split.buy.map((i) => `- ${line(i)}`),
    ...(split.staples.length ? ["", `Check you have: ${split.staples.map((i) => i.name).join(", ")}`] : []),
  ].join("\n");

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked; the list is still on screen */
    }
  }

  const canShare = typeof navigator !== "undefined" && "share" in navigator;

  return (
    <section className="shopping" aria-labelledby="shop-title">
      <h4 id="shop-title">
        {split.buy.length ? `Shopping list · ${split.buy.length} to buy` : "Shopping list"}
      </h4>
      {split.buy.length ? (
        <ul>
          {split.buy.map((i) => (
            <li key={i.name + i.amount}>{line(i)}</li>
          ))}
        </ul>
      ) : (
        <p>{hasFridge ? "You have everything you need. Nice!" : "Nothing to buy beyond the basics."}</p>
      )}
      {split.staples.length > 0 && <p className="muted">Check you have: {split.staples.map((i) => i.name).join(", ")}</p>}
      {!hasFridge && <p className="hint">Take a fridge photo first to leave out what you already have.</p>}
      {split.buy.length > 0 && (
        <div className="shopping__actions">
          <button type="button" className="btn btn--secondary" onClick={copy}>
            {copied ? "Copied!" : "Copy list"}
          </button>
          {canShare && (
            <button type="button" className="btn btn--secondary" onClick={() => navigator.share({ title: `Shopping list: ${title}`, text }).catch(() => {})}>
              Share
            </button>
          )}
          <span className="visually-hidden" role="status">{copied ? "Shopping list copied" : ""}</span>
        </div>
      )}
    </section>
  );
}
