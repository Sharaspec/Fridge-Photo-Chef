import { useEffect, useMemo, useRef, useState } from "react";
import type { Filters } from "../shared/filters";
import { FilterBar } from "./components/FilterBar";
import { CookIcon, SnapIcon, TweakIcon } from "./components/Illustrations";
import { Polaroid, SampleScene } from "./components/Polaroid";
import { IngredientChips } from "./components/IngredientChips";
import { PhotoPicker } from "./components/PhotoPicker";
import { SearchTabs } from "./components/SearchTabs";
import { VideoGrid } from "./components/VideoGrid";
import { VideoPlayer } from "./components/VideoPlayer";
import {
  analyzePhoto,
  dietIngredients,
  findVideos,
  loadFilters,
  saveFilters,
  searchIngredients,
  suggestDishes,
  targetKey,
  type SearchTarget,
} from "./lib/api";
import { useFavorites } from "./lib/favorites";
import { prepareImage } from "./lib/image";
import { SAMPLES, type SampleFridge, type SampleId } from "./lib/samples";
import { AppError, type Dish, type Ingredient, type Video } from "./lib/types";

type Busy = null | "preparing" | "analyzing" | "searching";

const BUSY_TEXT: Record<Exclude<Busy, null>, string> = {
  preparing: "Getting your photo ready…",
  analyzing: "Developing… spotting ingredients",
  searching: "Finding recipe videos…",
};

const SAMPLE_TILTS = [-4, 3, -2, 4];
const today = new Intl.DateTimeFormat("en", { weekday: "long" }).format(new Date());

interface UiError {
  where: "photo" | "search";
  message: string;
  retry?: () => void;
}

interface Results {
  target: SearchTarget;
  filters: Filters;
  videos: Video[];
}

const RETRYABLE = new Set(["BUSY", "UPSTREAM", "NETWORK"]);

/** Turns an error into a friendly, actionable message (PRD: no food, blurry, quota, no videos). */
function friendly(err: unknown, during: "photo" | "search"): string {
  if (!(err instanceof AppError)) return "Something went wrong. Please try again.";
  switch (err.code) {
    case "NO_FOOD":
      return "We couldn't spot any food in that photo. Try again with the fridge door wide open, or add ingredients by hand below.";
    case "BLURRY":
      return "That photo looks blurry or too dark. Turn on a light, hold steady and try again, or add ingredients by hand below.";
    case "QUOTA":
      return during === "search"
        ? "We've used up today's free YouTube searches. Please try again tomorrow."
        : "The free ingredient scanner has hit its limit for now. Wait a minute and try again, or add ingredients by hand below.";
    case "BUSY":
      return during === "photo"
        ? "The ingredient scanner is busy right now. Try again in a minute, or add ingredients by hand below."
        : "The service is busy right now. Please try again in a minute.";
    case "NO_VIDEOS":
      return "No recipe videos matched. Try removing an ingredient or loosening the filters.";
    case "IMAGE_TOO_LARGE":
      return "That photo is too large to analyze. Try a smaller photo or a screenshot of it.";
    default:
      return err.message;
  }
}

const list = new Intl.ListFormat("en", { style: "long", type: "conjunction" });

function filterSummary(f: Filters): string {
  const parts = [
    f.diet && f.diet[0].toUpperCase() + f.diet.slice(1),
    f.meal && f.meal[0].toUpperCase() + f.meal.slice(1),
    f.maxMinutes && `under ${f.maxMinutes} min`,
  ].filter(Boolean);
  return parts.join(" · ");
}

