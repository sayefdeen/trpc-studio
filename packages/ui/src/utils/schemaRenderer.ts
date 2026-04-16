import type { JsonSchema } from "@trpc-studio/core";

export interface SchemaNode {
  name: string;
  type: string;
  required: boolean;
  description?: string;
  children?: SchemaNode[];
  enumValues?: unknown[];
}

function optionalDesc(val: string | undefined): { description: string } | Record<string, never> {
  return val !== undefined ? { description: val } : {};
}

export function jsonSchemaToTree(
  schema: JsonSchema,
  name = "response",
  required = true,
): SchemaNode {
  // Resolve $ref (simplified — assumes definitions in same schema)
  if (schema.$ref) {
    return {
      name,
      type: "ref",
      required,
      description: schema.$ref,
    };
  }

  // anyOf/oneOf
  if (schema.anyOf ?? schema.oneOf) {
    const variants = schema.anyOf ?? schema.oneOf ?? [];
    const types = variants.map((v) => getSimpleType(v)).join(" | ");
    return {
      name,
      type: types,
      required,
      ...optionalDesc(schema.description),
      children: variants.map((v, i) => jsonSchemaToTree(v, `variant ${String(i)}`, false)),
    };
  }

  // allOf
  if (schema.allOf) {
    return {
      name,
      type: "intersection",
      required,
      ...optionalDesc(schema.description),
      children: schema.allOf.map((v, i) => jsonSchemaToTree(v, `part ${String(i)}`, true)),
    };
  }

  // Enum
  if (schema.enum) {
    return {
      name,
      type: getSimpleType(schema),
      required,
      ...optionalDesc(schema.description),
      enumValues: schema.enum,
    };
  }

  const schemaType = Array.isArray(schema.type) ? schema.type[0] : schema.type;

  // Object
  if (schemaType === "object" && schema.properties) {
    const requiredFields = schema.required ?? [];
    const children = Object.entries(schema.properties).map(([key, prop]) =>
      jsonSchemaToTree(prop, key, requiredFields.includes(key)),
    );
    return {
      name,
      type: "object",
      required,
      ...optionalDesc(schema.description),
      children,
    };
  }

  // Array
  if (schemaType === "array" && schema.items) {
    return {
      name,
      type: "array",
      required,
      ...optionalDesc(schema.description),
      children: [jsonSchemaToTree(schema.items, "items", true)],
    };
  }

  // Primitive
  return {
    name,
    type: schemaType ?? "unknown",
    required,
    ...optionalDesc(schema.description),
  };
}

function getSimpleType(schema: JsonSchema): string {
  if (schema.type) {
    return Array.isArray(schema.type) ? schema.type.join(" | ") : schema.type;
  }
  if (schema.$ref) return "ref";
  if (schema.anyOf) return schema.anyOf.map(getSimpleType).join(" | ");
  if (schema.oneOf) return schema.oneOf.map(getSimpleType).join(" | ");
  if (schema.allOf) return schema.allOf.map(getSimpleType).join(" & ");
  return "unknown";
}
