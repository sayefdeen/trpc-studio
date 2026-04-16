import { initTRPC } from "@trpc/server";
import { z } from "zod";

const t = initTRPC.create();

const userRouter = t.router({
  getById: t.procedure.input(z.object({ id: z.string() })).query(({ input }) => {
    return {
      id: input.id,
      name: "John Doe",
      email: "john@example.com",
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
          { id: "1", name: "John Doe", email: "john@example.com" },
          { id: "2", name: "Jane Smith", email: "jane@example.com" },
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
        id: crypto.randomUUID(),
        ...input,
        createdAt: new Date().toISOString(),
      };
    }),

  delete: t.procedure.input(z.object({ id: z.string() })).mutation(({ input }) => {
    return { success: true, deletedId: input.id };
  }),
});

const postRouter = t.router({
  getById: t.procedure.input(z.object({ id: z.string() })).query(({ input }) => {
    return {
      id: input.id,
      title: "Hello World",
      content: "This is a blog post.",
      author: { id: "1", name: "John Doe" },
      published: true,
      tags: ["intro", "hello"],
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
        id: crypto.randomUUID(),
        ...input,
        createdAt: new Date().toISOString(),
      };
    }),
});

const healthCheck = t.procedure.query(() => {
  return { status: "ok", timestamp: new Date().toISOString() };
});

export const appRouter = t.router({
  health: healthCheck,
  user: userRouter,
  post: postRouter,
});

export type AppRouter = typeof appRouter;