export default function App() {
  const [busy, setBusy] = useState<Busy>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  /** Set when the user is exploring a sample fridge instead of their own photo. */
  const [sample, setSample] = useState<SampleId | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[] | null>(null);
  const [filters, setFilters] = useState<Filters>(loadFilters);
  const [results, setResults] = useState<Results | null>(null);
  /** The ingredient+filter search the current results and dish ideas came from. */
  const [basisKey, setBasisKey] = useState<string | null>(null);
  const [dishes, setDishes] = useState<Dish[] | null>(null);
  const [dishesLoading, setDishesLoading] = useState(false);
  const [error, setError] = useState<UiError | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [playing, setPlaying] = useState<Video | null>(null);
  const [view, setView] = useState<"main" | "saved">("main");
  const favorites = useFavorites();
  const savedRef = useRef<HTMLHeadingElement>(null);
  const resultsRef = useRef<HTMLHeadingElement>(null);
  const ingredientsRef = useRef<HTMLHeadingElement>(null);
  const searchSeq = useRef(0);
  const dishSeq = useRef(0);

  const searchNames = useMemo(
    () => (ingredients ? searchIngredients(ingredients, filters.diet) : []),
    [ingredients, filters.diet],
  );
  const excluded = useMemo(() => {
    if (!ingredients) return new Set<string>();
    const ok = new Set(dietIngredients(ingredients, filters.diet).map((i) => i.name));
    return new Set(ingredients.filter((i) => !ok.has(i.name)).map((i) => i.name));
  }, [ingredients, filters.diet]);
  const haveNames = useMemo(() => (ingredients ?? []).map((i) => i.name), [ingredients]);
  const currentKey = targetKey({ kind: "ingredients", names: searchNames }, filters);
  const stale = basisKey !== null && basisKey !== currentKey;

  useEffect(() => saveFilters(filters), [filters]);

  // Free the old preview image when a new one replaces it.
  useEffect(() => () => void (previewUrl && URL.revokeObjectURL(previewUrl)), [previewUrl]);

  async function handleFile(file: File) {
    setError(null);
    setResults(null);
    setBasisKey(null);
    setDishes(null);
    setSample(null);
    setPreviewUrl(null);
    setBusy("preparing");
    try {
      const img = await prepareImage(file);
      setPreviewUrl(img.previewUrl);
      setBusy("analyzing");
      const found = await analyzePhoto(img.base64, img.mimeType);
      setIngredients(found);
      setAnnouncement(`Found ${found.length} ingredients.`);
    } catch (err) {
      const retry = err instanceof AppError && (RETRYABLE.has(err.code) || err.code === "QUOTA") ? () => handleFile(file) : undefined;
      setError({ where: "photo", message: friendly(err, "photo"), retry });
      // When the scan itself fails, let the user carry on by typing ingredients.
      // (An unreadable file just stays on the current screen.)
      if (!(err instanceof AppError && err.code === "BAD_FILE")) setIngredients((prev) => prev ?? []);
    } finally {
      setBusy(null);
      requestAnimationFrame(() => ingredientsRef.current?.focus());
    }
  }

  /** Searches YouTube. With no target, it's a fresh "Find recipes" search that also refreshes dish ideas. */
  async function search(target?: SearchTarget) {
    const fresh = !target;
    const t: SearchTarget = target ?? { kind: "ingredients", names: searchNames };
    if (t.kind === "ingredients" && !t.names.length) return;
    const seq = ++searchSeq.current;
    setError(null);
    setBusy("searching");

    if (fresh) {
      setBasisKey(currentKey);
      if (currentKey !== basisKey || !dishes) loadDishes();
    }

    try {
      const { videos } = await findVideos(t, filters);
      if (seq !== searchSeq.current) return;
      setResults({ target: t, filters, videos });
      setAnnouncement(`Showing ${videos.length} videos${t.kind === "dish" ? ` for ${t.name}` : ""}.`);
      if (fresh) requestAnimationFrame(() => resultsRef.current?.focus());
    } catch (err) {
      if (seq !== searchSeq.current) return;
      if (fresh) setResults(null);
      const retry = err instanceof AppError && RETRYABLE.has(err.code) ? () => search(target) : undefined;
      setError({ where: "search", message: friendly(err, "search"), retry });
    } finally {
      if (seq === searchSeq.current) setBusy(null);
    }
  }

  async function loadDishes() {
    if (!ingredients) return;
    const seq = ++dishSeq.current;
    setDishes(null);
    setDishesLoading(true);
    try {
      const names = dietIngredients(ingredients, filters.diet).map((i) => i.name);
      const found = await suggestDishes(names, filters);
      if (seq === dishSeq.current) setDishes(found);
    } catch {
      // Dish ideas are a bonus; if Gemini can't help right now, just don't show them.
      if (seq === dishSeq.current) setDishes(null);
    } finally {
      if (seq === dishSeq.current) setDishesLoading(false);
    }
  }

  function pickSample(s: SampleFridge) {
    searchSeq.current++;
    dishSeq.current++;
    setError(null);
    setResults(null);
    setBasisKey(null);
    setDishes(null);
    setDishesLoading(false);
    setPreviewUrl(null);
    setSample(s.id);
    setIngredients(s.ingredients);
    setAnnouncement(`Opened the ${s.caption}: ${s.ingredients.length} ingredients.`);
    window.scrollTo({ top: 0 });
    requestAnimationFrame(() => ingredientsRef.current?.focus());
  }

  function pickTab(t: SearchTarget | "ingredients") {
    search(t === "ingredients" ? { kind: "ingredients", names: searchNames } : t);
  }

  function showView(next: "main" | "saved") {
    setView(next);
    window.scrollTo({ top: 0 });
    if (next === "saved") requestAnimationFrame(() => savedRef.current?.focus());
  }

  function startOver() {
    setView("main");
    searchSeq.current++;
    dishSeq.current++;
    setIngredients(null);
    setResults(null);
    setBasisKey(null);
    setDishes(null);
    setDishesLoading(false);
    setPreviewUrl(null);
    setSample(null);
    setError(null);
  }

  const dietLabel = filters.diet === "high-protein" ? undefined : filters.diet;
  const errorBox = (where: UiError["where"]) =>
    error?.where === where && (
      <div className="alert" role="alert">
        <span>{error.message}</span>
        {error.retry && (
          <button type="button" className="btn btn--small" onClick={error.retry} disabled={busy !== null}>
            Try again
          </button>
        )}
      </div>
    );

  return (
    <>
      <header className="site-header">
        <div className="wrap site-header__inner">
          <a className="brand" href="/" onClick={(e) => (e.preventDefault(), startOver())}>
            <img src="/favicon.svg" alt="" width="32" height="32" />
            <span>
              Fridge Photo Chef
              <span className="brand__tag" aria-hidden="true">snap · cook · enjoy</span>
            </span>
          </a>
          <button
            type="button"
            className="nav-saved"
            aria-pressed={view === "saved"}
            onClick={() => showView(view === "saved" ? "main" : "saved")}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill={favorites.length ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
              <path d="M12 20.5s-7.5-4.6-9.3-9.4C1.5 7.8 3.6 4.5 7 4.5c2.1 0 3.6 1.2 5 3 1.4-1.8 2.9-3 5-3 3.4 0 5.5 3.3 4.3 6.6-1.8 4.8-9.3 9.4-9.3 9.4z" />
            </svg>
            Saved{favorites.length > 0 && <span className="nav-saved__count">{favorites.length}</span>}
          </button>
        </div>
      </header>

      {view === "saved" && (
        <main className="saved">
          <div className="wrap">
          <div className="saved__head">
            <div>
              <p className="scribble">pinned in this browser</p>
              <h1 id="saved-title" ref={savedRef} tabIndex={-1}>
                Your recipe board
              </h1>
            </div>
            <button type="button" className="btn btn--secondary" onClick={() => showView("main")}>
              {ingredients ? "Back to my ingredients" : "Back"}
            </button>
          </div>
          {favorites.length ? (
            <>
              <p className="muted">Saved in this browser only. Clearing your browser data removes them.</p>
              <VideoGrid videos={favorites} onPlay={setPlaying} />
            </>
          ) : (
            <div className="empty">
              <Polaroid tilt={-3} caption="your favorites go here" fastener="pin">
                <SampleScene id="breakfast" />
              </Polaroid>
              <p>Tap the ♥ on any recipe video to pin it to your board.</p>
            </div>
          )}
          </div>
        </main>
      )}

      <main hidden={view !== "main"}>
        {ingredients === null && !busy && (
          <>
            <section className="hero" aria-labelledby="hero-title">
              <div className="wrap hero__inner">
                <div className="hero__copy">
                  <p className="scribble">psst… there's a dinner hiding in your fridge</p>
                  <h1 id="hero-title">
                    What can I cook with <span className="highlight">what I've got?</span>
                  </h1>
                  <p className="hero__lead">
                    Snap your fridge or pantry. We'll spot the ingredients, dream up dishes and find recipe videos you
                    can cook along with.
                  </p>
                  <PhotoPicker onFile={handleFile} disabled={busy !== null} />
                  <p className="tip">Tip: open the door wide, turn on the light and fit in as many shelves as you can.</p>
                </div>

                <div className="hero__board">
                  <h2 className="scribble scribble--board" id="samples-title">
                    No photo handy? Peek inside one of these
                  </h2>
                  <ul className="samples" aria-labelledby="samples-title">
                    {SAMPLES.map((s, n) => (
                      <li key={s.id}>
                        <button type="button" className="sample" onClick={() => pickSample(s)}>
                          <Polaroid tilt={SAMPLE_TILTS[n]} caption={s.caption}>
                            <SampleScene id={s.id} />
                          </Polaroid>
                          <span className="sample__blurb">{s.blurb}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            <section className="how wrap" aria-labelledby="how-title">
              <h2 id="how-title">How it works</h2>
              <ol className="how__steps">
                <li>
                  <SnapIcon />
                  <h3><span className="how__num">1</span> Snap</h3>
                  <p>Take a quick photo of your fridge, freezer or pantry shelf.</p>
                </li>
                <li>
                  <TweakIcon />
                  <h3><span className="how__num">2</span> Tweak</h3>
                  <p>Gemini lists what it sees. Fix anything, then pick a meal, time or diet.</p>
                </li>
                <li>
                  <CookIcon />
                  <h3><span className="how__num">3</span> Cook</h3>
                  <p>Watch recipe videos, get a recipe card and a shopping list for anything missing.</p>
                </li>
              </ol>
            </section>
          </>
        )}

        <div className="wrap">
        <div className="visually-hidden" role="status" aria-live="polite">
          {busy ? BUSY_TEXT[busy] : announcement}
        </div>
        {busy && busy !== "searching" && (
          <div className="developing">
            <Polaroid tilt={-2} caption={BUSY_TEXT[busy]} developing>
              {previewUrl ? <img src={previewUrl} alt="" /> : <span className="polaroid__blank" />}
            </Polaroid>
          </div>
        )}

        {errorBox("photo")}

        {ingredients !== null && (
          <section className="panel" aria-labelledby="ingredients-title">
            <div className="panel__head">
              {(previewUrl || sample) && (
                <Polaroid
                  tilt={-3}
                  className="panel__polaroid"
                  caption={sample ? SAMPLES.find((x) => x.id === sample)?.caption : `My fridge, ${today}`}
                >
                  {sample ? <SampleScene id={sample} /> : <img src={previewUrl!} alt="Your fridge photo" />}
                </Polaroid>
              )}
              <div>
                <p className="scribble">{sample ? "sample fridge" : previewUrl ? "here's what we spotted" : "let's get cooking"}</p>
                <h2 id="ingredients-title" ref={ingredientsRef} tabIndex={-1}>
                  {sample ? `Inside the ${SAMPLES.find((x) => x.id === sample)?.caption.toLowerCase()}` : "Your ingredients"}
                </h2>
                <p className="muted">
                  {ingredients.length
                    ? "Tap ✕ to remove anything that's wrong, and add anything we missed."
                    : "Type in what you have to search for recipes."}
                </p>
              </div>
            </div>

            <IngredientChips
              ingredients={ingredients}
              onChange={setIngredients}
              searchNames={searchNames}
              excluded={excluded}
              dietLabel={dietLabel}
            />

            <FilterBar filters={filters} onChange={setFilters} />

            <div className="panel__actions">
              <button
                type="button"
                className="btn btn--primary btn--lg"
                onClick={() => search()}
                disabled={busy !== null || searchNames.length === 0}
              >
                {stale ? "Update recipes" : "Find recipes"}
              </button>
              <PhotoPicker onFile={handleFile} disabled={busy !== null} compact hasPhoto={Boolean(previewUrl)} />
            </div>
          </section>
        )}

        {busy === "searching" && <Loading text={BUSY_TEXT.searching} />}
        {errorBox("search")}

        {(results || dishesLoading || dishes) && (
          <section className={stale ? "results results--stale" : "results"} aria-labelledby="results-title">
            <SearchTabs
              dishes={dishes}
              dishesLoading={dishesLoading}
              active={results?.target ?? null}
              onPick={pickTab}
              disabled={busy !== null}
            />
            {results && (
              <>
                <div className="results__head">
                  <p className="scribble">press play & cook along</p>
                  <h2 id="results-title" ref={resultsRef} tabIndex={-1}>
                    {results.target.kind === "dish" ? (
                      <>
                        Videos for <span className="highlight">{results.target.name}</span>
                      </>
                    ) : (
                      <>
                        Recipes with <span className="highlight">{list.format(results.target.names)}</span>
                      </>
                    )}
                  </h2>
                  {filterSummary(results.filters) && <p className="muted">{filterSummary(results.filters)}</p>}
                  {stale && <p className="hint">You changed your ingredients or filters. Tap “Update recipes” to refresh.</p>}
                </div>
                <VideoGrid videos={results.videos} onPlay={setPlaying} />
              </>
            )}
          </section>
        )}
        </div>
      </main>

      <footer className="site-footer wrap">
        <p className="scribble site-footer__sign">Happy cooking! ♥</p>
        <p>
          Your photo is sent to Google's Gemini AI to find ingredients and is not saved by this app. On Gemini's free tier,
          Google may use what you send to improve its products, so please don't upload anything private.
        </p>
        <p>Videos from YouTube. Dish ideas are AI-generated; check allergens yourself.</p>
      </footer>

      <VideoPlayer video={playing} onClose={() => setPlaying(null)} have={haveNames} />
    </>
  );
}

function Loading({ text }: { text: string }) {
  return (
    <div className="loading" aria-hidden="true">
      <span className="spinner" />
      {text}
    </div>
  );
}
