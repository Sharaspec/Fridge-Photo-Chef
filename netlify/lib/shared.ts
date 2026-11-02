// Shared helpers for the Netlify Functions. This file lives outside
// netlify/functions so Netlify does not deploy it as a function of its own.

/** Error codes the front end knows how to turn into friendly messages. */
export type ErrorCode =
  | "BAD_REQUEST"
  | "IMAGE_TOO_LARGE"
  | "NO_FOOD"
  | "BLURRY"
  | "QUOTA"
  | "BUSY"
  | "NO_VIDEOS"
  | "CONFIG"
  | "UPSTREAM";

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });
}

export function fail(code: ErrorCode, message: string, status: number): Response {
  return json({ error: { code, message } }, status, { "cache-control": "no-store" });
}

/** Reads a required secret from the Netlify environment. Never sent to the browser. */
export function env(name: "GEMINI_API_KEY" | "YOUTUBE_API_KEY"): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

/**
 * Gemini models to try, in order. The first is preferred; the rest are
 * fallbacks for when a model is overloaded (503) or rate limited (429).
 * Override with the GEMINI_MODELS environment variable — one place to change it.
 */
export function geminiModels(): string[] {
  const fromEnv = process.env.GEMINI_MODELS?.split(",").map((m) => m.trim()).filter(Boolean);
  return fromEnv?.length ? fromEnv : ["gemini-3.8-flash", "gemini-3.7-flash", "gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.5-flash-lite"];
}

/**
 * Tidies text a model produced: Unicode-normalizes it, drops control characters
 * (one fallback model sometimes emits a tab where "é" belongs), collapses spaces, trims.
 */
export function cleanText(value: unknown, maxLength: number): string {
  return String(value ?? "")
    .normalize("NFC")
    .replace(/[\p{Cc}\p{Cf}]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}
