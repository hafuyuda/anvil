import { ipc } from "../core/ipc";
import { useProjectStore } from "../stores/projectStore";
import { useOpenProject } from "../core/useOpenProject";

export function TopBar() {
  const projectPath = useProjectStore((s) => s.projectPath);
  const setProject = useProjectStore((s) => s.setProject);
  const closeProject = useProjectStore((s) => s.closeProject);
  const openProject = useOpenProject();

  async function handleRefresh() {
    if (!projectPath) return;
    try {
      const snap = await ipc.reloadProject();
      setProject(projectPath, snap.cards, snap.card_types);
    } catch (e) {
      alert("刷新失败: " + e);
    }
  }

  return (
    <div
      style={{
        height: 40,
        display: "flex",
        alignItems: "center",
        padding: "0 12px",
        borderBottom: "1px solid #e0e0e0",
        background: "#fafafa",
        gap: 8,
        fontSize: 13,
      }}
    >
      <strong style={{ color: "#333" }}>Anvil</strong>
      <span style={{ color: "#bbb" }}>·</span>
      <span style={{ color: "#666" }}>
        {projectPath ? projectPath.split(/[\\/]/).pop() : "未打开项目"}
      </span>
      <button onClick={openProject} style={{ fontSize: 12 }}>
        {projectPath ? "切换" : "打开"}
      </button>
      {projectPath && (
        <button onClick={handleRefresh} style={{ fontSize: 12 }} title="重新读取项目文件">
          刷新
        </button>
      )}

      <div style={{ flex: 1 }} />

      <input
        placeholder="搜索（Ctrl+K）"
        disabled
        style={{
          width: 240,
          padding: "4px 8px",
          border: "1px solid #ddd",
          borderRadius: 4,
          fontSize: 12,
          background: "#fff",
        }}
      />
      <button disabled style={{ fontSize: 12 }}>
        设置
      </button>
      {projectPath && (
        <button onClick={closeProject} style={{ fontSize: 12 }}>
          关闭项目
        </button>
      )}
    </div>
  );
}