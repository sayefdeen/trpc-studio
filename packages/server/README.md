# trpc-studio

A Swagger-like developer UI for [tRPC](https://trpc.io) APIs — auto-generated
input forms, "Try It Out" execution, output type visualization, and a CLI for
static type extraction via the TypeScript Compiler API.

<!-- add screenshot here -->

## Features

- **Auto-generated input forms** from Zod schemas — string, number, boolean,
  enum, object, array
- **"Try It Out"** — execute real tRPC calls from the browser with response
  display, timing, and status
- **Output type visualization** — automatic runtime detection from `.output()`
  schemas, or static extraction via the CLI using the TypeScript Compiler API
- **Sidebar navigation** — procedures grouped by router, color-coded badges
  (query/mutation/subscription), real-time search, tag filtering
- **Authentication** — configurable "Authorize" button (bearer, cookie, header,
  basic) with localStorage persistence
- **Procedure metadata** — automatically displays `.meta()` values (auth,
  deprecated, tags, custom fields)
- **Self-contained** — served as a single HTML response, no static file hosting
  needed
- **tRPC v10 & v11** compatible

## Installation

```bash
npm install -D @srawad/trpc-studio
```

## Quick Start

### Express

```typescript
import express from "express";
import * as trpcExpress from "@trpc/server/adapters/express";
import { renderTrpcStudio } from "@srawad/trpc-studio";
import { appRouter } from "./router";

const app = express();

app.use("/trpc", trpcExpress.createExpressMiddleware({ router: appRouter }));

app.get("/studio", (_req, res) => {
  res.send(
    renderTrpcStudio(appRouter, {
      url: "http://localhost:3000/trpc",
      meta: { title: "My API", version: "1.0.0" },
    }),
  );
});

app.listen(3000);
```

Open **http://localhost:3000/studio** in your browser.

### Next.js (App Router)

```typescript
// src/app/api/studio/route.ts
import { NextResponse } from "next/server";
import { appRouter } from "~/server/router";

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse("Not Found", { status: 404 });
  }

  const { renderTrpcStudio } = await import("@srawad/trpc-studio");

  return new NextResponse(
    renderTrpcStudio(appRouter, {
      url: "/api/trpc",
      transformer: "superjson",
      meta: { title: "My API" },
    }),
    { status: 200, headers: { "Content-Type": "text/html" } },
  );
}
```

## Output Type Visualization

trpc-studio shows output (response) schemas in two ways — **runtime** and
**static extraction**. You can use either or both.

### Option A: Runtime (automatic, zero config)

If your procedures use `.output()` with a Zod schema, trpc-studio picks it up
automatically at runtime — no extra setup needed:

```typescript
// This procedure's output schema is detected automatically
const appRouter = t.router({
  getUser: t.procedure
    .input(z.object({ id: z.string() }))
    .output(z.object({ id: z.string(), name: z.string(), email: z.string() }))
    .query(({ input }) => {
      return db.user.findUnique({ where: { id: input.id } });
    }),
});
```

### Option B: CLI Extractor (for procedures without `.output()`)

Most tRPC procedures don't use `.output()` — they just return a value and let
TypeScript infer the type. For these, trpc-studio provides a CLI tool that uses
the **TypeScript Compiler API** to statically analyze your router source code
and extract the return types.

#### Step 1: Run the extractor

```bash
npx @srawad/trpc-studio extract --router ./src/server/router.ts
```

This analyzes your TypeScript source and generates a `.trpc-studio.json` file
with JSON Schema definitions for every procedure's input and output types.

This is especially useful for:

- **Output types** — procedures that don't use `.output()` (most tRPC code)
- **Input types with `z.custom<T>()`** — Zod's `z.custom()` carries no runtime
  schema, so the UI renders it as an empty object. The CLI extractor resolves
  the actual TypeScript type and provides full structural info.

#### Step 2: Pass the schemas to renderTrpcStudio

```typescript
import schemas from "./.trpc-studio.json";

app.get("/studio", (_req, res) => {
  res.send(
    renderTrpcStudio(appRouter, {
      url: "http://localhost:3000/trpc",
      inputSchemas: schemas.inputs,
      outputSchemas: schemas.outputs,
    }),
  );
});
```

#### Full Example

Given this router:

```typescript
// src/server/router.ts
import { initTRPC } from "@trpc/server";
import { z } from "zod";

const t = initTRPC.create();

export const appRouter = t.router({
  hello: t.procedure
    .input(z.object({ name: z.string().optional() }))
    .query(({ input }) => {
      return { greeting: `Hello ${input.name ?? "world"}!` };
    }),

  user: t.router({
    getById: t.procedure
      .input(z.object({ id: z.string() }))
      .query(({ input }) => {
        return { id: input.id, name: "John Doe", email: "john@example.com" };
      }),

    create: t.procedure
      .input(z.object({ name: z.string(), email: z.string() }))
      .mutation(({ input }) => {
        return { id: "new-id", ...input, createdAt: new Date().toISOString() };
      }),
  }),
});
```

Run the extractor:

```bash
npx @srawad/trpc-studio extract \
  --router ./src/server/router.ts \
  --tsconfig ./tsconfig.json \
  --name appRouter \
  --out .trpc-studio.json
```

This generates `.trpc-studio.json` with both input and output schemas:

```json
{
  "inputs": {
    "hello": {
      "type": "object",
      "properties": {
        "name": { "type": "string" }
      }
    },
    "user.getById": {
      "type": "object",
      "properties": {
        "id": { "type": "string" }
      },
      "required": ["id"]
    },
    "user.create": {
      "type": "object",
      "properties": {
        "name": { "type": "string" },
        "email": { "type": "string" }
      },
      "required": ["name", "email"]
    }
  },
  "outputs": {
    "hello": {
      "type": "object",
      "properties": {
        "greeting": { "type": "string" }
      },
      "required": ["greeting"]
    },
    "user.getById": {
      "type": "object",
      "properties": {
        "id": { "type": "string" },
        "name": { "type": "string" },
        "email": { "type": "string" }
      },
      "required": ["id", "name", "email"]
    },
    "user.create": {
      "type": "object",
      "properties": {
        "id": { "type": "string" },
        "name": { "type": "string" },
        "email": { "type": "string" },
        "createdAt": { "type": "string" }
      },
      "required": ["id", "name", "email", "createdAt"]
    }
  }
}
```

Then wire it up:

```typescript
import schemas from "./.trpc-studio.json";

app.get("/studio", (_req, res) => {
  res.send(
    renderTrpcStudio(appRouter, {
      url: "http://localhost:3000/trpc",
      inputSchemas: schemas.inputs,
      outputSchemas: schemas.outputs,
      meta: { title: "My API", version: "1.0.0" },
    }),
  );
});
```

> **Tip:** Add `.trpc-studio.json` to your `.gitignore` and run the extractor as
> part of your dev/build script:
>
> ```json
> {
>   "scripts": {
>     "dev": "npx @srawad/trpc-studio extract --router ./src/server/router.ts && next dev",
>     "studio:extract": "npx @srawad/trpc-studio extract --router ./src/server/router.ts"
>   }
> }
> ```

### CLI Options

| Option              | Default             | Description                           |
| ------------------- | ------------------- | ------------------------------------- |
| `--router <path>`   | _(required)_        | Path to the file exporting the router |
| `--out <path>`      | `.trpc-studio.json` | Output file path                      |
| `--tsconfig <path>` | `./tsconfig.json`   | Path to tsconfig.json                 |
| `--name <name>`     | `appRouter`         | Name of the exported router variable  |
| `--help`            |                     | Show help message                     |

## Procedure Metadata (.meta())

trpc-studio automatically reads and displays tRPC's built-in `.meta()` on each
procedure. No configuration needed — if your procedures have meta, it shows up.

```typescript
const t = initTRPC
  .meta<{
    auth?: boolean;
    deprecated?: boolean;
    rateLimit?: number;
    tags?: string[];
  }>()
  .create();

const protectedProcedure = t.procedure.meta({ auth: true }).use(authMiddleware);

export const appRouter = t.router({
  getUser: protectedProcedure
    .meta({ tags: ["billing", "v2"] })
    .input(z.object({ id: z.string() }))
    .query(/* ... */),

  legacyReport: t.procedure
    .meta({ deprecated: true, auth: true, tags: ["reporting"] })
    .query(/* ... */),
});
```

**In the UI:**

- **Sidebar** — 🔒 icon for `auth: true`, ⚠️ icon for `deprecated: true`, tag
  badges next to procedure names
- **Detail panel** — all meta keys rendered as badge pills below the procedure
  header (e.g., `🔒 auth`, `⚠️ deprecated`, `rateLimit: 100`)
- **Tag filtering** — if any procedures use `meta.tags`, a filter bar appears at
  the top of the sidebar. Click tags to filter procedures across all routers.
  Multi-select supported.

The rendering is generic — trpc-studio doesn't interpret the meta values, it
just displays whatever keys and values are present.

## Authentication

Configure authentication so the "Try It Out" feature can execute protected
procedures. An "Authorize" button appears in the top bar — click it to enter
credentials. Values are stored in localStorage and persist across page
refreshes.

```typescript
renderTrpcStudio(appRouter, {
  url: "/api/trpc",
  auth: { type: "bearer", description: "JWT token from /api/auth/login" },
});
```

Multiple auth methods:

```typescript
renderTrpcStudio(appRouter, {
  url: "/api/trpc",
  auth: [
    { type: "bearer", description: "JWT token" },
    {
      type: "cookie",
      name: "next-auth.session-token",
      description: "NextAuth session",
    },
    { type: "header", name: "x-api-key", description: "API key" },
  ],
});
```

**Supported auth types:**

| Type     | Header sent                     | Use case          |
| -------- | ------------------------------- | ----------------- |
| `bearer` | `Authorization: Bearer <value>` | JWT, OAuth tokens |
| `basic`  | `Authorization: Basic <value>`  | Basic auth        |
| `header` | `<name>: <value>`               | API keys          |
| `cookie` | `Cookie: <name>=<value>`        | Session cookies   |

## API

### `renderTrpcStudio(router, options)`

Returns a self-contained HTML string.

```typescript
interface RenderOptions {
  url: string; // Base tRPC URL
  outputSchemas?: Record<string, JsonSchema>; // From CLI: schemas.outputs
  inputSchemas?: Record<string, JsonSchema>; // From CLI: schemas.inputs (fallback for z.custom())
  transformer?: "superjson" | "none"; // Default: "none"
  auth?: AuthConfig | AuthConfig[]; // Authentication config for "Authorize" button
  meta?: {
    title?: string;
    description?: string;
    version?: string;
  };
  headers?: Record<string, string>; // Default headers for all requests
}

interface AuthConfig {
  type: "bearer" | "cookie" | "header" | "basic";
  name?: string; // Required for "cookie" and "header" types
  description?: string; // Shown in the Authorize modal
}
```

**How input schema merging works:** Zod runtime schemas are the primary source.
When a field produces an empty schema (e.g., `z.custom<T>()`), the CLI-extracted
schema is used as a fallback. This gives you the best of both worlds — real Zod
validation metadata where available, with TypeScript type info for `z.custom()`
fields.

## Supported Zod Types

| Zod Type                 | Input Form Control  | Notes              |
| ------------------------ | ------------------- | ------------------ |
| `z.string()`             | Text input          |                    |
| `z.number()`             | Number input        |                    |
| `z.boolean()`            | Checkbox            |                    |
| `z.enum()`               | Select dropdown     |                    |
| `z.object()`             | Nested fieldset     | Recursive          |
| `z.array()`              | Repeatable group    | Add/remove buttons |
| `z.optional()`           | Marked as optional  |                    |
| `z.default()`            | Shows default value | In placeholder     |
| `z.string().email()`     | Text input          |                    |
| `z.number().min().max()` | Number input        |                    |

## Comparison

| Feature                   | trpc-studio | trpc-panel |  trpc-openapi   |
| ------------------------- | :---------: | :--------: | :-------------: |
| Input forms from Zod      |     Yes     |    Yes     |       No        |
| Output type visualization |     Yes     |     No     |     Partial     |
| "Try It Out" execution    |     Yes     |    Yes     |   Via Swagger   |
| Self-contained HTML       |     Yes     |     No     |       No        |
| No code changes required  |     Yes     |    Yes     | No (decorators) |
| tRPC v10 support          |     Yes     |    Yes     |       Yes       |
| tRPC v11 support          |     Yes     |  Partial   |     Partial     |
| TypeScript Compiler API   |     Yes     |     No     |       No        |

## Development

```bash
# Clone and install
git clone https://github.com/sayefdeen/trpc-studio
cd trpc-studio
pnpm install

# Build all packages
pnpm build

# Run the example
pnpm --filter express-example dev

# Lint, format, typecheck
pnpm lint
pnpm format:check
pnpm typecheck
```

### Project Structure

```
packages/
  core/     — TypeScript Compiler API type extractor
  ui/       — React + Tailwind frontend
  server/   — Runtime introspection, HTML rendering, CLI
examples/
  express/  — Express example
  nextjs/   — Next.js example
```

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes
4. Run `pnpm lint && pnpm typecheck && pnpm build`
5. Open a pull request

## License

[MIT](LICENSE)
