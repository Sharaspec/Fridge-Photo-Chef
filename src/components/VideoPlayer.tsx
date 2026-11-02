import { useEffect, useRef, useState } from "react";
import { decodeEntities, formatDuration, formatViews } from "../lib/format";
import type { Video } from "../lib/types";
import { AskPanel } from "./AskPanel";
import { FavoriteButton } from "./FavoriteButton";
import { RecipeCardPanel } from "./RecipeCardPanel";

interface Props {
  video: Video | null;
  onClose: () => void;
  /** Ingredient names from the user's fridge, for the shopping list. */
  have: string[];
}

/** Plays a video in the YouTube IFrame Player inside a native modal dialog (Esc closes, focus is trapped). */
export function VideoPlayer({ video, onClose, have }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (video && !dialog.open) {
      dialog.showModal();
      // showModal() would focus the YouTube iframe, which swallows Esc; start on Close instead.
      closeRef.current?.focus();
    }
    if (!video && dialog.open) dialog.close();
  }, [video]);

  return (
    <dialog
      ref={ref}
      className="player"
      aria-label={video ? decodeEntities(video.title) : "Video player"}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
    >
      {/* Keyed by video so the recipe card, questions and seek position reset per video. */}
      {video && <PlayerBody key={video.id} video={video} have={have} onClose={onClose} closeRef={closeRef} />}
    </dialog>
  );
}

type Tab = "recipe" | "ask";

function PlayerBody({
  video,
  have,
  onClose,
  closeRef,
}: {
  video: Video;
  have: string[];
  onClose: () => void;
  closeRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const [tab, setTab] = useState<Tab | null>(null);
  // Changing the start time reloads the embed at that moment (and the counter forces a reload for repeat seeks).
  const [seek, setSeek] = useState({ at: 0, n: 0 });
  const frameRef = useRef<HTMLDivElement>(null);
  const title = decodeEntities(video.title);

  function onSeek(seconds: number) {
    setSeek((s) => ({ at: seconds, n: s.n + 1 }));
    frameRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  const src = `https://www.youtube.com/embed/${video.id}?autoplay=1&rel=0&playsinline=1${seek.at ? `&start=${seek.at}` : ""}`;

  return (
    <div className="player__inner">
      <div className="player__sticky" ref={frameRef}>
        <div className="player__bar">
          <button ref={closeRef} type="button" className="player__close" onClick={onClose} aria-label="Close video">
            <svg aria-hidden="true" viewBox="0 0 16 16" width="18" height="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>
        <div className="player__frame">
          <iframe
            key={seek.n}
            src={src}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
      </div>

      <div className="player__info">
        <div>
          <h2 className="player__title">{title}</h2>
          <p className="muted">
            {decodeEntities(video.channel)} · {formatDuration(video.durationSeconds)} · {formatViews(video.views)}
          </p>
        </div>
        <div className="player__actions">
          <FavoriteButton video={video} variant="inline" />
          <a className="btn btn--ghost" href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noreferrer">
            Open on YouTube
          </a>
        </div>
      </div>

      <div className="player__tools">
        <div className="tabs" role="tablist" aria-label="Video tools">
          <TabButton id="recipe" tab={tab} setTab={setTab}>Recipe card &amp; shopping list</TabButton>
          <TabButton id="ask" tab={tab} setTab={setTab}>Ask about this video</TabButton>
        </div>
        {tab && (
          <div className="tabpanel" role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
            {tab === "recipe" ? (
              <RecipeCardPanel videoId={video.id} have={have} onSeek={onSeek} />
            ) : (
              <AskPanel videoId={video.id} onSeek={onSeek} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TabButton({ id, tab, setTab, children }: { id: Tab; tab: Tab | null; setTab: (t: Tab) => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      id={`tab-${id}`}
      aria-selected={tab === id}
      aria-controls={tab === id ? `panel-${id}` : undefined}
      className="tab"
      onClick={() => setTab(id)}
    >
      {children}
    </button>
  );
}
