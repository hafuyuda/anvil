import { PanelHeader, type OutlineGroup } from "./primitives";

interface Props {
  files: string[];
  currentFile: string | null;
  dirtyFiles: Record<string, true>;
  outline: OutlineGroup[];
  /** 去重后的 knot 总数，显示在大纲标题旁 */
  knotCount: number;
  currentKnotName: string | null;
  onSwitch: (file: string) => void;
  onDelete: (file: string) => void;
  onCreate: () => void;
  onOpenKnot: (file: string, knotName: string) => void;
}

/** 左栏：剧本文件树 + knot 大纲。纯展示，所有动作往上传。 */
export function ScriptFileTree({
  files,
  currentFile,
  dirtyFiles,
  outline,
  knotCount,
  currentKnotName,
  onSwitch,
  onDelete,
  onCreate,
  onOpenKnot,
}: Props) {
  return (
    <div
      style={{
        width: 180,
        flexShrink: 0,
        borderRight: "1px solid var(--border-subtle)",
        background: "var(--bg-panel)",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      <PanelHeader>剧本文件</PanelHeader>
      <div
        style={{
          flexShrink: 0,
          maxHeight: "45%",
          overflowY: "auto",
          padding: "4px 0",
        }}
      >
        {files.map((f) => {
          const active = f === currentFile;
          return (
            <div
              key={f}
              style={{
                display: "flex",
                alignItems: "center",
                paddingLeft: 12,
                paddingRight: 6,
              }}
            >
              <button
                onClick={() => onSwitch(f)}
                style={{
                  flex: 1,
                  minWidth: 0,
                  textAlign: "left",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  padding: "4px 0",
                  fontSize: 12,
                  fontFamily: "var(--font-mono)",
                  fontWeight: active ? 600 : 400,
                  color: active ? "var(--accent-gold)" : "var(--fg-secondary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={f}
              >
                {f}
                {f in dirtyFiles ? " *" : ""}
              </button>
              {files.length > 1 && (
                <button
                  onClick={() => onDelete(f)}
                  title={`删除 ${f}`}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "var(--fg-muted)",
                    cursor: "pointer",
                    fontSize: 11,
                    padding: "0 4px",
                    flexShrink: 0,
                  }}
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
        <button
          onClick={onCreate}
          title="新建剧本文件"
          style={{
            display: "block",
            width: "100%",
            textAlign: "left",
            border: "none",
            background: "transparent",
            color: "var(--fg-secondary)",
            cursor: "pointer",
            fontSize: 12,
            padding: "6px 12px",
          }}
        >
          + 新建文件
        </button>
      </div>

      <div
        style={{
          borderTop: "1px solid var(--border-subtle)",
          marginTop: 4,
        }}
      />
      <PanelHeader>
        knot 大纲
        <span style={{ color: "var(--fg-muted)", marginLeft: 4 }}>
          {knotCount}
        </span>
      </PanelHeader>
      <div
        style={{ flex: 1, minHeight: 0, overflowY: "auto", paddingBottom: 8 }}
      >
        {outline.map(({ file, knots }) => (
          <div key={file}>
            {files.length > 1 && (
              <div
                style={{
                  padding: "4px 12px 2px",
                  fontSize: 10,
                  color: "var(--fg-muted)",
                  fontFamily: "var(--font-mono)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={file}
              >
                {file}
              </div>
            )}
            {knots.length === 0 && (
              <div
                style={{
                  padding: "2px 12px",
                  fontSize: 11,
                  color: "var(--fg-muted)",
                }}
              >
                （无 knot）
              </div>
            )}
            {knots.map((k) => {
              const active = k.name === currentKnotName && file === currentFile;
              return (
                <button
                  key={`${file}:${k.name}`}
                  onClick={() => onOpenKnot(file, k.name)}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    border: "none",
                    background: active ? "var(--bg-raised)" : "transparent",
                    cursor: "pointer",
                    padding: "3px 12px",
                    fontSize: 12,
                    color: active
                      ? "var(--accent-gold)"
                      : "var(--fg-secondary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={k.name}
                >
                  {k.name}
                  {k.scene ? (
                    <span style={{ color: "var(--fg-muted)", fontSize: 10 }}>
                      {" "}
                      @{k.scene}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
