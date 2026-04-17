import { introspectRouter } from "./introspect";
import { UI_CSS, UI_JS } from "./ui-assets";

import type { JsonSchema } from "@trpc-studio/core";

export interface AuthConfig {
  type: "bearer" | "cookie" | "header" | "basic";
  /** Header or cookie name (required for "cookie" and "header" types) */
  name?: string;
  description?: string;
}

export interface RenderOptions {
  url: string;
  /** CLI-extracted output schemas (from extractRouterSchemas().outputs or legacy extractRouterOutputSchemas()) */
  outputSchemas?: Record<string, JsonSchema>;
  /** CLI-extracted input schemas (from extractRouterSchemas().inputs) — used as fallback for z.custom() fields */
  inputSchemas?: Record<string, JsonSchema>;
  transformer?: "superjson" | "none";
  /** Authentication config — shown as an "Authorize" button in the UI */
  auth?: AuthConfig | AuthConfig[];
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

function isEmptySchema(schema: JsonSchema): boolean {
  // A schema is "empty" if it has no structural info (result of z.custom() / z.any())
  return (
    !schema.type &&
    !schema.properties &&
    !schema.items &&
    !schema.anyOf &&
    !schema.oneOf &&
    !schema.allOf &&
    !schema.enum &&
    !schema.$ref
  );
}

function mergeInputSchemas(zodSchema: JsonSchema, cliSchema: JsonSchema): JsonSchema {
  // If the Zod schema is completely empty, use the CLI schema entirely
  if (isEmptySchema(zodSchema)) {
    return cliSchema;
  }

  // If both are objects, merge property-by-property (Zod wins unless empty)
  if (
    zodSchema.type === "object" &&
    cliSchema.type === "object" &&
    zodSchema.properties &&
    cliSchema.properties
  ) {
    const merged = { ...zodSchema };
    const mergedProps = { ...zodSchema.properties };

    for (const [key, zodPropSchema] of Object.entries(mergedProps)) {
      const cliPropSchema = cliSchema.properties[key];
      if (cliPropSchema && isEmptySchema(zodPropSchema)) {
        mergedProps[key] = cliPropSchema;
      }
    }

    merged.properties = mergedProps;
    return merged;
  }

  return zodSchema;
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

  for (const proc of manifest.procedures) {
    // Merge CLI-extracted output schemas
    if (options.outputSchemas) {
      const outSchema = options.outputSchemas[proc.path];
      if (outSchema) {
        proc.outputSchema = outSchema;
      }
    }

    // Merge CLI-extracted input schemas as fallback for z.custom() / z.any()
    if (options.inputSchemas) {
      const inSchema = options.inputSchemas[proc.path];
      if (inSchema && proc.inputSchema) {
        proc.inputSchema = mergeInputSchemas(proc.inputSchema, inSchema);
      } else if (inSchema && !proc.inputSchema) {
        proc.inputSchema = inSchema;
      }
    }
  }

  const manifestJson = JSON.stringify(manifest);
  const authConfigs = options.auth
    ? Array.isArray(options.auth)
      ? options.auth
      : [options.auth]
    : [];

  const optionsJson = JSON.stringify({
    url: options.url,
    transformer: options.transformer ?? "none",
    headers: options.headers ?? {},
    version: options.meta?.version,
    auth: authConfigs,
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
