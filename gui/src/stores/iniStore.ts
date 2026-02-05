import { atom, computed } from "nanostores";
import {
  SubconverterIniParser,
  type IniSection,
  type ProxyGroup,
  type Ruleset,
} from "../lib/ini-parser";
import { toast } from "wc-toast";

// --- Constants ---
const STORAGE_KEY_FILE = "ini-editor-current-file";
const STORAGE_KEY_DRAFT_PREFIX = "ini-editor-draft-";

// --- Atoms: State ---
export const contentAtom = atom<string>("");
export const filesAtom = atom<string[]>([]);
export const currentFileAtom = atom<string>("");
export const isDirtyAtom = atom<boolean>(false);
export const statusAtom = atom<string>("");
export const isLoadingAtom = atom<boolean>(false);
export const searchTermAtom = atom<string>(""); // Global search state shared by components
export const historyAtom = atom<string[]>([]);
export const futureAtom = atom<string[]>([]);

// --- Computed: Derived State ---

/**
 * Single Source of Truth for the Object Model.
 * Automatically re-parsed whenever contentAtom changes.
 */
export const sectionsAtom = computed(contentAtom, (content) => {
  if (!content.trim()) return [];
  try {
    return SubconverterIniParser.parse(content);
  } catch (e) {
    console.error("INI Parse Error:", e);
    // Return empty or fallback?
    // In a real app we might want to expose a 'parseErrorAtom'
    return [];
  }
});

/** Flattened list of all proxy groups for easy access */
export const allProxyGroupsAtom = computed(sectionsAtom, (sections) => {
  return sections.flatMap((s) => s.proxyGroups);
});

