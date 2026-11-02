import { useEffect, useRef } from "react";
import { decodeEntities, formatDuration, formatViews } from "../lib/format";
import type { Video } from "../lib/types";

interface Props {
  video: Video | null;
  onClose: () => void;
}

/** Plays a video in the YouTube IFrame Player inside a native modal dialog (Esc closes, focus is trapped). */
export function VideoPlayer({ video, onClose }: Props) {
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

  const title = video ? decodeEntities(video.title) : "";

  return (
    <dialog
      ref={ref}
      className="player"
      aria-label={title || "Video player"}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
    >
      {video && (
        <div className="player__inner">
          <div className="player__bar">
            <button ref={closeRef} type="button" className="player__close" onClick={onClose} aria-label="Close video">
              <svg aria-hidden="true" viewBox="0 0 16 16" width="18" height="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </button>
          </div>
          <div className="player__frame">
            <iframe
              src={`https://www.youtube.com/embed/${video.id}?autoplay=1&rel=0&playsinline=1`}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
          <div className="player__info">
            <div>
              <h2 className="player__title">{title}</h2>
              <p className="muted">
                {decodeEntities(video.channel)} · {formatDuration(video.durationSeconds)} · {formatViews(video.views)}
              </p>
            </div>
            <div className="player__actions">
              <a className="btn btn--ghost" href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noreferrer">
                Open on YouTube
              </a>
            </div>
          </div>
        </div>
      )}
    </dialog>
  );
}
