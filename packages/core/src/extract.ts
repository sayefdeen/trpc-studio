import { Project, type Type } from "ts-morph";

import type { JsonSchema } from "./schema";

export interface ExtractOptions {
  routerPath: string;
  routerName?: string;
  tsconfigPath?: string;
}

function typeToJsonSchema(type: Type, seen = new Set<string>()): JsonSchema {
  const typeText = type.getText();

  // Circular reference check
  if (seen.has(typeText)) {
    return { $ref: `#/definitions/${typeText}` };
  }

  // void / undefined / never
  if (type.isUndefined() || type.isVoid() || type.isNever()) {
    return { type: "null" };
  }

  // null
  if (type.isNull()) {
    return { type: "null" };
  }

  // string
  if (type.isString() || type.isStringLiteral()) {
    return { type: "string" };
  }

  // number
  if (type.isNumber() || type.isNumberLiteral()) {
    return { type: "number" };
  }

  // boolean
  if (type.isBoolean() || type.isBooleanLiteral()) {
    return { type: "boolean" };
  }

  // Enum literal
  if (type.isEnumLiteral()) {
    return { type: "string", enum: [type.getLiteralValue()] };
  }

  // Array
  if (type.isArray()) {
    const elementType = type.getArrayElementType();
    return {
      type: "array",
      items: elementType ? typeToJsonSchema(elementType, seen) : {},
    };
  }

  // Union type
  if (type.isUnion()) {
    const unionTypes = type.getUnionTypes();

    // String literal union → enum
    if (unionTypes.every((t) => t.isStringLiteral())) {
      return {
        type: "string",
        enum: unionTypes.map((t) => t.getLiteralValue()),
      };
    }

    // Nullable type (T | null | undefined)
    const nonNullTypes = unionTypes.filter((t) => !t.isNull() && !t.isUndefined());
    if (nonNullTypes.length === 1 && nonNullTypes[0]) {
      const inner = typeToJsonSchema(nonNullTypes[0], seen);
      return { anyOf: [inner, { type: "null" }] };
    }

    return {
      anyOf: unionTypes.map((t) => typeToJsonSchema(t, seen)),
    };
  }

  // Intersection type
  if (type.isIntersection()) {
    return {
      allOf: type.getIntersectionTypes().map((t) => typeToJsonSchema(t, seen)),
    };
  }

  // Date
  if (typeText === "Date") {
    return { type: "string", description: "ISO date string" };
  }

  // Object / interface
  if (type.isObject()) {
    // Promise<T> — unwrap
    const symbol = type.getSymbol();
    if (symbol?.getName() === "Promise") {
      const typeArgs = type.getTypeArguments();
      if (typeArgs[0]) {
        return typeToJsonSchema(typeArgs[0], seen);
      }
    }

    // Map, Set — simplify
    const name = symbol?.getName();
    if (name === "Map" || name === "Set") {
      return { type: "object" };
    }

    const newSeen = new Set(seen);
    newSeen.add(typeText);

    const properties: Record<string, JsonSchema> = {};
    const required: string[] = [];

    for (const prop of type.getProperties()) {
      const propName = prop.getName();
      const propDecl = prop.getValueDeclaration() ?? prop.getDeclarations()[0];
      if (!propDecl) continue;

      const propType = prop.getTypeAtLocation(propDecl);
      properties[propName] = typeToJsonSchema(propType, newSeen);

      if (!prop.isOptional()) {
        required.push(propName);
      }
    }

    const schema: JsonSchema = { type: "object", properties };
    if (required.length > 0) {
      schema.required = required;
    }
    return schema;
  }

  // Fallback
  return {};
}

function getPropertyType(parentType: Type, propName: string): Type | null {
  const prop = parentType.getProperty(propName);
  if (!prop) return null;
  const decl = prop.getValueDeclaration() ?? prop.getDeclarations()[0];
  if (!decl) return null;
  return prop.getTypeAtLocation(decl);
}

function isRouterDef(defType: Type): boolean {
  // Routers have record with procedure children; procedures have resolver/query/mutation
  const recordType = getPropertyType(defType, "record");
  if (!recordType) return false;
  // Check if record has any properties (routers have procedure entries)
  return recordType.getProperties().length > 0 && !recordType.isBoolean();
}

export function extractRouterOutputSchemas(options: ExtractOptions): Record<string, JsonSchema> {
  const projectOptions: ConstructorParameters<typeof Project>[0] = {
    skipAddingFilesFromTsConfig: false,
  };
  if (options.tsconfigPath) {
    projectOptions.tsConfigFilePath = options.tsconfigPath;
  }
  const project = new Project(projectOptions);

  const sourceFile = project.addSourceFileAtPath(options.routerPath);
  project.resolveSourceFileDependencies();

  const routerName = options.routerName ?? "appRouter";

  const routerVar = sourceFile.getVariableDeclaration(routerName);
  if (!routerVar) {
    throw new Error(`Could not find variable "${routerName}" in ${options.routerPath}`);
  }

  const routerType = routerVar.getType();
  const result: Record<string, JsonSchema> = {};

  walkRouterType(routerType, "", result);

  return result;
}

function walkRouterType(type: Type, prefix: string, result: Record<string, JsonSchema>): void {
  // Get _def.record
  const defType = getPropertyType(type, "_def");
  if (!defType) return;

  const recordType = getPropertyType(defType, "record");
  if (!recordType) return;

  for (const prop of recordType.getProperties()) {
    const propName = prop.getName();
    const path = prefix ? `${prefix}.${propName}` : propName;

    const propDecl = prop.getValueDeclaration() ?? prop.getDeclarations()[0];
    if (!propDecl) continue;
    const propType = prop.getTypeAtLocation(propDecl);

    // Check if this is a nested router or a procedure
    const propDefType = getPropertyType(propType, "_def");
    if (propDefType && isRouterDef(propDefType)) {
      // Nested router — recurse
      walkRouterType(propType, path, result);
      continue;
    }

    // This is a procedure — extract _def._output_out
    if (propDefType) {
      const outputType = getPropertyType(propDefType, "_output_out");
      if (outputType) {
        const schema = typeToJsonSchema(outputType);
        result[path] = schema;
      }
    }
  }
}
