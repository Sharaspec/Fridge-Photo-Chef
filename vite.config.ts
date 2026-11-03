import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from "vite";
import react from "@vitejs/plugin-react";
import type { IncomingMessage } from "node:http";

/**
 * Dev-only: serve /api/* from the Netlify Functions in netlify/functions so
 * `npm run dev` works without the Netlify CLI. Keys come from a local .env.
 * In production, Netlify routes these paths to the real functions.
 */
function netlifyFunctionsDev(): Plugin {
  const routes: Record<string, string> = {
    "/api/analyze-photo": "/netlify/functions/analyze-photo.mts",
    "/api/find-videos": "/netlify/functions/find-videos.mts",
    "/api/suggest-dishes": "/netlify/functions/suggest-dishes.mts",
    "/api/recipe-card": "/netlify/functions/recipe-card.mts",
    "/api/ask-video": "/netlify/functions/ask-video.mts",
  };
  return {
    name: "netlify-functions-dev",
    apply: "serve",
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        const path = req.url?.split("?")[0] ?? "";
        const file = routes[path];
        if (!file) return next();
        try {
          const mod = await server.ssrLoadModule(file);
          const body = req.method === "GET" || req.method === "HEAD" ? undefined : new Uint8Array(await readBody(req));
          const request = new Request(`http://localhost${req.url}`, {
            method: req.method,
            headers: req.headers as Record<string, string>,
            body,
          });
          const response: Response = await mod.default(request);
          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (err) {
          server.config.logger.error(String(err));
          res.statusCode = 500;
          res.end(JSON.stringify({ error: { code: "UPSTREAM", message: "Local function crashed." } }));
        }
      });
    },
  };
}

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export default defineConfig(({ mode }) => {
  // Expose server-only secrets to the dev functions via process.env (not to the browser bundle).
  const serverEnv = loadEnv(mode, process.cwd(), "");
  for (const key of ["GEMINI_API_KEY", "YOUTUBE_API_KEY", "GEMINI_MODELS"]) {
    if (serverEnv[key] && !process.env[key]) process.env[key] = serverEnv[key];
  }
  return { plugins: [react(), netlifyFunctionsDev()] };
});
