import { useMemo, useState } from "react";

import { jsonSchemaToTree, type SchemaNode } from "../utils/schemaRenderer";

import type { JsonSchema } from "@trpc-studio/core";

const TYPE_BADGE_COLORS: Record<string, string> = {
  string: "bg-blue-100 text-blue-800",
  number: "bg-amber-100 text-amber-800",
  integer: "bg-amber-100 text-amber-800",
  boolean: "bg-green-100 text-green-800",
  object: "bg-purple-100 text-purple-800",
  array: "bg-teal-100 text-teal-800",
  null: "bg-gray-100 text-gray-600",
};

function getTypeBadgeColor(type: string): string {
  // Check for exact match first
  if (TYPE_BADGE_COLORS[type]) return TYPE_BADGE_COLORS[type] ?? "";
  // Check if any known type is contained
  for (const [key, val] of Object.entries(TYPE_BADGE_COLORS)) {
    if (type.includes(key)) return val;
  }
  return "bg-gray-100 text-gray-600";
}

interface ResponseSchemaViewerProps {
  schema: JsonSchema;
}

export function ResponseSchemaViewer({ schema }: ResponseSchemaViewerProps) {
  const tree = useMemo(() => jsonSchemaToTree(schema), [schema]);

  return (
    <div className="bg-gray-50 rounded border border-gray-200 p-3">
      <SchemaNodeView node={tree} depth={0} />
    </div>
  );
}

function SchemaNodeView({ node, depth }: { node: SchemaNode; depth: number }) {
  const [isExpanded, setIsExpanded] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className={depth > 0 ? "ml-4 border-l border-gray-200 pl-3" : ""}>
      <div
        className={`flex items-center gap-2 py-0.5 ${hasChildren ? "cursor-pointer hover:bg-gray-100 rounded px-1 -mx-1" : ""}`}
        onClick={hasChildren ? () => setIsExpanded(!isExpanded) : undefined}
      >
        {hasChildren && (
          <svg
            className={`h-3 w-3 text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? "rotate-90" : ""}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
              clipRule="evenodd"
            />
          </svg>
        )}
        {!hasChildren && <span className="w-3 flex-shrink-0" />}

        <span className="text-sm font-mono text-gray-800">{node.name}</span>

        {node.required && <span className="text-red-400 text-xs">required</span>}

        <span
          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${getTypeBadgeColor(node.type)}`}
        >
          {node.type}
        </span>

        {node.description && (
          <span className="text-xs text-gray-400 truncate">{node.description}</span>
        )}

        {node.enumValues && (
          <span className="text-xs text-gray-500">[{node.enumValues.map(String).join(", ")}]</span>
        )}
      </div>

      {isExpanded && hasChildren && (
        <div className="mt-0.5">
          {node.children?.map((child, i) => (
            <SchemaNodeView key={`${child.name}-${String(i)}`} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
