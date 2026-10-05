import { ipc } from "../core/ipc";
import { useProjectStore } from "../stores/projectStore";
import { useOpenProject } from "../core/useOpenProject";

export function TopBar() {
  const projectPath = useProjectStore((s) => s.projectPath);
  const setProject = useProjectStore((s) => s.setProject);
  const closeProject = useProjectStore((s) => s.closeProject);
  const pendingSaves = useProjectStore((s) => s.pendingSaves);
  const undoStack = useProjectStore((s) => s.undoStack) ?? [];
  const redoStack = useProjectStore((s) => s.redoStack) ?? [];
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
        height: "var(--topbar-h)",
        display: "flex",
        alignItems: "center",
        padding: "0 12px",
        borderBottom: "1px solid var(--border-subtle)",
        background: "var(--bg-panel)",
        gap: 8,
        fontSize: 13,
        flexShrink: 0,
      }}
    >
      <strong
        style={{
          color: "var(--accent-gold)",
          fontFamily: "var(--font-title)",
          fontSize: 15,
          letterSpacing: 1,
        }}
      >
        Anvil
      </strong>
      <span style={{ color: "var(--border-default)" }}>·</span>
      <span style={{ color: "var(--fg-secondary)" }}>
        {projectPath ? projectPath.split(/[\\/]/).pop() : "未打开项目"}
      </span>

      <button className="btn" onClick={openProject}>
        {projectPath ? "切换" : "打开"}
      </button>

      {projectPath && (
        <>
          <button className="btn" onClick={handleRefresh}>
            刷新
          </button>
          <button
            className="btn"
            onClick={() => void undo()}
            disabled={undoStack.length === 0}
            title="撤销 Ctrl+Z"
          >
            ↶
          </button>
          <button
            className="btn"
            onClick={() => void redo()}
            disabled={redoStack.length === 0}
            title="重做 Ctrl+Shift+Z"
          >
            ↷
          </button>
          <span
            style={{
              fontSize: 11,
              color:
                pendingSaves > 0
                  ? "var(--accent-flame)"
                  : "var(--fg-muted)",
            }}
          >
            {statusText}
          </span>
        </>
      )}

      <div style={{ flex: 1 }} />

      <input
        className="input"
        placeholder="搜索（Ctrl+K）"
        disabled
        style={{ width: 240, fontSize: 12 }}
      />
      <button className="btn" disabled>
        设置
      </button>
      {projectPath && (
        <button className="btn btn-danger" onClick={handleClose}>
          关闭项目
        </button>
      )}
    </div>
  );
}