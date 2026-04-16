export interface JsonSchema {
  type?: string | string[];
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  $ref?: string;
  definitions?: Record<string, JsonSchema>;
  description?: string;
  enum?: unknown[];
  required?: string[];
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  allOf?: JsonSchema[];
  not?: JsonSchema | Record<string, never>;
  additionalProperties?: boolean;
}

export type ProcedureType = "query" | "mutation" | "subscription";

export interface ProcedureInfo {
  path: string;
  type: ProcedureType;
  inputSchema: JsonSchema | null;
  outputSchema: JsonSchema | null;
  description?: string;
}

export interface RouterManifest {
  procedures: ProcedureInfo[];
  title?: string;
  description?: string;
}
