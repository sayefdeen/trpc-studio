import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { introspectRouter } from "./introspect";

import type { JsonSchema } from "@trpc-studio/core";

export interface RenderOptions {
  url: string;
  outputSchemas?: Record<string, JsonSchema>;
  transformer?: "superjson" | "none";
  meta?: {
    title?: string;
    description?: string;
    version?: string;
  };
  headers?: Record<string, string>;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function safeInlineJson(json: string): string {
  return json.replace(/<\//g, "<\\/");
}

// Load UI assets — try multiple resolution strategies
let cachedJs: string | null = null;
let cachedCss: string | null = null;
let assetsLoaded = false;

function loadAssets(): void {
  if (assetsLoaded) return;
  assetsLoaded = true;

  const tryPaths: string[] = [];

  // Strategy 1: __dirname (CJS, standard Node.js)
  if (typeof __dirname !== "undefined") {
    tryPaths.push(path.join(__dirname, "ui", "assets"));
  }

  // Strategy 2: import.meta.url (ESM)
  try {
    const esmDir = path.dirname(fileURLToPath(import.meta.url));
    tryPaths.push(path.join(esmDir, "ui", "assets"));
  } catch {
    // import.meta.url not available
  }

  // Strategy 3: resolve from the package itself
  try {
    const pkgDir = path.dirname(require.resolve("@srawad/trpc-studio/package.json"));
    tryPaths.push(path.join(pkgDir, "dist", "ui", "assets"));
  } catch {
    // package not resolvable this way
  }

  for (const dir of tryPaths) {
    try {
      const js = fs.readFileSync(path.join(dir, "index.js"), "utf-8");
      const css = fs.readFileSync(path.join(dir, "index.css"), "utf-8");
      cachedJs = js;
      cachedCss = css;
      return;
    } catch {
      // try next path
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function renderTrpcStudio(router: any, options: RenderOptions): string {
  const manifest = introspectRouter(router);

  if (options.meta?.title !== undefined) {
    manifest.title = options.meta.title;
  }
  if (options.meta?.description !== undefined) {
    manifest.description = options.meta.description;
  }

  if (options.outputSchemas) {
    for (const proc of manifest.procedures) {
      const schema = options.outputSchemas[proc.path];
      if (schema) {
        proc.outputSchema = schema;
      }
    }
  }

  const manifestJson = JSON.stringify(manifest);
  const optionsJson = JSON.stringify({
    url: options.url,
    transformer: options.transformer ?? "none",
    headers: options.headers ?? {},
    version: options.meta?.version,
  });

  const title = escapeHtml(manifest.title ?? "tRPC Studio");
  const safeManifest = safeInlineJson(manifestJson);
  const safeOptions = safeInlineJson(optionsJson);
  const scriptTag = `<script>window.__TRPC_STUDIO_MANIFEST__=${safeManifest};window.__TRPC_STUDIO_OPTIONS__=${safeOptions};</script>`;

  // Load and cache UI assets
  loadAssets();

  if (cachedJs) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  ${cachedCss ? `<style>${cachedCss}</style>` : ""}
  ${scriptTag}
</head>
<body>
  <div id="root"></div>
  <script type="module">${cachedJs}</script>
</body>
</html>`;
  }

  // Fallback if UI assets not found
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  ${scriptTag}
</head>
<body>
  <div id="root"></div>
  <pre style="font-family:monospace;padding:20px;">${manifestJson}</pre>
</body>
</html>`;
}
