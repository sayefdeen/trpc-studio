import { initTRPC } from "@trpc/server";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { introspectRouter } from "../introspect";

const t = initTRPC.create();

describe("introspectRouter", () => {
  it("returns empty procedures for a router with no procedures", () => {
    const router = t.router({});
    const manifest = introspectRouter(router);
    expect(manifest.procedures).toEqual([]);
  });

  it("extracts a simple query procedure", () => {
    const router = t.router({
      hello: t.procedure.query(() => "hello"),
    });
    const manifest = introspectRouter(router);
    expect(manifest.procedures).toHaveLength(1);
    expect(manifest.procedures[0]).toMatchObject({
      path: "hello",
      type: "query",
      inputSchema: null,
      outputSchema: null,
    });
  });

  it("extracts a mutation procedure", () => {
    const router = t.router({
      create: t.procedure.input(z.object({ name: z.string() })).mutation(({ input }) => input),
    });
    const manifest = introspectRouter(router);
    expect(manifest.procedures).toHaveLength(1);
    expect(manifest.procedures[0]).toMatchObject({
      path: "create",
      type: "mutation",
    });
  });

  it("extracts input schema from Zod", () => {
    const router = t.router({
      getUser: t.procedure
        .input(z.object({ id: z.string(), age: z.number().optional() }))
        .query(({ input }) => input),
    });
    const manifest = introspectRouter(router);
    const proc = manifest.procedures[0];
    expect(proc?.inputSchema).toBeDefined();
    expect(proc?.inputSchema?.type).toBe("object");
    expect(proc?.inputSchema?.properties).toHaveProperty("id");
    expect(proc?.inputSchema?.properties).toHaveProperty("age");
    expect(proc?.inputSchema?.required).toContain("id");
    expect(proc?.inputSchema?.required).not.toContain("age");
  });

  it("extracts nested router procedures with dot-notation paths", () => {
    const router = t.router({
      user: t.router({
        getById: t.procedure.input(z.object({ id: z.string() })).query(({ input }) => input),
        create: t.procedure.input(z.object({ name: z.string() })).mutation(({ input }) => input),
      }),
    });
    const manifest = introspectRouter(router);
    expect(manifest.procedures).toHaveLength(2);
    expect(manifest.procedures.map((p) => p.path)).toEqual(["user.getById", "user.create"]);
  });

  it("handles deeply nested routers", () => {
    const router = t.router({
      api: t.router({
        v1: t.router({
          users: t.router({
            list: t.procedure.query(() => []),
          }),
        }),
      }),
    });
    const manifest = introspectRouter(router);
    expect(manifest.procedures).toHaveLength(1);
    expect(manifest.procedures[0]?.path).toBe("api.v1.users.list");
  });

  it("extracts enum input schemas", () => {
    const router = t.router({
      setRole: t.procedure
        .input(z.object({ role: z.enum(["admin", "user", "mod"]) }))
        .mutation(({ input }) => input),
    });
    const manifest = introspectRouter(router);
    const roleSchema = manifest.procedures[0]?.inputSchema?.properties?.role;
    expect(roleSchema?.enum).toEqual(["admin", "user", "mod"]);
  });

  it("extracts array input schemas", () => {
    const router = t.router({
      addTags: t.procedure
        .input(z.object({ tags: z.array(z.string()) }))
        .mutation(({ input }) => input),
    });
    const manifest = introspectRouter(router);
    const tagsSchema = manifest.procedures[0]?.inputSchema?.properties?.tags;
    expect(tagsSchema?.type).toBe("array");
    expect(tagsSchema?.items?.type).toBe("string");
  });

  it("handles procedures with no input", () => {
    const router = t.router({
      health: t.procedure.query(() => ({ status: "ok" })),
    });
    const manifest = introspectRouter(router);
    expect(manifest.procedures[0]?.inputSchema).toBeNull();
  });

  it("handles chained .input().input()", () => {
    const router = t.router({
      test: t.procedure
        .input(z.object({ a: z.string() }))
        .input(z.object({ b: z.number() }))
        .query(({ input }) => input),
    });
    const manifest = introspectRouter(router);
    const schema = manifest.procedures[0]?.inputSchema;
    expect(schema).toBeDefined();
    // Merged schema should have both 'a' and 'b'
    // zod .and() creates an intersection which zodToJsonSchema renders as allOf
    expect(schema?.allOf ?? schema?.properties).toBeDefined();
  });

  it("returns null for invalid router", () => {
    const manifest = introspectRouter(null);
    expect(manifest.procedures).toEqual([]);
  });

  it("returns null for object without _def", () => {
    const manifest = introspectRouter({ foo: "bar" });
    expect(manifest.procedures).toEqual([]);
  });
});
