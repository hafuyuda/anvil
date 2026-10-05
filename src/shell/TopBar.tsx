import { ipc } from "../core/ipc";
import { useProjectStore } from "../stores/projectStore";
import { useOpenProject } from "../core/useOpenProject";

export function TopBar() {
  const projectPath = useProjectStore((s) => s.projectPath);
  const setProject = useProjectStore((s) => s.setProject);
  const closeProject = useProjectStore((s) => s.closeProject);
  const pendingSaves = useProjectStore((s) => s.pendingSaves);
  const undoStack = useProjectStore((s) => s.undoStack);
  const redoStack = useProjectStore((s) => s.redoStack);
  const undo = useProjectStore((s) => s.undo);
  const redo = useProjectStore((s) => s.redo);
  const openProject = useOpenProject();

  async function handleClose() {
    try {
      await ipc.closeProject();
    } catch {
      // 忽略
    }
    closeProject();
  }

  async function handleRefresh() {
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
    } catch (e) {
      alert("刷新失败: " + e);
    }
  }

  const statusText = !projectPath
    ? ""
    : pendingSaves > 0
      ? "保存中…"
      : "已保存";

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
        <>
          <button onClick={handleRefresh} style={{ fontSize: 12 }}>
            刷新
          </button>
          <button
            onClick={() => void undo()}
            disabled={undoStack.length === 0}
            style={{ fontSize: 12 }}
            title="撤销 Ctrl+Z"
          >
            ↶ 撤销
          </button>
          <button
            onClick={() => void redo()}
            disabled={redoStack.length === 0}
            style={{ fontSize: 12 }}
            title="重做 Ctrl+Shift+Z"
          >
            ↷ 重做
          </button>
          <span
            style={{
              fontSize: 11,
              color: pendingSaves > 0 ? "#c80" : "#888",
            }}
          >
            {statusText}
          </span>
        </>
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
        <button onClick={handleClose} style={{ fontSize: 12 }}>
          关闭项目
        </button>
      )}
    </div>
  );
}