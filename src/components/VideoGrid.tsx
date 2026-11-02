import { decodeEntities, formatDuration, formatViews } from "../lib/format";
import type { Video } from "../lib/types";
import { FavoriteButton } from "./FavoriteButton";

interface Props {
  videos: Video[];
  onPlay: (video: Video) => void;
}

export function VideoGrid({ videos, onPlay }: Props) {
  return (
    <ul className="video-grid">
      {videos.map((v) => {
        const title = decodeEntities(v.title);
        const channel = decodeEntities(v.channel);
        return (
          <li key={v.id} className="video-grid__item">
            <button type="button" className="video-card" onClick={() => onPlay(v)} aria-label={`Play ${title} by ${channel}`}>
              <span className="video-card__thumb">
                <img src={v.thumbnail} alt="" loading="lazy" width="480" height="360" />
                <span className="video-card__duration">{formatDuration(v.durationSeconds)}</span>
                <span className="video-card__play" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                    <path d="M8 5.5v13l11-6.5z" />
                  </svg>
                </span>
              </span>
              <span className="video-card__body">
                <span className="video-card__title">{title}</span>
                <span className="video-card__meta">
                  {channel} · {formatViews(v.views)}
                </span>
              </span>
            </button>
            <FavoriteButton video={v} />
          </li>
        );
      })}
    </ul>
  );
}
