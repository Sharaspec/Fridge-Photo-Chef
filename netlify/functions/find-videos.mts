// GET /api/find-videos?ingredients=egg,spinach,cheddar%20cheese[&meal=dinner][&diet=vegan][&max=30]
// GET /api/find-videos?dish=Vegetable%20fried%20rice[&meal=…&diet=…&max=…]
// Returns: { query, videos: [{ id, title, channel, thumbnail, durationSeconds, views }] }
//
// Costs 101 YouTube quota units per uncached call (search.list 100 + videos.list 1).
// Successful responses are cached on Netlify's CDN for 24 hours, keyed by the URL,
// so the front end sends ingredients in a normalized (sorted, lowercased) order.

import type { Config } from "@netlify/functions";
import { parseFilters, queryTerms } from "../../shared/filters.ts";
import { env, fail, json } from "../lib/shared.ts";

const MAX_RESULTS = 12;
// Ask YouTube for more than we show (same 100-unit cost) so length filtering still leaves enough.
const SEARCH_POOL = 50;
// Hide YouTube Shorts-length clips: they rarely show a full recipe.
const MIN_SECONDS = 61;
const MAX_INGREDIENTS = 5;
const DAY_SECONDS = 86_400;

interface VideoCard {
  id: string;
  title: string;
  channel: string;
  thumbnail: string;
  durationSeconds: number;
  views: number;
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== "GET") return fail("BAD_REQUEST", "Use GET.", 405);

  const apiKey = env("YOUTUBE_API_KEY");
  if (!apiKey) return fail("CONFIG", "The server is missing its YouTube API key.", 500);

  const params = new URL(req.url).searchParams;
  const ingredients = (params.get("ingredients") ?? "")
    .split(",")
    .map((s) => s.trim().slice(0, 40))
    .filter(Boolean)
    .slice(0, MAX_INGREDIENTS);
  const dish = (params.get("dish") ?? "").trim().slice(0, 60);
  if (!ingredients.length && !dish) return fail("BAD_REQUEST", "Add at least one ingredient.", 400);

  const filters = parseFilters(Object.fromEntries(params));
  const maxSeconds = filters.maxMinutes ? filters.maxMinutes * 60 : Infinity;
  const query = [dish || ingredients.join(" "), ...queryTerms(filters), "recipe"].join(" ");

  // 1) search.list — 100 units
  const search = new URL("https://www.googleapis.com/youtube/v3/search");
  search.search = new URLSearchParams({
    part: "snippet",
    type: "video",
    videoEmbeddable: "true",
    safeSearch: "moderate",
    maxResults: String(SEARCH_POOL),
    q: query,
    key: apiKey,
  }).toString();

  const searchRes = await fetch(search);
  if (!searchRes.ok) return youtubeError(searchRes);
  const searchData = await searchRes.json();
  const ids: string[] = (searchData.items ?? [])
    .map((item: { id?: { videoId?: string } }) => item.id?.videoId)
    .filter(Boolean);
  if (!ids.length) return fail("NO_VIDEOS", "No recipe videos matched these ingredients.", 404);

  // 2) videos.list — 1 unit for the whole batch
  const details = new URL("https://www.googleapis.com/youtube/v3/videos");
  details.search = new URLSearchParams({
    part: "snippet,contentDetails,statistics,status",
    id: ids.join(","),
    key: apiKey,
  }).toString();

  const detailsRes = await fetch(details);
  if (!detailsRes.ok) return youtubeError(detailsRes);
  const detailsData = await detailsRes.json();

  const byId = new Map<string, VideoCard>();
  for (const v of detailsData.items ?? []) {
    if (v.status?.embeddable === false) continue;
    const durationSeconds = parseIsoDuration(v.contentDetails?.duration);
    // No length = live stream or premiere. Also drop Shorts and anything over the length filter.
    if (durationSeconds < MIN_SECONDS || durationSeconds > maxSeconds) continue;
    const thumbs = v.snippet?.thumbnails ?? {};
    byId.set(v.id, {
      id: v.id,
      title: v.snippet?.title ?? "",
      channel: v.snippet?.channelTitle ?? "",
      thumbnail: (thumbs.high ?? thumbs.medium ?? thumbs.default)?.url ?? `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
      durationSeconds,
      views: Number(v.statistics?.viewCount ?? 0),
    });
  }
  // Keep YouTube's relevance order from search.list.
  const videos = ids
    .map((id) => byId.get(id))
    .filter((v): v is VideoCard => Boolean(v))
    .slice(0, MAX_RESULTS);
  if (!videos.length) return fail("NO_VIDEOS", "No recipe videos matched.", 404);

  return json({ query, videos }, 200, {
    // Browser may reuse for an hour; Netlify's CDN keeps it for a day (durable cache).
    "cache-control": "public, max-age=3600",
    "netlify-cdn-cache-control": `public, durable, s-maxage=${DAY_SECONDS}, stale-while-revalidate=3600`,
    "netlify-vary": "query=ingredients|dish|meal|diet|max",
  });
};

async function youtubeError(res: globalThis.Response): Promise<Response> {
  const text = await res.text();
  if (res.status === 403 && /quotaExceeded|dailyLimitExceeded|rateLimitExceeded/.test(text)) {
    return fail("QUOTA", "Today's free YouTube search limit has been reached. Please try again tomorrow.", 429);
  }
  console.error("YouTube error", res.status, text.slice(0, 500));
  return fail("UPSTREAM", "YouTube search had a problem. Please try again.", 502);
}

/** "PT1H2M3S" -> 3723 */
export function parseIsoDuration(iso: string | undefined): number {
  const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso ?? "");
  if (!m) return 0;
  const [, d, h, min, s] = m.map((x) => Number(x ?? 0));
  return d * 86_400 + h * 3_600 + min * 60 + s;
}

export const config: Config = { path: "/api/find-videos" };
