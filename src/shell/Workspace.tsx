import { useProjectStore } from "../stores/projectStore";
import { useOpenProject } from "../core/useOpenProject";
import { CardWall } from "../features/cards/CardWall";
import { CardTypeList } from "../features/cards/CardTypeList";

export function Workspace() {
  const projectPath = useProjectStore((s) => s.projectPath);
  const activeModule = useProjectStore((s) => s.activeModule);
  const openProject = useOpenProject();

  if (!projectPath) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          color: "#666",
        }}
      >
        <div style={{ fontSize: 14 }}>未打开项目</div>
        <button onClick={openProject} style={{ padding: "8px 20px", fontSize: 14 }}>
          打开项目
        </button>
        <div style={{ fontSize: 12, color: "#aaa" }}>
          选择一个空文件夹，或已有的 .anvil 项目
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
      {activeModule === "world" && <CardWall />}
      {activeModule === "types" && <CardTypeList />}
    </div>
  );
}