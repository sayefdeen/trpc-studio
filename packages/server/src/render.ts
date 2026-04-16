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

function getDistDir(): string {
  // Support both CJS (__dirname) and ESM (import.meta.url)
  if (typeof __dirname !== "undefined") return __dirname;
  return path.dirname(fileURLToPath(import.meta.url));
}

function tryReadFile(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function safeInlineJson(json: string): string {
  // Prevent </script> breakout in inline JSON
  return json.replace(/<\//g, "<\\/");
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

  // Try to load and inline the built UI assets for a fully self-contained HTML
  const distDir = getDistDir();
  const uiDir = path.join(distDir, "ui", "assets");
  const jsContent = tryReadFile(path.join(uiDir, "index.js"));
  const cssContent = tryReadFile(path.join(uiDir, "index.css"));

  if (jsContent) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  ${cssContent ? `<style>${cssContent}</style>` : ""}
  ${scriptTag}
</head>
<body>
  <div id="root"></div>
  <script type="module">${jsContent}</script>
</body>
</html>`;
  }

  // Fallback if UI hasn't been built yet
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
