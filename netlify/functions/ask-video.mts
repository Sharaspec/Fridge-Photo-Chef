// POST /api/ask-video     (PRD F10)
// Body: { id: <YouTube video id>, question: string, history?: [{ q, a }] }
// Returns: { answer }  — timestamps in the answer look like [3:15]

import type { Config } from "@netlify/functions";
import { geminiJson } from "../lib/gemini.ts";
import { cleanText, env, fail, json } from "../lib/shared.ts";
import { fetchVideoMeta, VIDEO_ID, videoPart } from "../lib/youtube.ts";

// ~1.3 s of Gemini time per video minute; 35 min keeps us well inside Netlify's 60 s limit.
const MAX_VIDEO_SECONDS = 35 * 60;

const SCHEMA = {
  type: "object",
  properties: { answer: { type: "string" } },
  required: ["answer"],
};

export default async (req: Request): Promise<Response> => {
  if (req.method !== "POST") return fail("BAD_REQUEST", "Use POST.", 405);

  let body: { id?: unknown; question?: unknown; history?: unknown };
  try {
    body = await req.json();
  } catch {
    return fail("BAD_REQUEST", "Expected a JSON body.", 400);
  }
  const id = typeof body.id === "string" ? body.id : "";
  const question = cleanText(body.question, 300);
  if (!VIDEO_ID.test(id)) return fail("BAD_REQUEST", "That isn't a YouTube video id.", 400);
  if (!question) return fail("BAD_REQUEST", "Type a question first.", 400);
  const history = (Array.isArray(body.history) ? body.history : [])
    .slice(-4)
    .map((h: { q?: unknown; a?: unknown }) => ({ q: cleanText(h?.q, 300), a: cleanText(h?.a, 1200) }))
    .filter((h) => h.q && h.a);

  const ytKey = env("YOUTUBE_API_KEY");
  if (!ytKey) return fail("CONFIG", "The server is missing its YouTube API key.", 500);
  const meta = await fetchVideoMeta(id, ytKey);
  if (meta instanceof Response) return meta;
  if (!meta || !meta.isPublic) return fail("VIDEO_UNAVAILABLE", "This video isn't public, so Gemini can't watch it.", 422);
  if (meta.durationSeconds > MAX_VIDEO_SECONDS) {
    return fail("VIDEO_UNAVAILABLE", "This video is over 35 minutes long, too long to ask about.", 422);
  }

  const earlier = history.length
    ? `Earlier in this conversation:\n${history.map((h) => `Q: ${h.q}\nA: ${h.a}`).join("\n")}\n\n`
    : "";
  const text = `You are a friendly cooking assistant. The user is watching this YouTube cooking video: "${meta.title}" by ${meta.channel}.
Video description (may include the written recipe):
"""
${meta.description.slice(0, 2000)}
"""
${earlier}Answer the user's question about this video.
- Be concise: at most about 120 words, plain text, no markdown headings.
- When you refer to a moment in the video, add its timestamp in square brackets, like [3:15].
- If the video doesn't cover it, say so briefly, then give a short practical answer labeled "General tip:".
- For substitutions, give amounts where you can and mention how the result will differ.
- Write plain ASCII only, with no accents.

Question: ${question}`;

  const out = await geminiJson<{ answer: string }>({
    parts: [videoPart(meta), { text }],
    schema: SCHEMA,
    thinkingLevel: "low",
    temperature: 0.4,
    mediaResolution: "MEDIA_RESOLUTION_LOW",
    budgetMs: 55_000,
    failMessage: "Couldn't answer that right now. Please try again.",
  });
  if (out instanceof Response) return out;

  const answer = cleanText(out.data.answer, 1500);
  if (!answer) return fail("UPSTREAM", "Couldn't answer that right now. Please try again.", 502);
  return json({ answer, model: out.model }, 200, { "cache-control": "no-store" });
};

export const config: Config = { path: "/api/ask-video" };
