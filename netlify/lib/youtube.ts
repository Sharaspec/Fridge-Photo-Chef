// Small YouTube Data API helpers shared by the functions.

import { fail } from "./shared.ts";

export const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

/** "PT1H2M3S" -> 3723 */
export function parseIsoDuration(iso: string | undefined): number {
  const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso ?? "");
  if (!m) return 0;
  const [, d, h, min, s] = m.map((x) => Number(x ?? 0));
  return d * 86_400 + h * 3_600 + min * 60 + s;
}

/** Turns a failed YouTube response into a friendly error Response. */
export async function youtubeError(res: globalThis.Response): Promise<Response> {
  const text = await res.text();
  if (res.status === 403 && /quotaExceeded|dailyLimitExceeded|rateLimitExceeded/.test(text)) {
    return fail("QUOTA", "Today's free YouTube search limit has been reached. Please try again tomorrow.", 429);
  }
  console.error("YouTube error", res.status, text.slice(0, 500));
  return fail("UPSTREAM", "YouTube had a problem. Please try again.", 502);
}

export interface VideoMeta {
  id: string;
  title: string;
  channel: string;
  description: string;
  durationSeconds: number;
  isPublic: boolean;
}

/** One video's details — videos.list, 1 quota unit. Returns null if it doesn't exist. */
export async function fetchVideoMeta(id: string, apiKey: string): Promise<VideoMeta | null | Response> {
  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.search = new URLSearchParams({ part: "snippet,contentDetails,status", id, key: apiKey }).toString();
  const res = await fetch(url);
  if (!res.ok) return youtubeError(res);
  const v = (await res.json()).items?.[0];
  if (!v) return null;
  return {
    id,
    title: v.snippet?.title ?? "",
    channel: v.snippet?.channelTitle ?? "",
    description: v.snippet?.description ?? "",
    durationSeconds: parseIsoDuration(v.contentDetails?.duration),
    isPublic: v.status?.privacyStatus === "public",
  };
}

/** The Gemini part that lets it watch a public YouTube video, sampled to keep tokens and time down. */
export function videoPart(meta: VideoMeta) {
  return {
    file_data: { file_uri: `https://www.youtube.com/watch?v=${meta.id}` },
    // 1 frame/s is Gemini's default; halve it for longer videos.
    video_metadata: { fps: meta.durationSeconds > 600 ? 0.5 : 1 },
  };
}
