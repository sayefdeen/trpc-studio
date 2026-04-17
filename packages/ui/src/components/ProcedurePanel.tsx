import { useCallback, useMemo, useState } from "react";

import { InputForm } from "./InputForm";
import { ResponseDisplay } from "./ResponseDisplay";
import { ResponseSchemaViewer } from "./ResponseSchemaViewer";
import { useTrpcCall } from "../hooks/useTrpcCall";
import { jsonSchemaToFields } from "../utils/zodToFields";

import type { ProcedureInfo, ProcedureType } from "@trpc-studio/core";

const TYPE_COLORS: Record<ProcedureType, string> = {
  query: "bg-blue-500",
  mutation: "bg-green-500",
  subscription: "bg-orange-500",
};

const TYPE_LABELS: Record<ProcedureType, string> = {
  query: "QUERY",
  mutation: "MUTATION",
  subscription: "SUBSCRIPTION",
};

interface ProcedurePanelProps {
  procedure: ProcedureInfo;
  baseUrl: string;
  transformer: "superjson" | "none";
  headers: Record<string, string>;
}

export function ProcedurePanel({ procedure, baseUrl, transformer, headers }: ProcedurePanelProps) {
  const fields = useMemo(() => jsonSchemaToFields(procedure.inputSchema), [procedure.inputSchema]);
  const [authHeader, setAuthHeader] = useState("");

  const mergedHeaders = useMemo(() => {
    const h = { ...headers };
    if (authHeader.trim()) {
      h.Authorization = authHeader.trim();
    }
    return h;
  }, [headers, authHeader]);

  const { execute, isLoading, result } = useTrpcCall({
    baseUrl,
    transformer,
    headers: mergedHeaders,
  });

  const handleSubmit = useCallback(
    (values: Record<string, unknown>) => {
      void execute(procedure.path, procedure.type, values);
    },
    [execute, procedure.path, procedure.type],
  );

  return (
    <div className="border border-gray-200 rounded-lg bg-white shadow-sm mb-4">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-100">
        <span
          className={`px-2 py-1 text-xs font-bold text-white rounded ${TYPE_COLORS[procedure.type]}`}
        >
          {TYPE_LABELS[procedure.type]}
        </span>
        <span className="font-mono text-sm font-semibold text-gray-900">{procedure.path}</span>
        {procedure.description && (
          <span className="text-sm text-gray-500 ml-2">{procedure.description}</span>
        )}
      </div>

      {/* Meta */}
      {procedure.meta && Object.keys(procedure.meta).length > 0 && (
        <div className="px-4 pt-3 pb-1 border-b border-gray-100">
          <div className="flex flex-wrap gap-2">
            {Object.entries(procedure.meta).map(([key, value]) => {
              if (key === "description") return null;
              const display = typeof value === "boolean" ? key : `${key}: ${String(value)}`;
              const isWarning = key === "deprecated" && value === true;
              return (
                <span
                  key={key}
                  className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
                    isWarning ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {key === "auth" && value === true && "🔒 "}
                  {isWarning && "⚠️ "}
                  {display}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Parameters / Try It Out */}
      <div className="p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Parameters</h3>
        <InputForm
          key={procedure.path}
          fields={fields}
          onSubmit={handleSubmit}
          isLoading={isLoading}
        />
      </div>

      {/* Authorization */}
      <div className="px-4 pb-4">
        <label className="block text-sm font-medium text-gray-500 mb-1">
          Authorization
          <span className="text-gray-400 font-normal ml-2">optional</span>
        </label>
        <input
          type="text"
          value={authHeader}
          onChange={(e) => setAuthHeader(e.target.value)}
          placeholder="Bearer eyJhbGciOi..."
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
        />
      </div>

      {/* Response */}
      {result && (
        <div className="p-4 border-t border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Response</h3>
          <ResponseDisplay result={result} />
        </div>
      )}

      {/* Response Schema */}
      <div className="p-4 border-t border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Response Schema</h3>
        {procedure.outputSchema ? (
          <ResponseSchemaViewer schema={procedure.outputSchema} />
        ) : (
          <p className="text-sm text-gray-400 italic">
            Output type not available — run the CLI extractor to enable this
          </p>
        )}
      </div>
    </div>
  );
}
