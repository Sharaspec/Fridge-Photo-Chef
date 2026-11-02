import { useState } from "react";
import { askVideo } from "../lib/api";
import { timeToSeconds } from "../lib/match";
import type { QA } from "../lib/types";
import { videoErrorMessage } from "./videoErrors";

interface Props {
  videoId: string;
  onSeek: (seconds: number) => void;
}

const STARTERS = [
  "What can I swap for butter?",
  "How do I make this vegetarian?",
  "Can I make it ahead?",
  "What's the trickiest step?",
];

/** PRD F10: ask Gemini about the video. Timestamps in answers jump the player. */
export function AskPanel({ videoId, onSeek }: Props) {
  const [thread, setThread] = useState<QA[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<{ message: string; retryable: boolean; question: string } | null>(null);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || pending) return;
    setDraft("");
    setError(null);
    setPending(q);
    try {
      const a = await askVideo(videoId, q, thread);
      setThread((t) => [...t, { q, a }]);
    } catch (err) {
      setError({ ...videoErrorMessage(err), question: q });
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="ask">
      {thread.length > 0 && (
        <ol className="ask__thread" aria-label="Questions and answers">
          {thread.map((qa, n) => (
            <li key={n}>
              <p className="ask__q">{qa.q}</p>
              <p className="ask__a">
                <Answer text={qa.a} onSeek={onSeek} />
              </p>
            </li>
          ))}
        </ol>
      )}

      <div role="status" aria-live="polite">
        {pending && (
          <div className="loading loading--left">
            <span className="spinner" aria-hidden="true" />
            Gemini is watching the video to answer “{pending}”…
          </div>
        )}
      </div>

      {error && (
        <div className="alert" role="alert">
          <span>{error.message}</span>
          {error.retryable && (
            <button type="button" className="btn btn--small" onClick={() => ask(error.question)}>
              Try again
            </button>
          )}
        </div>
      )}

      {thread.length === 0 && !pending && (
        <div className="ask__starters" role="group" aria-label="Example questions">
          {STARTERS.map((s) => (
            <button key={s} type="button" className="starter" onClick={() => ask(s)}>
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        className="add-form ask__form"
        onSubmit={(e) => {
          e.preventDefault();
          ask(draft);
        }}
      >
        <label htmlFor="ask-input" className="visually-hidden">
          Ask about this video
        </label>
        <input
          id="ask-input"
          className="input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={thread.length ? "Ask a follow-up…" : "Ask anything about this recipe…"}
          maxLength={300}
          autoComplete="off"
        />
        <button type="submit" className="btn btn--primary" disabled={!draft.trim() || pending !== null}>
          Ask
        </button>
      </form>
    </div>
  );
}

/** Renders "[1:23]" in an answer as a button that seeks the video. */
function Answer({ text, onSeek }: { text: string; onSeek: (s: number) => void }) {
  const parts = text.split(/\[(\d{1,2}:\d{2}(?::\d{2})?)\]/);
  return (
    <>
      {parts.map((part, i) => {
        if (i % 2 === 0) return part;
        const secs = timeToSeconds(part);
        return secs === null ? (
          part
        ) : (
          <button key={i} type="button" className="time-link" onClick={() => onSeek(secs)} aria-label={`Jump to ${part}`}>
            ▶ {part}
          </button>
        );
      })}
    </>
  );
}
