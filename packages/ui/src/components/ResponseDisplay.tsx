import type { TrpcCallResult } from "../hooks/useTrpcCall";

interface ResponseDisplayProps {
  result: TrpcCallResult;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${String(bytes)} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function syntaxHighlight(json: string): string {
  return json.replace(
    /("(\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
    (match) => {
      let cls = "text-amber-600"; // number
      if (match.startsWith('"')) {
        if (match.endsWith(":")) {
          cls = "text-blue-700"; // key
        } else {
          cls = "text-green-700"; // string
        }
      } else if (/true|false/.test(match)) {
        cls = "text-purple-600"; // boolean
      } else if (match === "null") {
        cls = "text-gray-400"; // null
      }
      return `<span class="${cls}">${match}</span>`;
    },
  );
}

export function ResponseDisplay({ result }: ResponseDisplayProps) {
  const isError = result.error !== null;
  const jsonStr =
    typeof result.data === "string" ? result.data : JSON.stringify(result.data, null, 2);

  return (
    <div className="border border-gray-200 rounded-md overflow-hidden">
      {/* Status bar */}
      <div
        className={`flex items-center gap-4 px-4 py-2 text-sm ${
          isError ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
        }`}
      >
        <span className="font-semibold">
          {result.status > 0 ? `${String(result.status)}` : "Error"}
        </span>
        <span className="text-gray-500">{String(result.time)} ms</span>
        <span className="text-gray-500">{formatBytes(result.size)}</span>
        {result.error && <span className="ml-auto text-red-600">{result.error}</span>}
      </div>

      {/* Response body */}
      <pre
        className="p-4 text-xs bg-gray-50 max-h-96 overflow-y-auto whitespace-pre-wrap break-all"
        dangerouslySetInnerHTML={{ __html: syntaxHighlight(jsonStr ?? "") }}
      />
    </div>
  );
}
