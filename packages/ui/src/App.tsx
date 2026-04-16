import { ProcedurePanel } from "./components/ProcedurePanel";
import { Sidebar } from "./components/Sidebar";
import { useRouter } from "./hooks/useRouter";

import type { RouterManifest } from "@trpc-studio/core";

interface StudioOptions {
  url: string;
  transformer: "superjson" | "none";
  headers: Record<string, string>;
  version?: string;
}

interface AppProps {
  manifest: RouterManifest;
  options: StudioOptions;
}

export function App({ manifest, options }: AppProps) {
  const router = useRouter(manifest);

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
        />
        <main className="flex-1 overflow-y-auto p-6">
          {router.selectedProcedure ? (
            <ProcedurePanel
              procedure={router.selectedProcedure}
              baseUrl={options.url}
              transformer={options.transformer}
              headers={options.headers}
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
    </div>
  );
}
