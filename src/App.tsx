import { useEffect, useMemo, useRef, useState } from "react";
import { PhotoPicker } from "./components/PhotoPicker";
import { IngredientChips } from "./components/IngredientChips";
import { VideoGrid } from "./components/VideoGrid";
import { VideoPlayer } from "./components/VideoPlayer";
import { analyzePhoto, findVideos, searchIngredients } from "./lib/api";
import { prepareImage } from "./lib/image";
import { AppError, type Ingredient, type Video } from "./lib/types";

type Busy = null | "preparing" | "analyzing" | "searching";

const BUSY_TEXT: Record<Exclude<Busy, null>, string> = {
  preparing: "Getting your photo ready…",
  analyzing: "Spotting ingredients…",
  searching: "Finding recipe videos…",
};

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
      return "The ingredient scanner is busy right now. Please try again in a minute, or add ingredients by hand below.";
    case "NO_VIDEOS":
      return "No recipe videos matched these ingredients. Try removing one or two and search again.";
    case "IMAGE_TOO_LARGE":
      return "That photo is too large to analyze. Try a smaller photo or a screenshot of it.";
    default:
      return err.message;
  }
}

export default function App() {
  const [busy, setBusy] = useState<Busy>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[] | null>(null);
  const [videos, setVideos] = useState<Video[] | null>(null);
  const [searchedFor, setSearchedFor] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState<Video | null>(null);
  const resultsRef = useRef<HTMLHeadingElement>(null);
  const ingredientsRef = useRef<HTMLHeadingElement>(null);

  const searchNames = useMemo(() => (ingredients ? searchIngredients(ingredients) : []), [ingredients]);

  // Free the old preview image when a new one replaces it.
  useEffect(() => () => void (previewUrl && URL.revokeObjectURL(previewUrl)), [previewUrl]);

  async function handleFile(file: File) {
    setError(null);
    setVideos(null);
    setBusy("preparing");
    try {
      const img = await prepareImage(file);
      setPreviewUrl(img.previewUrl);
      setBusy("analyzing");
      const found = await analyzePhoto(img.base64, img.mimeType);
      setIngredients(found);
    } catch (err) {
      setError(friendly(err, "photo"));
      // When the scan itself fails, let the user carry on by typing ingredients.
      // (An unreadable file just stays on the current screen.)
      if (!(err instanceof AppError && err.code === "BAD_FILE")) setIngredients((prev) => prev ?? []);
    } finally {
      setBusy(null);
      requestAnimationFrame(() => ingredientsRef.current?.focus());
    }
  }

  async function handleSearch() {
    if (!searchNames.length) return;
    setError(null);
    setBusy("searching");
    try {
      const result = await findVideos(searchNames);
      setVideos(result.videos);
      setSearchedFor(searchNames);
      requestAnimationFrame(() => resultsRef.current?.focus());
    } catch (err) {
      setVideos(null);
      setError(friendly(err, "search"));
    } finally {
      setBusy(null);
    }
  }

  function startOver() {
    setIngredients(null);
    setVideos(null);
    setPreviewUrl(null);
    setError(null);
  }

  const stale = videos !== null && searchedFor.join(",") !== searchNames.join(",");

  return (
    <>
      <header className="site-header">
        <div className="wrap site-header__inner">
          <a className="brand" href="/" onClick={(e) => (e.preventDefault(), startOver())}>
            <img src="/favicon.svg" alt="" width="28" height="28" />
            Fridge Photo Chef
          </a>
        </div>
      </header>

      <main className="wrap">
        {ingredients === null && (
          <section className="hero" aria-labelledby="hero-title">
            <h1 id="hero-title">What can I cook with what I've got?</h1>
            <p className="hero__lead">
              Snap a photo of your fridge or pantry. We'll spot the ingredients and find recipe videos that use them.
            </p>
            <PhotoPicker onFile={handleFile} disabled={busy !== null} />
            <ol className="steps" aria-label="How it works">
              <li><strong>1</strong> Take a photo</li>
              <li><strong>2</strong> Check the ingredients</li>
              <li><strong>3</strong> Watch a recipe</li>
            </ol>
          </section>
        )}

        <div className="status" role="status" aria-live="polite">
          {busy && (
            <div className="loading">
              <span className="spinner" aria-hidden="true" />
              {BUSY_TEXT[busy]}
            </div>
          )}
        </div>

        {error && (
          <div className="alert" role="alert">
            {error}
          </div>
        )}

        {ingredients !== null && (
          <section className="panel" aria-labelledby="ingredients-title">
            <div className="panel__head">
              {previewUrl && <img className="thumb" src={previewUrl} alt="Your fridge photo" />}
              <div>
                <h2 id="ingredients-title" ref={ingredientsRef} tabIndex={-1}>
                  Your ingredients
                </h2>
                <p className="muted">
                  {ingredients.length
                    ? "Remove anything that's wrong and add anything we missed."
                    : "Type in what you have to search for recipes."}
                </p>
              </div>
            </div>

            <IngredientChips ingredients={ingredients} onChange={setIngredients} searchNames={searchNames} />

            <div className="panel__actions">
              <button
                type="button"
                className="btn btn--primary btn--lg"
                onClick={handleSearch}
                disabled={busy !== null || searchNames.length === 0}
              >
                {stale ? "Update recipes" : "Find recipes"}
              </button>
              <PhotoPicker onFile={handleFile} disabled={busy !== null} compact />
            </div>
          </section>
        )}

        {videos && (
          <section className="results" aria-labelledby="results-title">
            <h2 id="results-title" ref={resultsRef} tabIndex={-1}>
              Recipes with {listFormat(searchedFor)}
            </h2>
            <VideoGrid videos={videos} onPlay={setPlaying} />
          </section>
        )}
      </main>

      <footer className="site-footer wrap">
        <p>
          Your photo is sent to Google's Gemini AI to find ingredients and is not saved by this app. On Gemini's free tier,
          Google may use what you send to improve its products, so please don't upload anything private.
        </p>
        <p>Videos from YouTube.</p>
      </footer>

      <VideoPlayer video={playing} onClose={() => setPlaying(null)} />
    </>
  );
}

const list = new Intl.ListFormat("en", { style: "long", type: "conjunction" });
function listFormat(items: string[]): string {
  return list.format(items);
}
