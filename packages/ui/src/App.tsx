import { useCallback, useMemo, useState } from "react";

import { AuthModal } from "./components/AuthModal";
import { ProcedurePanel } from "./components/ProcedurePanel";
import { Sidebar } from "./components/Sidebar";
import { useAuth } from "./hooks/useAuth";
import { useRouter } from "./hooks/useRouter";

import type { RouterManifest } from "@trpc-studio/core";

interface AuthConfig {
  type: "bearer" | "cookie" | "header" | "basic";
  name?: string;
  description?: string;
}

interface StudioOptions {
  url: string;
  transformer: "superjson" | "none";
  headers: Record<string, string>;
  version?: string;
  auth?: AuthConfig[];
}

interface AppProps {
  manifest: RouterManifest;
  options: StudioOptions;
}

export function App({ manifest, options }: AppProps) {
  const router = useRouter(manifest);
  const authConfigs = options.auth ?? [];
  const auth = useAuth(authConfigs);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const mergedHeaders = useMemo(() => {
    return { ...options.headers, ...auth.headers };
  }, [options.headers, auth.headers]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    for (const proc of manifest.procedures) {
      const procTags = proc.meta?.tags;
      if (Array.isArray(procTags)) {
        for (const tag of procTags) {
          if (typeof tag === "string") tags.add(tag);
        }
      }
    }
    return Array.from(tags).sort();
  }, [manifest.procedures]);

  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return next;
    });
  }, []);

  const clearTags = useCallback(() => {
    setSelectedTags(new Set());
  }, []);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3 flex-shrink-0">
        <h1 className="text-lg font-bold text-gray-900">{manifest.title ?? "tRPC Studio"}</h1>
        {options.version && (
          <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">
            v{options.version}
          </span>
        )}
        {manifest.description && (
          <span className="text-sm text-gray-500 ml-2">{manifest.description}</span>
        )}
        <span className="ml-auto text-xs text-gray-400">
          {manifest.procedures.length} procedures
        </span>
        {authConfigs.length > 0 && (
          <button
            onClick={() => setShowAuthModal(true)}
            className={`ml-2 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border ${
              auth.isConfigured
                ? "bg-green-50 border-green-300 text-green-700"
                : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            {auth.isConfigured ? "🔒" : "🔓"} Authorize
          </button>
        )}
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          groups={router.groups}
          selectedPath={router.selectedPath}
          searchQuery={router.searchQuery}
          expandedGroups={router.expandedGroups}
          onSelect={router.setSelectedPath}
          onSearch={router.setSearchQuery}
          onToggleGroup={router.toggleGroup}
          allTags={allTags}
          selectedTags={selectedTags}
          onToggleTag={toggleTag}
          onClearTags={clearTags}
        />
        <main className="flex-1 overflow-y-auto p-6">
          {router.selectedProcedure ? (
            <ProcedurePanel
              procedure={router.selectedProcedure}
              baseUrl={options.url}
              transformer={options.transformer}
              headers={mergedHeaders}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <p className="text-lg mb-2">Select a procedure from the sidebar</p>
                <p className="text-sm">or use the search bar to find one</p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Auth modal */}
      {showAuthModal && (
        <AuthModal
          configs={authConfigs}
          values={auth.values}
          onSave={auth.setValues}
          onClose={() => setShowAuthModal(false)}
        />
      )}
    </div>
  );
}
