import { describe, expect, it } from "vitest";

import { jsonSchemaToTree } from "../utils/schemaRenderer";

import type { JsonSchema } from "@trpc-studio/core";

describe("jsonSchemaToTree", () => {
  it("renders a simple string type", () => {
    const schema: JsonSchema = { type: "string" };
    const tree = jsonSchemaToTree(schema, "name");
    expect(tree).toMatchObject({
      name: "name",
      type: "string",
      required: true,
    });
  });

  it("renders an object with properties", () => {
    const schema: JsonSchema = {
      type: "object",
      properties: {
        id: { type: "string" },
        age: { type: "number" },
      },
      required: ["id"],
    };
    const tree = jsonSchemaToTree(schema);
    expect(tree.type).toBe("object");
    expect(tree.children).toHaveLength(2);
    expect(tree.children?.[0]).toMatchObject({
      name: "id",
      type: "string",
      required: true,
    });
    expect(tree.children?.[1]).toMatchObject({
      name: "age",
      type: "number",
      required: false,
    });
  });

  it("renders an array with item type", () => {
    const schema: JsonSchema = {
      type: "array",
      items: { type: "string" },
    };
    const tree = jsonSchemaToTree(schema, "tags");
    expect(tree.type).toBe("array");
    expect(tree.children).toHaveLength(1);
    expect(tree.children?.[0]).toMatchObject({
      name: "items",
      type: "string",
    });
  });

  it("renders nested objects", () => {
    const schema: JsonSchema = {
      type: "object",
      properties: {
        author: {
          type: "object",
          properties: {
            name: { type: "string" },
          },
          required: ["name"],
        },
      },
    };
    const tree = jsonSchemaToTree(schema);
    const author = tree.children?.[0];
    expect(author?.type).toBe("object");
    expect(author?.children?.[0]).toMatchObject({
      name: "name",
      type: "string",
      required: true,
    });
  });

  it("renders anyOf as union type", () => {
    const schema: JsonSchema = {
      anyOf: [{ type: "string" }, { type: "null" }],
    };
    const tree = jsonSchemaToTree(schema);
    expect(tree.type).toBe("string | null");
    expect(tree.children).toHaveLength(2);
  });

  it("renders enum values", () => {
    const schema: JsonSchema = {
      type: "string",
      enum: ["admin", "user", "mod"],
    };
    const tree = jsonSchemaToTree(schema, "role");
    expect(tree.enumValues).toEqual(["admin", "user", "mod"]);
  });

  it("renders $ref as ref type", () => {
    const schema: JsonSchema = {
      $ref: "#/definitions/User",
    };
    const tree = jsonSchemaToTree(schema);
    expect(tree.type).toBe("ref");
    expect(tree.description).toBe("#/definitions/User");
  });

  it("renders allOf as intersection", () => {
    const schema: JsonSchema = {
      allOf: [
        { type: "object", properties: { a: { type: "string" } } },
        { type: "object", properties: { b: { type: "number" } } },
      ],
    };
    const tree = jsonSchemaToTree(schema);
    expect(tree.type).toBe("intersection");
    expect(tree.children).toHaveLength(2);
  });

  it("preserves description", () => {
    const schema: JsonSchema = {
      type: "string",
      description: "The user's name",
    };
    const tree = jsonSchemaToTree(schema, "name");
    expect(tree.description).toBe("The user's name");
  });

  it("handles unknown type gracefully", () => {
    const schema: JsonSchema = {};
    const tree = jsonSchemaToTree(schema);
    expect(tree.type).toBe("unknown");
  });
});