/** Statistics */
export const groupStatsAtom = computed(allProxyGroupsAtom, (groups) => {
  const total = groups.length;
  const byType = groups.reduce(
    (acc, g) => {
      acc[g.type] = (acc[g.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  return { total, byType };
});

/** Flattened list of all rulesets for easy access */
export const allRulesetsAtom = computed(sectionsAtom, (sections) => {
  return sections.flatMap((s) => s.rulesets);
});

/** Ruleset Statistics */
export const rulesetStatsAtom = computed(allRulesetsAtom, (rulesets) => {
  const total = rulesets.length;
  const byType = rulesets.reduce(
    (acc, r) => {
      acc[r.type] = (acc[r.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  // Also count by target group
  const byGroup = rulesets.reduce(
    (acc, r) => {
      acc[r.name] = (acc[r.name] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  return { total, byType, byGroup };
});

// --- Actions ---

// Helper to mutate model and sync back to text
// This ensures atomicity: Model Change -> Text Update -> Compute New Model
function mutateModel(mutationFn: (sections: IniSection[]) => void, statusMsg: string) {
  // 0. Push to History
  pushHistory();

  // 1. Get current model (snapshot)
  // We use structuredClone to ensure we don't mutate the computed readonly object directly
  // although since we are replacing it immediately, shallow copy might suffice, but safety first.
  let sections: IniSection[];
  try {
    const original = sectionsAtom.get();
    // structuredClone is safe for POJOs
    sections = structuredClone(original);
  } catch (e) {
    console.error("Clone error", e);
    return;
  }

  // 2. Apply mutation
  triggerMutation(sections, mutationFn);

  // 3. Sync to Source of Truth
  const newContent = SubconverterIniParser.stringify(sections);
  contentAtom.set(newContent);

  // 4. Update status
  isDirtyAtom.set(true);
  statusAtom.set(statusMsg);

  // 5. Update draft storage
  const currentFile = currentFileAtom.get();
  if (currentFile) {
    localStorage.setItem(STORAGE_KEY_DRAFT_PREFIX + currentFile, newContent);
  }
}

function triggerMutation(sections: IniSection[], fn: (s: IniSection[]) => void) {
  fn(sections);
}

// Helper: Cyclic Dependency Check
// Returns the name of the group that causes loop, or null
function detectCycle(
  subjectName: string,
  newProxies: string[],
  allGroups: ProxyGroup[]
): string | null {
  const groupMap = new Map(allGroups.map((g) => [g.name, g]));
  const visited = new Set<string>();
  const stack = [...newProxies];

  while (stack.length > 0) {
    const currentMember = stack.pop()!;
    if (!currentMember.startsWith("[]")) continue;

    const targetName = currentMember.slice(2);
    if (targetName === subjectName) return targetName; // Found cycle back to subject

    if (visited.has(targetName)) continue;
    visited.add(targetName);

    const targetGroup = groupMap.get(targetName);
    if (targetGroup) {
      stack.push(...targetGroup.proxies);
    }
  }
  return null;
}

// Helper: History
function pushHistory() {
  const current = contentAtom.get();
  const history = historyAtom.get();
  // Limit history to 50 steps
  historyAtom.set([...history.slice(-49), current]);
  futureAtom.set([]);
}

export const actions = {
  // --- Undo / Redo ---
  undo() {
    const history = historyAtom.get();
    if (history.length === 0) return;

    const previous = history[history.length - 1];
    const newHistory = history.slice(0, -1);

    // Push current to future
    const current = contentAtom.get();
    futureAtom.set([current, ...futureAtom.get()]);

    historyAtom.set(newHistory);
    contentAtom.set(previous);
    toast.success("Undo");
  },

  redo() {
    const future = futureAtom.get();
    if (future.length === 0) return;

    const next = future[0];
    const newFuture = future.slice(1);

    // Push current to history
    const current = contentAtom.get();
    historyAtom.set([...historyAtom.get(), current]);

    futureAtom.set(newFuture);
    contentAtom.set(next);
    toast.success("Redo");
  },

  // --- File Operations ---

  async fetchFiles() {
    try {
      const res = await fetch("/api/files");
      if (res.ok) {
        const files = await res.json();
        filesAtom.set(files);

        // Auto-load last file
        const savedFile = localStorage.getItem(STORAGE_KEY_FILE);
        if (savedFile && files.includes(savedFile)) {
          actions.loadFile(savedFile);
        } else if (files.length > 0) {
          actions.loadFile(files[0]);
        }
      }
    } catch (e) {
      console.error(e);
      statusAtom.set("连接后端失败");
    }
  },

  async loadFile(fileName: string) {
    isLoadingAtom.set(true);
    statusAtom.set(`加载中...`);

    try {
      const res = await fetch(`/api/files/${fileName}`);
      if (res.ok) {
        const serverText = await res.text();

        // Draft Check
        const draftKey = STORAGE_KEY_DRAFT_PREFIX + fileName;
        const savedDraft = localStorage.getItem(draftKey);

        let finalText = serverText;
        let dirty = false;

        if (savedDraft && savedDraft !== serverText) {
          if (
            confirm(
              `文件 "${fileName}" 有未保存的修改。\n\n点击"确定"恢复修改，点击"取消"放弃修改。`
            )
          ) {
            finalText = savedDraft;
            dirty = true;
          } else {
            localStorage.removeItem(draftKey);
          }
        }

        // Batch updates? Nanostores updates are synchronous but performant
        currentFileAtom.set(fileName);
        contentAtom.set(finalText);
        isDirtyAtom.set(dirty);
        statusAtom.set(dirty ? `已恢复草稿` : `已加载`);

        localStorage.setItem(STORAGE_KEY_FILE, fileName);
      }
    } catch (e) {
      statusAtom.set(`加载失败`);
    } finally {
      isLoadingAtom.set(false);
    }
  },

  async saveFile() {
    const fileName = currentFileAtom.get();
    const content = contentAtom.get();
    if (!fileName) return;

    statusAtom.set(`Saving...`);
    try {
      const res = await fetch(`/api/files/${fileName}`, {
        method: "POST",
        body: content,
      });
      if (res.ok) {
        statusAtom.set(`已保存`);
        isDirtyAtom.set(false);
        localStorage.removeItem(STORAGE_KEY_DRAFT_PREFIX + fileName);
        toast.success(`已保存 ${fileName}`);
      } else {
        throw new Error("Save failed");
      }
    } catch (e) {
      statusAtom.set("Error saving file");
      toast.error("Error saving file");
    }
  },

  /** Direct text update (e.g. from Code Editor) */
  updateContent(text: string) {
    // Only update if changed to avoid loops if needed, though atomic check is cheap
    if (contentAtom.get() !== text) {
      contentAtom.set(text);
      isDirtyAtom.set(true);
      statusAtom.set("已修改 (未保存)");

      const currentFile = currentFileAtom.get();
      if (currentFile) {
        localStorage.setItem(STORAGE_KEY_DRAFT_PREFIX + currentFile, text);
      }
    }
  },

  setSearchTerm(term: string) {
    searchTermAtom.set(term);
  },

  // --- Logic Mutations ---

  updateGroup(group: ProxyGroup, originalName?: string) {
    // If originalName is NOT provided, assume name hasn't changed or it's same
    const targetName = originalName || group.name;

    // Name Collision Check
    const allGroups = allProxyGroupsAtom.get();
    if (
      group.name !== targetName && // Changing name
      allGroups.some((g) => g.name === group.name)
    ) {
      toast.error(`组名 "${group.name}" 已存在，请使用其他名称`);
      return;
    }

    // Cyclic Dependency Check
    const cycle = detectCycle(group.name, group.proxies, allGroups);
    if (cycle) {
      toast.error(`监测到循环引用: ${group.name} -> ... -> ${cycle} -> ${group.name}`);
      return;
    }

    mutateModel((sections) => {
      for (const section of sections) {
        const idx = section.proxyGroups.findIndex((g) => g.name === targetName);
        if (idx !== -1) {
          section.proxyGroups[idx] = group;
          break;
        }
      }
    }, "已修改 (更新组)");

    toast.success(`已更新组: ${group.name}`);
  },

  deleteGroup(groupName: string) {
    if (!confirm(`确定要删除代理组 "${groupName}" 吗？`)) return;

    mutateModel((sections) => {
      for (const section of sections) {
        const idx = section.proxyGroups.findIndex((g) => g.name === groupName);
        if (idx !== -1) {
          section.proxyGroups.splice(idx, 1);
          break;
        }
      }
    }, "已修改 (删除组)");

    toast.success(`已删除组: ${groupName}`);
  },

  duplicateGroup(group: ProxyGroup) {
    const allGroups = allProxyGroupsAtom.get();
    let newName = `${group.name} (副本)`;
    let counter = 1;
    while (allGroups.some((g) => g.name === newName)) {
      newName = `${group.name} (副本) ${counter++}`;
    }

    mutateModel((sections) => {
      const newGroup: ProxyGroup = { ...group, name: newName };
      for (const section of sections) {
        const idx = section.proxyGroups.findIndex((g) => g.name === group.name);
        if (idx !== -1) {
          section.proxyGroups.splice(idx + 1, 0, newGroup);
          break;
        }
      }
    }, "已修改 (复制组)");

    toast.success(`已复制组: ${newName}`);
  },

  createGroup(newGroup: ProxyGroup) {
    const allGroups = allProxyGroupsAtom.get();
    if (allGroups.some((g) => g.name === newGroup.name)) {
      toast.error(`组名 "${newGroup.name}" 已存在`);
      return;
    }

    // Cyclic Dependency Check
    // Even a new group could complete a cycle if an existing group points to this (future) name
    // But since it's new, we only check if *it* points to something that points to *it*.
    // However, since it didn't exist, nothing *should* point to it effectively unless there's a dead link.
    // If a dead link existed: "[]NewGroup" in GroupB.
    // Now we create "NewGroup" which has "[]GroupB".
    // Cycle A: NewGroup -> GroupB -> NewGroup.
    // So yes, worth checking.
    const cycle = detectCycle(newGroup.name, newGroup.proxies, allGroups);
    if (cycle) {
      toast.error(`监测到循环引用: ${newGroup.name} -> ... -> ${cycle} -> ${newGroup.name}`);
      return;
    }

    mutateModel((sections) => {
      // Logic from ancient times: find [custom] or first non-empty or first
      const targetSection =
        sections.find((s) => s.name.toLowerCase() === "custom") ||
        sections.find((s) => s.proxyGroups.length > 0) ||
        sections[0];

      if (targetSection) {
        targetSection.proxyGroups.push(newGroup);
        toast.success(`已创建组: ${newGroup.name}`);
      }
    }, "已修改 (新建组)");
  },

  addToAll(groupToAdd: ProxyGroup) {
    let count = 0;
    mutateModel((sections) => {
      const memberRef = "[]" + groupToAdd.name;
      for (const section of sections) {
        for (const group of section.proxyGroups) {
          if (group.name !== groupToAdd.name && !group.proxies.includes(memberRef)) {
            group.proxies.push(memberRef);
            count++;
          }
        }
      }
    }, "已修改 (添加到所有)");

    if (count > 0) toast.success(`已将 ${groupToAdd.name} 添加到 ${count} 个组`);
  },

  removeFromAll(groupToRemove: ProxyGroup) {
    let count = 0;
    mutateModel((sections) => {
      const memberRef = "[]" + groupToRemove.name;
      for (const section of sections) {
        for (const group of section.proxyGroups) {
          const idx = group.proxies.indexOf(memberRef);
          if (idx !== -1) {
            group.proxies.splice(idx, 1);
            count++;
          }
        }
      }
    }, "已修改 (从所有移除)");

    if (count > 0) toast.success(`已从 ${count} 个组中移除 ${groupToRemove.name}`);
  },

  /** Reorder groups within a section */
  reorderGroup(sectionName: string, oldIndex: number, newIndex: number) {
    mutateModel((sections) => {
      const section = sections.find((s) => s.name === sectionName);
      if (section && section.proxyGroups[oldIndex]) {
        const item = section.proxyGroups.splice(oldIndex, 1)[0];
        section.proxyGroups.splice(newIndex, 0, item);
      }
    }, "已修改 (调整顺序)");
  },

  // --- Ruleset Actions ---

  /** Create a new ruleset */
  createRuleset(ruleset: Ruleset, sectionName?: string) {
    mutateModel((sections) => {
      // Find target section (default to first section with rulesets, or "custom")
      const targetSection =
        sections.find((s) => s.name === sectionName) ||
        sections.find((s) => s.rulesets.length > 0) ||
        sections.find((s) => s.name.toLowerCase() === "custom") ||
        sections[0];

      if (targetSection) {
        targetSection.rulesets.push(ruleset);
        toast.success(`已创建规则: ${ruleset.name}`);
      }
    }, "已修改 (新建规则)");
  },

  /** Update an existing ruleset */
  updateRuleset(originalSource: string, updated: Ruleset, sectionName?: string) {
    mutateModel((sections) => {
      for (const section of sections) {
        if (sectionName && section.name !== sectionName) continue;
        const idx = section.rulesets.findIndex((r) => r.source === originalSource);
        if (idx !== -1) {
          section.rulesets[idx] = updated;
          break;
        }
      }
    }, "已修改 (更新规则)");

    toast.success(`已更新规则`);
  },

  /** Delete a ruleset */
  deleteRuleset(source: string, sectionName?: string) {
    mutateModel((sections) => {
      for (const section of sections) {
        if (sectionName && section.name !== sectionName) continue;
        const idx = section.rulesets.findIndex((r) => r.source === source);
        if (idx !== -1) {
          section.rulesets.splice(idx, 1);
          break;
        }
      }
    }, "已修改 (删除规则)");

    toast.success(`已删除规则`);
  },

  /** Reorder rulesets within a section */
  reorderRuleset(sectionName: string, oldIndex: number, newIndex: number) {
    mutateModel((sections) => {
      const section = sections.find((s) => s.name === sectionName);
      if (section && section.rulesets[oldIndex]) {
        const item = section.rulesets.splice(oldIndex, 1)[0];
        section.rulesets.splice(newIndex, 0, item);
      }
    }, "已修改 (规则排序)");
  },
};
