import { isFavorite, toggleFavorite, useFavorites } from "../lib/favorites";
import { decodeEntities } from "../lib/format";
import type { Video } from "../lib/types";

/** PRD F12: heart toggle that saves a video in this browser. */
export function FavoriteButton({ video, variant = "overlay" }: { video: Video; variant?: "overlay" | "inline" }) {
  const favorites = useFavorites();
  const saved = isFavorite(favorites, video.id);
  const title = decodeEntities(video.title);
  return (
    <button
      type="button"
      className={`fav fav--${variant}`}
      aria-pressed={saved}
      aria-label={variant === "overlay" ? `Save ${title}` : undefined}
      onClick={() => toggleFavorite(video)}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
        <path d="M12 20.5s-7.5-4.6-9.3-9.4C1.5 7.8 3.6 4.5 7 4.5c2.1 0 3.6 1.2 5 3 1.4-1.8 2.9-3 5-3 3.4 0 5.5 3.3 4.3 6.6-1.8 4.8-9.3 9.4-9.3 9.4z" />
      </svg>
      {variant === "inline" && <span>{saved ? "Saved" : "Save"}</span>}
    </button>
  );
}
