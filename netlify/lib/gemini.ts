// One place that talks to Gemini: structured JSON output, model fallback, time budget.

import { env, fail, geminiModels } from "./shared.ts";

type Part = { text: string } | { inline_data: { mime_type: string; data: string } };

interface Options {
  parts: Part[];
  schema: object;
  temperature?: number;
  /** Gemini 3 "thinking" depth. "low" is several times faster and plenty for these tasks. */
  thinkingLevel?: "low" | "high";
  /** Total time allowed across all model attempts. */
  budgetMs?: number;
  /** Shown to the user if Gemini fails in an unexpected way. */
  failMessage: string;
}

/** Models that rejected thinkingConfig (kept for the life of the function instance). */
const noThinkingConfig = new Set<string>();

/**
 * Calls Gemini with a JSON schema and returns the parsed object, or a ready-made
 * error Response. Tries each model in geminiModels() in turn when one is
 * overloaded (500/503), rate limited (429) or times out.
 */
export async function geminiJson<T>(opts: Options): Promise<{ data: T; model: string } | Response> {
  const apiKey = env("GEMINI_API_KEY");
  if (!apiKey) return fail("CONFIG", "The server is missing its Gemini API key.", 500);

  const deadline = Date.now() + (opts.budgetMs ?? 24_000);
  let lastStatus = 0;

  const models = geminiModels();
  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    const remaining = deadline - Date.now();
    if (remaining < 2_000) break;

    const thinking = opts.thinkingLevel && !noThinkingConfig.has(model);
    let res: globalThis.Response;
    try {
      res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
        signal: AbortSignal.timeout(remaining),
        body: JSON.stringify({
          contents: [{ parts: opts.parts }],
          generationConfig: {
            responseMimeType: "application/json",
            responseJsonSchema: opts.schema,
            temperature: opts.temperature ?? 0.2,
            ...(thinking && { thinkingConfig: { thinkingLevel: opts.thinkingLevel } }),
          },
        }),
      });
    } catch {
      lastStatus = 504;
      continue;
    }

    // A model that doesn't support thinkingLevel: remember that and retry it without.
    if (res.status === 400 && thinking) {
      const text = await res.text();
      if (/thinking/i.test(text)) {
        noThinkingConfig.add(model);
        i--;
        continue;
      }
      console.error("Gemini error", model, 400, text.slice(0, 500));
      return fail("UPSTREAM", opts.failMessage, 502);
    }

    if (res.status === 503 || res.status === 500 || res.status === 429) {
      lastStatus = res.status;
      if (res.status === 429) {
        const quota = (await res.text()).match(/"quotaId": "([^"]+)"/)?.[1];
        console.warn(`Gemini rate limit on ${model}${quota ? ` (${quota})` : ""}; trying next model`);
      }
      continue;
    }
    if (!res.ok) {
      console.error("Gemini error", model, res.status, (await res.text()).slice(0, 500));
      return fail("UPSTREAM", opts.failMessage, 502);
    }

    const body = await res.json();
    const text: string = (body?.candidates?.[0]?.content?.parts ?? [])
      .map((p: { text?: string; thought?: boolean }) => (p.thought ? "" : (p.text ?? "")))
      .join("");
    try {
      return { data: JSON.parse(text) as T, model };
    } catch {
      console.error("Gemini returned non-JSON", model, body?.candidates?.[0]?.finishReason);
      return fail("UPSTREAM", opts.failMessage, 502);
    }
  }

  if (lastStatus === 429) return fail("QUOTA", "The free Gemini limit has been reached for now.", 429);
  return fail("BUSY", "Gemini is busy right now. Please try again in a minute.", 503);
}
