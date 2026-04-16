import { initTRPC } from "@trpc/server";
import { z } from "zod";

const t = initTRPC.create();

export const appRouter = t.router({
  hello: t.procedure.input(z.object({ name: z.string().optional() })).query(({ input }) => {
    return { greeting: `Hello ${input.name ?? "world"}!` };
  }),

  user: t.router({
    getById: t.procedure.input(z.object({ id: z.string() })).query(({ input }) => {
      return { id: input.id, name: "John Doe", email: "john@example.com" };
    }),
  }),
});

export type AppRouter = typeof appRouter;
