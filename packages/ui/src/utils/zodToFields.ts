import type { JsonSchema } from "@trpc-studio/core";

export type FieldType = "string" | "number" | "boolean" | "enum" | "object" | "array";

export interface FieldDescriptor {
  name: string;
  type: FieldType;
  required: boolean;
  description?: string;
  defaultValue?: unknown;
  enumValues?: string[];
  children?: FieldDescriptor[];
  itemField?: FieldDescriptor;
}

export function jsonSchemaToFields(
  schema: JsonSchema | null,
  name = "root",
  requiredFields: string[] = [],
): FieldDescriptor[] {
  if (!schema) return [];

  // Handle anyOf/oneOf (e.g., optional inputs)
  if (schema.anyOf ?? schema.oneOf) {
    const variants = schema.anyOf ?? schema.oneOf ?? [];
    // Find the non-negated variant (skip { not: {} })
    for (const variant of variants) {
      if (!("not" in variant)) {
        return jsonSchemaToFields(variant, name, requiredFields);
      }
    }
    return [];
  }

  // Handle object type
  if (schema.type === "object" && schema.properties) {
    const required = schema.required ?? [];
    return Object.entries(schema.properties).map(([key, propSchema]) => {
      return schemaToField(key, propSchema, required.includes(key));
    });
  }

  // Single field
  if (schema.type) {
    return [schemaToField(name, schema, requiredFields.includes(name))];
  }

  return [];
}

function optionalStr(val: string | undefined): { description: string } | Record<string, never> {
  return val !== undefined ? { description: val } : {};
}

function schemaToField(name: string, schema: JsonSchema, required: boolean): FieldDescriptor {
  // Enum
  if (schema.enum) {
    return {
      name,
      type: "enum",
      required,
      ...optionalStr(schema.description),
      defaultValue: (schema as Record<string, unknown>).default,
      enumValues: schema.enum.map(String),
    };
  }

  const schemaType = Array.isArray(schema.type) ? schema.type[0] : schema.type;

  // Object
  if (schemaType === "object" && schema.properties) {
    const childRequired = schema.required ?? [];
    const children = Object.entries(schema.properties).map(([key, propSchema]) =>
      schemaToField(key, propSchema, childRequired.includes(key)),
    );
    return {
      name,
      type: "object",
      required,
      ...optionalStr(schema.description),
      children,
    };
  }

  // Array
  if (schemaType === "array") {
    const itemField = schema.items ? schemaToField("item", schema.items, false) : undefined;
    return {
      name,
      type: "array",
      required,
      ...optionalStr(schema.description),
      ...(itemField !== undefined ? { itemField } : {}),
    };
  }

  // Boolean
  if (schemaType === "boolean") {
    return {
      name,
      type: "boolean",
      required,
      ...optionalStr(schema.description),
      defaultValue: (schema as Record<string, unknown>).default,
    };
  }

  // Number / integer
  if (schemaType === "number" || schemaType === "integer") {
    return {
      name,
      type: "number",
      required,
      ...optionalStr(schema.description),
      defaultValue: (schema as Record<string, unknown>).default,
    };
  }

  // Default to string
  return {
    name,
    type: "string",
    required,
    ...optionalStr(schema.description),
    defaultValue: (schema as Record<string, unknown>).default,
  };
}
