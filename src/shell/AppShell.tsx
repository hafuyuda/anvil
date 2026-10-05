import { useEffect } from "react";
import { TopBar } from "./TopBar";
import { LeftNav } from "./LeftNav";
import { Workspace } from "./Workspace";
import { Inspector } from "./Inspector";
import { StatusBar } from "./StatusBar";
import { useProjectStore } from "../stores/projectStore";
import { useKeyboard } from "../hooks/useKeyboard";
import { ipc } from "../core/ipc";

export function AppShell() {
  const projectPath = useProjectStore((s) => s.projectPath);
  const setProject = useProjectStore((s) => s.setProject);

  useKeyboard();

  useEffect(() => {
    let timer: number | null = null;
    async function onFocus() {
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(async () => {
        if (!projectPath) return;
        try {
          const snap = await ipc.reloadProject();
          setProject(
            projectPath,
            snap.cards,
            snap.card_types,
            snap.relation_kinds,
            snap.relations,
            snap.scenarios,
            snap.boards,
            snap.sessions
          );
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
  }, [projectPath, setProject]);

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        fontFamily: "system-ui, sans-serif",
        color: "#222",
      }}
    >
      <TopBar />
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <LeftNav />
        <Workspace />
        <Inspector />
      </div>
      <StatusBar />
    </div>
  );
}