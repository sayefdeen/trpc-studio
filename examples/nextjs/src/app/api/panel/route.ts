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
      meta: { title: "My API" },
    }),
    { status: 200, headers: { "Content-Type": "text/html" } },
  );
}
