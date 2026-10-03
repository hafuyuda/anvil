import { useEffect } from "react";
import { TopBar } from "./TopBar";
import { LeftNav } from "./LeftNav";
import { Workspace } from "./Workspace";
import { Inspector } from "./Inspector";
import { StatusBar } from "./StatusBar";
import { useProjectStore } from "../stores/projectStore";
import { ipc } from "../core/ipc";

export function AppShell() {
  const projectPath = useProjectStore((s) => s.projectPath);
  const setProject = useProjectStore((s) => s.setProject);

  useEffect(() => {
    async function onFocus() {
      if (!projectPath) return;
      try {
        const snap = await ipc.reloadProject();
        setProject(
          projectPath,
          snap.cards,
          snap.card_types,
          snap.relation_kinds,
        );
      } catch {
        // 项目可能被移动或删除，忽略
      }
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
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
