import { useCallback, useMemo, useState } from "react";

import type { ProcedureInfo, RouterManifest } from "@trpc-studio/core";

export interface RouterGroup {
  name: string;
  procedures: ProcedureInfo[];
}

export function useRouter(manifest: RouterManifest) {
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const groups = useMemo(() => {
    const groupMap = new Map<string, ProcedureInfo[]>();

    for (const proc of manifest.procedures) {
      const parts = proc.path.split(".");
      const groupName = parts.length > 1 ? parts.slice(0, -1).join(".") : "(root)";

      const existing = groupMap.get(groupName);
      if (existing) {
        existing.push(proc);
      } else {
        groupMap.set(groupName, [proc]);
      }
    }

    const result: RouterGroup[] = [];
    for (const [name, procedures] of groupMap) {
      result.push({ name, procedures });
    }
    return result;
  }, [manifest.procedures]);

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groups;

    const query = searchQuery.toLowerCase();
    return groups
      .map((group) => ({
        ...group,
        procedures: group.procedures.filter((proc) => proc.path.toLowerCase().includes(query)),
      }))
      .filter((group) => group.procedures.length > 0);
  }, [groups, searchQuery]);

  const selectedProcedure = useMemo(() => {
    if (!selectedPath) return null;
    return manifest.procedures.find((p) => p.path === selectedPath) ?? null;
  }, [manifest.procedures, selectedPath]);

  const toggleGroup = useCallback((groupName: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupName)) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }
      return next;
    });
  }, []);

  // Start with all groups expanded
  useMemo(() => {
    if (expandedGroups.size === 0 && groups.length > 0) {
      setExpandedGroups(new Set(groups.map((g) => g.name)));
    }
  }, [groups, expandedGroups.size]);

  return {
    groups: filteredGroups,
    selectedPath,
    selectedProcedure,
    searchQuery,
    expandedGroups,
    setSelectedPath,
    setSearchQuery,
    toggleGroup,
  };
}
