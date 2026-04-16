import { describe, expect, it } from "vitest";

import { jsonSchemaToFields } from "../utils/zodToFields";

import type { JsonSchema } from "@trpc-studio/core";

describe("jsonSchemaToFields", () => {
  it("returns empty array for null schema", () => {
    expect(jsonSchemaToFields(null)).toEqual([]);
  });

  it("returns empty array for schema with no type", () => {
    expect(jsonSchemaToFields({})).toEqual([]);
  });

  it("extracts string fields from object schema", () => {
    const schema: JsonSchema = {
      type: "object",
      properties: {
        name: { type: "string" },
      },
      required: ["name"],
    };
    const fields = jsonSchemaToFields(schema);
    expect(fields).toHaveLength(1);
    expect(fields[0]).toMatchObject({
      name: "name",
      type: "string",
      required: true,
    });
  });

  it("extracts number fields", () => {
    const schema: JsonSchema = {
      type: "object",
      properties: {
        age: { type: "number" },
      },
    };
    const fields = jsonSchemaToFields(schema);
    expect(fields[0]).toMatchObject({
      name: "age",
      type: "number",
      required: false,
    });
  });

  it("extracts boolean fields", () => {
    const schema: JsonSchema = {
      type: "object",
      properties: {
        active: { type: "boolean" },
      },
    };
    const fields = jsonSchemaToFields(schema);
    expect(fields[0]).toMatchObject({
      name: "active",
      type: "boolean",
    });
  });

  it("extracts enum fields", () => {
    const schema: JsonSchema = {
      type: "object",
      properties: {
        role: { type: "string", enum: ["admin", "user"] },
      },
    };
    const fields = jsonSchemaToFields(schema);
    expect(fields[0]).toMatchObject({
      name: "role",
      type: "enum",
      enumValues: ["admin", "user"],
    });
  });

  it("extracts nested object fields", () => {
    const schema: JsonSchema = {
      type: "object",
      properties: {
        address: {
          type: "object",
          properties: {
            street: { type: "string" },
            city: { type: "string" },
          },
          required: ["street"],
        },
      },
    };
    const fields = jsonSchemaToFields(schema);
    expect(fields[0]).toMatchObject({
      name: "address",
      type: "object",
    });
    expect(fields[0]?.children).toHaveLength(2);
    expect(fields[0]?.children?.[0]).toMatchObject({
      name: "street",
      type: "string",
      required: true,
    });
    expect(fields[0]?.children?.[1]).toMatchObject({
      name: "city",
      type: "string",
      required: false,
    });
  });

  it("extracts array fields with item type", () => {
    const schema: JsonSchema = {
      type: "object",
      properties: {
        tags: {
          type: "array",
          items: { type: "string" },
        },
      },
    };
    const fields = jsonSchemaToFields(schema);
    expect(fields[0]).toMatchObject({
      name: "tags",
      type: "array",
    });
    expect(fields[0]?.itemField).toMatchObject({
      name: "item",
      type: "string",
    });
  });

  it("handles anyOf (optional inputs)", () => {
    const schema: JsonSchema = {
      anyOf: [
        { not: {} },
        {
          type: "object",
          properties: {
            limit: { type: "number" },
          },
        },
      ],
    };
    const fields = jsonSchemaToFields(schema);
    expect(fields).toHaveLength(1);
    expect(fields[0]).toMatchObject({
      name: "limit",
      type: "number",
    });
  });

  it("marks required fields correctly", () => {
    const schema: JsonSchema = {
      type: "object",
      properties: {
        name: { type: "string" },
        bio: { type: "string" },
      },
      required: ["name"],
    };
    const fields = jsonSchemaToFields(schema);
    expect(fields.find((f) => f.name === "name")?.required).toBe(true);
    expect(fields.find((f) => f.name === "bio")?.required).toBe(false);
  });

  it("extracts multiple fields from a complex schema", () => {
    const schema: JsonSchema = {
      type: "object",
      properties: {
        name: { type: "string" },
        age: { type: "number" },
        active: { type: "boolean" },
        role: { type: "string", enum: ["admin", "user"] },
        tags: { type: "array", items: { type: "string" } },
      },
      required: ["name", "age"],
    };
    const fields = jsonSchemaToFields(schema);
    expect(fields).toHaveLength(5);
    expect(fields.map((f) => f.name)).toEqual(["name", "age", "active", "role", "tags"]);
    expect(fields.map((f) => f.type)).toEqual(["string", "number", "boolean", "enum", "array"]);
  });
});
