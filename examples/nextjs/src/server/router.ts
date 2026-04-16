import { initTRPC } from "@trpc/server";
import { z } from "zod";

const t = initTRPC.create();

const userRouter = t.router({
  getById: t.procedure.input(z.object({ id: z.string() })).query(({ input }) => {
    return {
      id: input.id,
      name: "Jane Smith",
      email: "jane@example.com",
      role: "admin" as const,
      createdAt: new Date().toISOString(),
    };
  }),

  list: t.procedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).default(10),
          offset: z.number().min(0).default(0),
        })
        .optional(),
    )
    .query(({ input }) => {
      return {
        users: [
          { id: "1", name: "Jane Smith", email: "jane@example.com" },
          { id: "2", name: "John Doe", email: "john@example.com" },
        ],
        total: 2,
        limit: input?.limit ?? 10,
        offset: input?.offset ?? 0,
      };
    }),

  create: t.procedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
        role: z.enum(["admin", "user", "moderator"]).default("user"),
        tags: z.array(z.string()).optional(),
      }),
    )
    .mutation(({ input }) => {
      return {
        id: Math.random().toString(36).slice(2),
        ...input,
        createdAt: new Date().toISOString(),
      };
    }),
});

const postRouter = t.router({
  getById: t.procedure.input(z.object({ id: z.string() })).query(({ input }) => {
    return {
      id: input.id,
      title: "Getting Started with tRPC",
      content: "tRPC allows you to build fully typesafe APIs...",
      author: { id: "1", name: "Jane Smith" },
      published: true,
      tags: ["trpc", "typescript", "tutorial"],
    };
  }),

  create: t.procedure
    .input(
      z.object({
        title: z.string().min(1),
        content: z.string(),
        published: z.boolean().default(false),
        tags: z.array(z.string()).optional(),
      }),
    )
    .mutation(({ input }) => {
      return {
        id: Math.random().toString(36).slice(2),
        ...input,
        createdAt: new Date().toISOString(),
      };
    }),
});

export const appRouter = t.router({
  health: t.procedure.query(() => {
    return { status: "ok", timestamp: new Date().toISOString() };
  }),
  user: userRouter,
  post: postRouter,
});

export type AppRouter = typeof appRouter;
