import { NextResponse } from "next/server";
import { renderTrpcStudio } from "@srawad/trpc-studio";

import { appRouter } from "~/server/router";

export function GET() {
  return new NextResponse(
    renderTrpcStudio(appRouter, {
      url: "/api/trpc",
      meta: {
        title: "trpc-studio Demo",
        description: "A live demo of trpc-studio with an example tRPC API",
        version: "0.1.5",
      },
    }),
    { status: 200, headers: { "Content-Type": "text/html" } },
  );
}
