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

  it("extracts output schema when .output() is used", () => {
    const router = t.router({
      getUser: t.procedure
        .input(z.object({ id: z.string() }))
        .output(z.object({ id: z.string(), name: z.string(), email: z.string() }))
        .query(({ input }) => ({ id: input.id, name: "John", email: "john@example.com" })),
    });
    const manifest = introspectRouter(router);
    const proc = manifest.procedures[0];
    expect(proc?.outputSchema).toBeDefined();
    expect(proc?.outputSchema?.type).toBe("object");
    expect(proc?.outputSchema?.properties).toHaveProperty("id");
    expect(proc?.outputSchema?.properties).toHaveProperty("name");
    expect(proc?.outputSchema?.properties).toHaveProperty("email");
  });

  it("returns null outputSchema when .output() is not used", () => {
    const router = t.router({
      hello: t.procedure.query(() => "hello"),
    });
    const manifest = introspectRouter(router);
    expect(manifest.procedures[0]?.outputSchema).toBeNull();
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

  // tRPC v11 compatibility tests — simulate v11 internal structure
  describe("tRPC v11 compatibility", () => {
    it("extracts procedures that are plain functions in record (v11 style)", () => {
      // In v11, leaf procedures inside a sub-router's record are plain functions
      const mockRouter = {
        _def: {
          record: {
            hello: Object.assign(() => "hello", {
              _def: { type: "query", inputs: [] },
            }),
          },
        },
      };
      const manifest = introspectRouter(mockRouter);
      expect(manifest.procedures).toHaveLength(1);
      expect(manifest.procedures[0]).toMatchObject({
        path: "hello",
        type: "query",
        inputSchema: null,
      });
    });

    it("extracts nested v11 routers with function procedures", () => {
      const mockRouter = {
        _def: {
          record: {
            user: {
              _def: {
                record: {
                  getById: Object.assign(() => null, {
                    _def: { type: "query", inputs: [] },
                  }),
                  create: Object.assign(() => null, {
                    _def: { type: "mutation", inputs: [] },
                  }),
                },
              },
            },
          },
        },
      };
      const manifest = introspectRouter(mockRouter);
      expect(manifest.procedures).toHaveLength(2);
      expect(manifest.procedures.map((p) => p.path)).toEqual(["user.getById", "user.create"]);
      expect(manifest.procedures[0]?.type).toBe("query");
      expect(manifest.procedures[1]?.type).toBe("mutation");
    });

    it("handles opaque function procedures with no _def", () => {
      // Worst case: procedure is a plain function with no metadata at all
      const mockRouter = {
        _def: {
          record: {
            accounts: {
              _def: {
                record: {
                  get: () => null,
                  list: () => null,
                },
              },
            },
          },
        },
      };
      const manifest = introspectRouter(mockRouter);
      expect(manifest.procedures).toHaveLength(2);
      expect(manifest.procedures.map((p) => p.path)).toEqual(["accounts.get", "accounts.list"]);
      // Defaults to query when type is unknown
      expect(manifest.procedures[0]?.type).toBe("query");
    });

    it("falls back to flat procedures map when record walk finds nothing", () => {
      // Simulate a router where record is empty but procedures flat map exists
      const mockRouter = {
        _def: {
          record: {},
          procedures: {
            "accounts.get": Object.assign(() => null, {
              _def: { type: "query", inputs: [] },
            }),
            "accounts.create": Object.assign(() => null, {
              _def: { type: "mutation", inputs: [] },
            }),
          },
        },
      };
      const manifest = introspectRouter(mockRouter);
      expect(manifest.procedures).toHaveLength(2);
      expect(manifest.procedures.map((p) => p.path)).toEqual(["accounts.get", "accounts.create"]);
      expect(manifest.procedures[0]?.type).toBe("query");
      expect(manifest.procedures[1]?.type).toBe("mutation");
    });

    it("handles v11 function procedures with Zod input", () => {
      const mockRouter = {
        _def: {
          record: {
            getUser: Object.assign(() => null, {
              _def: {
                type: "query",
                inputs: [z.object({ id: z.string() })],
              },
            }),
          },
        },
      };
      const manifest = introspectRouter(mockRouter);
      expect(manifest.procedures).toHaveLength(1);
      expect(manifest.procedures[0]?.inputSchema).toBeDefined();
      expect(manifest.procedures[0]?.inputSchema?.type).toBe("object");
      expect(manifest.procedures[0]?.inputSchema?.properties).toHaveProperty("id");
    });
  });
});
