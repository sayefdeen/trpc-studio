import { useCallback, useMemo, useState } from "react";

interface AuthConfig {
  type: "bearer" | "cookie" | "header" | "basic";
  name?: string;
  description?: string;
}

const STORAGE_KEY = "trpc-studio-auth";

function loadFromStorage(): Record<string, string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored) as Record<string, string>;
  } catch {
    // ignore
  }
  return {};
}

function saveToStorage(values: Record<string, string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
  } catch {
    // ignore
  }
}

function getAuthKey(config: AuthConfig, index: number): string {
  if (config.type === "cookie" && config.name) return `cookie:${config.name}`;
  if (config.type === "header" && config.name) return `header:${config.name}`;
  return `${config.type}:${String(index)}`;
}

export function useAuth(configs: AuthConfig[]) {
  const [values, setValuesState] = useState<Record<string, string>>(loadFromStorage);

  const setValues = useCallback((newValues: Record<string, string>) => {
    setValuesState(newValues);
    saveToStorage(newValues);
  }, []);

  const headers = useMemo(() => {
    const result: Record<string, string> = {};

    for (let i = 0; i < configs.length; i++) {
      const config = configs[i];
      if (!config) continue;
      const key = getAuthKey(config, i);
      const value = values[key];
      if (!value?.trim()) continue;

      switch (config.type) {
        case "bearer":
          result.Authorization = `Bearer ${value.trim()}`;
          break;
        case "basic":
          result.Authorization = `Basic ${value.trim()}`;
          break;
        case "header":
          if (config.name) {
            result[config.name] = value.trim();
          }
          break;
        case "cookie":
          // Cookies are handled via document.cookie or Cookie header
          if (config.name) {
            const existing = result.Cookie ?? "";
            result.Cookie = existing
              ? `${existing}; ${config.name}=${value.trim()}`
              : `${config.name}=${value.trim()}`;
          }
          break;
      }
    }

    return result;
  }, [configs, values]);

  const isConfigured = useMemo(() => {
    return configs.some((config, i) => {
      const key = getAuthKey(config, i);
      return Boolean(values[key]?.trim());
    });
  }, [configs, values]);

  return { values, setValues, headers, isConfigured };
}

export { getAuthKey };
export type { AuthConfig };
