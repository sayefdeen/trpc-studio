import fs from "node:fs";
import path from "node:path";

import * as trpcExpress from "@trpc/server/adapters/express";
import express from "express";
import { renderTrpcStudio } from "@srawad/trpc-studio";

import { appRouter } from "./router";

const app = express();

app.use(
  "/trpc",
  trpcExpress.createExpressMiddleware({
    router: appRouter,
  }),
);

// Load output schemas if available
let outputSchemas: Record<string, unknown> | undefined;
try {
  const schemaPath = path.join(__dirname, "..", ".trpc-studio.json");
  outputSchemas = JSON.parse(fs.readFileSync(schemaPath, "utf-8")) as Record<string, unknown>;
  console.log("Loaded output schemas from .trpc-studio.json");
} catch {
  console.log("No .trpc-studio.json found — output schemas not available");
}

app.get("/studio", (_req, res) => {
  res.send(
    renderTrpcStudio(appRouter, {
      url: "http://localhost:3000/trpc",
      outputSchemas: outputSchemas as Parameters<typeof renderTrpcStudio>[1]["outputSchemas"],
      meta: {
        title: "Example API",
        description: "A sample tRPC API for testing trpc-studio",
        version: "1.0.0",
      },
    }),
  );
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
  console.log("Studio available at http://localhost:3000/studio");
});
