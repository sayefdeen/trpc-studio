import { SearchBar } from "./SearchBar";

import type { RouterGroup } from "../hooks/useRouter";
import type { ProcedureType } from "@trpc-studio/core";

const TYPE_BADGES: Record<ProcedureType, { bg: string; text: string; label: string }> = {
  query: { bg: "bg-blue-100", text: "text-blue-800", label: "GET" },
  mutation: { bg: "bg-green-100", text: "text-green-800", label: "POST" },
  subscription: { bg: "bg-orange-100", text: "text-orange-800", label: "SUB" },
};

interface SidebarProps {
  groups: RouterGroup[];
  selectedPath: string | null;
  searchQuery: string;
  expandedGroups: Set<string>;
  onSelect: (path: string) => void;
  onSearch: (query: string) => void;
  onToggleGroup: (group: string) => void;
}

export function Sidebar({
  groups,
  selectedPath,
  searchQuery,
  expandedGroups,
  onSelect,
  onSearch,
  onToggleGroup,
}: SidebarProps) {
  return (
    <aside className="w-[280px] flex-shrink-0 bg-white border-r border-gray-200 flex flex-col h-full overflow-hidden">
      <div className="p-3 border-b border-gray-200">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Procedures</h2>
      </div>
      <SearchBar value={searchQuery} onChange={onSearch} />
      <nav className="flex-1 overflow-y-auto">
        {groups.map((group) => {
          const isExpanded = expandedGroups.has(group.name);
          return (
            <div key={group.name}>
              <button
                onClick={() => onToggleGroup(group.name)}
                className="w-full flex items-center px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 uppercase tracking-wider"
              >
                <svg
                  className={`h-3 w-3 mr-1.5 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                {group.name}
                <span className="ml-auto text-gray-400 text-xs font-normal">
                  {group.procedures.length}
                </span>
              </button>
              {isExpanded && (
                <div className="pb-1">
                  {group.procedures.map((proc) => {
                    const badge = TYPE_BADGES[proc.type];
                    const shortName = proc.path.split(".").pop() ?? proc.path;
                    const isSelected = proc.path === selectedPath;
                    return (
                      <button
                        key={proc.path}
                        onClick={() => onSelect(proc.path)}
                        className={`w-full flex items-center gap-2 px-4 py-1.5 text-sm hover:bg-gray-50 ${
                          isSelected ? "bg-blue-50 border-r-2 border-blue-500" : ""
                        }`}
                      >
                        <span
                          className={`inline-block px-1.5 py-0.5 text-[10px] font-bold rounded ${badge.bg} ${badge.text}`}
                        >
                          {badge.label}
                        </span>
                        <span
                          className={`truncate ${isSelected ? "text-blue-700 font-medium" : "text-gray-700"}`}
                        >
                          {shortName}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        {groups.length === 0 && (
          <p className="px-4 py-6 text-sm text-gray-400 text-center">No procedures found</p>
        )}
      </nav>
    </aside>
  );
}
