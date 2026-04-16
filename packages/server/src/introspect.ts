/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */
import { zodToJsonSchema } from "zod-to-json-schema";

import type { JsonSchema, ProcedureInfo, ProcedureType, RouterManifest } from "@trpc-studio/core";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isZodType(schema: any): boolean {
  return schema !== null && schema !== undefined && typeof schema === "object" && "_def" in schema;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function zodInputToJsonSchema(zodSchema: any): JsonSchema | null {
  if (!isZodType(zodSchema)) {
    return null;
  }
  try {
    const jsonSchema = zodToJsonSchema(zodSchema, { target: "jsonSchema7" }) as Record<
      string,
      unknown
    >;
    // Strip the $schema key
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { $schema: _schema, ...rest } = jsonSchema;
    return rest as JsonSchema;
  } catch {
    return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mergeZodInputs(inputs: any[]): any {
  if (inputs.length === 0) return null;
  if (inputs.length === 1) return inputs[0];

  // For chained .input().input(), merge schemas as intersection
  // This mirrors how tRPC merges them at runtime
  let merged = inputs[0];
  for (let i = 1; i < inputs.length; i++) {
    if (isZodType(inputs[i])) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      merged = merged.and(inputs[i]);
    }
  }
  return merged;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractProcedureFromDef(def: any, path: string, procedures: ProcedureInfo[]): void {
  // Determine type from tRPC v10/v11
  let type: ProcedureType = "query";
  if (typeof def.type === "string") {
    type = def.type as ProcedureType;
  } else if (def.query) {
    type = "query";
  } else if (def.mutation) {
    type = "mutation";
  } else if (def.subscription) {
    type = "subscription";
  }

  // Extract inputs
  const inputs = def.inputs ?? [];
  const mergedInput = mergeZodInputs(inputs);
  const inputSchema = zodInputToJsonSchema(mergedInput);

  // Extract description from meta
  const description = def.meta?.description as string | undefined;

  procedures.push({
    path,
    type,
    inputSchema,
    outputSchema: null,
    ...(description !== undefined ? { description } : {}),
  });
}

function walkRouter(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  routerDef: any,
  prefix: string,
  procedures: ProcedureInfo[],
): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const record: Record<string, any> | undefined =
    routerDef?.record ?? routerDef?.procedures ?? routerDef;

  if (!record || typeof record !== "object") {
    return;
  }

  for (const [key, value] of Object.entries(record)) {
    const path = prefix ? `${prefix}.${key}` : key;

    const def = value?._def;

    // Case 1: Sub-router — has _def with nested record/procedures/router
    if (def && (def.record ?? def.procedures ?? def.router)) {
      walkRouter(def, path, procedures);
      continue;
    }

    // Case 2: tRPC v10 procedure — has _def with type/inputs
    if (def) {
      extractProcedureFromDef(def, path, procedures);
      continue;
    }

    // Case 3: tRPC v11 procedure — plain function, may have _def attached
    if (typeof value === "function") {
      if (value._def) {
        extractProcedureFromDef(value._def, path, procedures);
      } else {
        // Opaque function with no metadata — register with defaults
        procedures.push({
          path,
          type: "query",
          inputSchema: null,
          outputSchema: null,
        });
      }
      continue;
    }

    // Case 4: Plain object grouping (namespace without _def) — recurse
    if (typeof value === "object" && value !== null) {
      walkRouter(value, path, procedures);
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function introspectRouter(router: any): RouterManifest {
  const procedures: ProcedureInfo[] = [];

  const def = router?._def;
  if (!def) {
    return { procedures };
  }

  walkRouter(def, "", procedures);

  // Fallback: if walking the record tree found nothing, try the flat procedures map (tRPC v11)
  if (procedures.length === 0 && def.procedures && typeof def.procedures === "object") {
    for (const [procPath, proc] of Object.entries(def.procedures)) {
      const procDef = (proc as { _def?: unknown })?._def;
      if (procDef && typeof procDef === "object") {
        extractProcedureFromDef(procDef, procPath, procedures);
      } else {
        procedures.push({
          path: procPath,
          type: "query",
          inputSchema: null,
          outputSchema: null,
        });
      }
    }
  }

  return { procedures };
}
