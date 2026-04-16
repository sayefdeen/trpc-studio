import { introspectRouter } from "./introspect";
import { UI_CSS, UI_JS } from "./ui-assets";

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

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>${UI_CSS}</style>
  ${scriptTag}
</head>
<body>
  <div id="root"></div>
  <script type="module">${UI_JS}</script>
</body>
</html>`;
}
