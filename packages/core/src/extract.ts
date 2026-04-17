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

export interface ExtractedSchemas {
  inputs: Record<string, JsonSchema>;
  outputs: Record<string, JsonSchema>;
}

export function extractRouterSchemas(options: ExtractOptions): ExtractedSchemas {
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
  const result: SchemaResult = { inputs: {}, outputs: {} };

  walkRouterType(routerType, "", result);

  return result;
}

/** @deprecated Use extractRouterSchemas instead — returns both inputs and outputs */
export function extractRouterOutputSchemas(options: ExtractOptions): Record<string, JsonSchema> {
  return extractRouterSchemas(options).outputs;
}

function extractProcedureOutputType(propDefType: Type): Type | null {
  // v10: _def._output_out
  const v10Output = getPropertyType(propDefType, "_output_out");
  if (v10Output) return v10Output;

  // v11: _def.$types.output
  const $types = getPropertyType(propDefType, "$types");
  if ($types) {
    return getPropertyType($types, "output");
  }

  return null;
}

function extractProcedureInputType(propDefType: Type): Type | null {
  // v10: _def._input_in
  const v10Input = getPropertyType(propDefType, "_input_in");
  if (v10Input) return v10Input;

  // v11: _def.$types.input
  const $types = getPropertyType(propDefType, "$types");
  if ($types) {
    return getPropertyType($types, "input");
  }

  return null;
}

function isProcedureType(type: Type): boolean {
  const defType = getPropertyType(type, "_def");
  if (!defType) return false;
  // v10: has _output_out or type field
  // v11: has $types or procedure: true
  return (
    getPropertyType(defType, "_output_out") !== null ||
    getPropertyType(defType, "$types") !== null ||
    getPropertyType(defType, "type") !== null
  );
}

interface SchemaResult {
  inputs: Record<string, JsonSchema>;
  outputs: Record<string, JsonSchema>;
}

function walkRecordEntries(recordType: Type, prefix: string, result: SchemaResult): void {
  for (const prop of recordType.getProperties()) {
    const propName = prop.getName();
    const path = prefix ? `${prefix}.${propName}` : propName;

    const propDecl = prop.getValueDeclaration() ?? prop.getDeclarations()[0];
    if (!propDecl) continue;
    const propType = prop.getTypeAtLocation(propDecl);

    // Check if this is a nested router (v10 style — has _def with record)
    const propDefType = getPropertyType(propType, "_def");
    if (propDefType && isRouterDef(propDefType)) {
      walkRouterType(propType, path, result);
      continue;
    }

    // Check if this is a procedure (has _def with type info)
    if (propDefType) {
      const outputType = extractProcedureOutputType(propDefType);
      if (outputType) {
        result.outputs[path] = typeToJsonSchema(outputType);
      }
      const inputType = extractProcedureInputType(propDefType);
      if (inputType && !inputType.isVoid() && !inputType.isUndefined()) {
        result.inputs[path] = typeToJsonSchema(inputType);
      }
      continue;
    }

    // v11: entry has no _def — it's a namespace object with procedures as direct properties
    // Check if its children are procedures and recurse
    const childProps = propType.getProperties();
    const firstChild = childProps[0];
    if (firstChild) {
      const firstDecl = firstChild.getValueDeclaration() ?? firstChild.getDeclarations()[0];
      if (firstDecl) {
        const firstChildType = firstChild.getTypeAtLocation(firstDecl);
        if (isProcedureType(firstChildType)) {
          walkRecordEntries(propType, path, result);
          continue;
        }
      }
    }
  }
}

function walkRouterType(type: Type, prefix: string, result: SchemaResult): void {
  // Get _def.record
  const defType = getPropertyType(type, "_def");
  if (!defType) return;

  const recordType = getPropertyType(defType, "record");
  if (!recordType) return;

  walkRecordEntries(recordType, prefix, result);
}
