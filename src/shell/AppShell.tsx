import { useEffect, useRef } from "react";
import { TopBar } from "./TopBar";
import { LeftNav } from "./LeftNav";
import { Workspace } from "./Workspace";
import { Inspector } from "./Inspector";
import { StatusBar } from "./StatusBar";
import { useProjectStore } from "../stores/projectStore";
import { useUIStore } from "../stores/uiStore";
import { useKeyboard } from "../hooks/useKeyboard";
import { useCommands } from "../hooks/useCommands";
import { useGlobalCommands } from "../features/commands/useGlobalCommands";
import { CommandPalette } from "../components/CommandPalette";
import { ipc } from "../core/ipc";
import { MergePackDialog } from "../features/project/MergePackDialog";
import { tryAutoOpenLastProject } from "../core/openProjectAt";

export function AppShell() {
  const projectPath = useProjectStore((s) => s.projectPath);

  const paletteOpen = useUIStore((s) => s.paletteOpen);
  const closePalette = useUIStore((s) => s.closePalette);
  const togglePalette = useUIStore((s) => s.togglePalette);

  const commands = useCommands();
  useGlobalCommands();
  useKeyboard();

  const mergePackOpen = useUIStore((s) => s.mergePackOpen);
  const closeMergePack = useUIStore((s) => s.closeMergePack);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        togglePalette();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePalette]);

  useEffect(() => {
    let timer: number | null = null;
    async function onFocus() {
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(async () => {
        if (!projectPath) return;
        // ★ 有未保存修改时跳过，避免旧磁盘数据覆盖内存
        if ((useProjectStore.getState().pendingSaves ?? 0) > 0) return;
        try {
          const snap = await ipc.reloadProject();
          useProjectStore.getState().refreshProject({
            cards: snap.cards,
            cardTypes: snap.card_types,
            relationKinds: snap.relation_kinds,
            relations: snap.relations,
            scenarios: snap.scenarios,
            boards: snap.boards,
            sessions: snap.sessions,
            cardGroups: snap.card_groups,
          });
        } catch {
          // 忽略
        }
      }, 500);
    }
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [projectPath]);

  const autoOpenTriedRef = useRef(false);

  useEffect(() => {
    if (autoOpenTriedRef.current) return;
    autoOpenTriedRef.current = true;
    void tryAutoOpenLastProject();
  }, []);

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-app)",
        color: "var(--fg-primary)",
        fontFamily: "var(--font-body)",
      }}
    >
      <TopBar />
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <LeftNav />
        <Workspace />
        <Inspector />
      </div>
      <StatusBar />

      {paletteOpen && (
        <CommandPalette commands={commands} onClose={closePalette} />
      )}

      {mergePackOpen && <MergePackDialog onClose={closeMergePack} />}
    </div>
  );
}
