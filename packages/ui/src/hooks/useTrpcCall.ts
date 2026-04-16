import { useCallback, useRef, useState } from "react";

import type { ProcedureType } from "@trpc-studio/core";

export interface TrpcCallResult {
  data: unknown;
  status: number;
  time: number;
  size: number;
  error: string | null;
}

interface UseTrpcCallOptions {
  baseUrl: string;
  transformer: "superjson" | "none";
  headers: Record<string, string>;
}

export function useTrpcCall({ baseUrl, transformer, headers }: UseTrpcCallOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TrpcCallResult | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const execute = useCallback(
    async (procedurePath: string, procedureType: ProcedureType, input: Record<string, unknown>) => {
      // Cancel any in-flight request
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsLoading(true);
      setResult(null);

      const start = performance.now();
      const url = `${baseUrl}/${procedurePath}`;

      try {
        let response: Response;
        const requestHeaders: Record<string, string> = {
          ...headers,
          "Content-Type": "application/json",
        };

        const hasInput = Object.keys(input).length > 0;

        if (procedureType === "query") {
          const queryUrl = hasInput
            ? `${url}?input=${encodeURIComponent(
                JSON.stringify(
                  transformer === "superjson" ? { json: input, meta: { values: {} } } : input,
                ),
              )}`
            : url;
          response = await fetch(queryUrl, {
            headers: requestHeaders,
            signal: controller.signal,
          });
        } else {
          const body = transformer === "superjson" ? { json: input, meta: { values: {} } } : input;
          response = await fetch(url, {
            method: "POST",
            headers: requestHeaders,
            body: JSON.stringify(body),
            signal: controller.signal,
          });
        }

        const time = Math.round(performance.now() - start);
        const text = await response.text();
        const size = new TextEncoder().encode(text).length;

        let data: unknown;
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }

        setResult({
          data,
          status: response.status,
          time,
          size,
          error: response.ok ? null : `HTTP ${String(response.status)}`,
        });
      } catch (err) {
        // Don't update state if the request was cancelled
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        const time = Math.round(performance.now() - start);
        setResult({
          data: null,
          status: 0,
          time,
          size: 0,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    },
    [baseUrl, transformer, headers],
  );

  return { execute, isLoading, result };
}
