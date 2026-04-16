# trpc-studio

A Swagger-like developer UI for [tRPC](https://trpc.io) APIs with automatic
output type extraction.

<img width="1676" height="939" alt="Screenshot 2026-04-16 at 3 54 50 AM" src="https://github.com/user-attachments/assets/bc88fa79-94be-4c49-aa39-e38a97738972" />

## Features

- **Auto-generated input forms** from Zod schemas — string, number, boolean,
  enum, object, array
- **"Try It Out"** — execute real tRPC calls from the browser with response
  display, timing, and status
- **Output type visualization** — extract response types at build time using the
  TypeScript Compiler API and display them as a collapsible schema tree
- **Sidebar navigation** — procedures grouped by router, color-coded badges
  (query/mutation/subscription), real-time search
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

## CLI: Output Type Extraction

By default, trpc-studio shows input schemas (from Zod) but not output types. To
enable the **Response Schema** section, run the CLI extractor:

```bash
npx @srawad/trpc-studio extract \
  --router ./src/router.ts \
  --tsconfig ./tsconfig.json \
  --out .trpc-studio.json
```

Then load the generated file in your server:

```typescript
import outputSchemas from "./.trpc-studio.json";

app.get("/studio", (_req, res) => {
  res.send(
    renderTrpcStudio(appRouter, {
      url: "http://localhost:3000/trpc",
      outputSchemas,
    }),
  );
});
```

### CLI Options

| Option              | Default             | Description                           |
| ------------------- | ------------------- | ------------------------------------- |
| `--router <path>`   | _(required)_        | Path to the file exporting the router |
| `--out <path>`      | `.trpc-studio.json` | Output file path                      |
| `--tsconfig <path>` | `./tsconfig.json`   | Path to tsconfig.json                 |
| `--name <name>`     | `appRouter`         | Name of the exported router variable  |

## API

### `renderTrpcStudio(router, options)`

Returns a self-contained HTML string.

```typescript
interface RenderOptions {
  url: string; // Base tRPC URL
  outputSchemas?: Record<string, JsonSchema>; // From CLI extractor
  transformer?: "superjson" | "none"; // Default: "none"
  meta?: {
    title?: string;
    description?: string;
    version?: string;
  };
  headers?: Record<string, string>; // Auth headers for "Try It Out"
}
```

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
