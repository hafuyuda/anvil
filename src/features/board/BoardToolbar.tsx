import type { GridConfig } from "../../core/ipc";

interface Props {
  name: string;
  setName: (v: string) => void;
  onCommitName: () => void;

  grid: GridConfig;
  onToggleGrid: (v: boolean) => void;
  onToggleSnap: (v: boolean) => void;
  onGridSizeChange: (size: number) => void;

  width: number;
  height: number;
  onWidthChange: (w: number) => void;
  onHeightChange: (h: number) => void;

  hasBackground: boolean;
  onOpenBgPicker: () => void;
  onClearBackground: () => void;

  onOpenAddFromGroup: () => void;
  onOpenAddPile: () => void;
  onOpenCardPicker: () => void;
  onAddPlaceholder: () => void;

  zoom: number;
  onZoomChange: (z: number) => void;
}

export function BoardToolbar({
  name,
  setName,
  onCommitName,
  grid,
  onToggleGrid,
  onToggleSnap,
  onGridSizeChange,
  width,
  height,
  onWidthChange,
  onHeightChange,
  hasBackground,
  onOpenBgPicker,
  onClearBackground,
  onOpenAddFromGroup,
  onOpenAddPile,
  onOpenCardPicker,
  onAddPlaceholder,
  zoom,
  onZoomChange,
}: Props) {
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        alignItems: "center",
        flexShrink: 0,
        flexWrap: "wrap",
      }}
    >
      <input
        className="input"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={onCommitName}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        style={{
          flex: 1,
          minWidth: 160,
          fontWeight: 600,
          fontSize: 14,
          fontFamily: "var(--font-title)",
        }}
      />

      <Toggle label="显示网格" checked={grid.visible} onChange={onToggleGrid} />
      <Toggle label="吸附" checked={grid.snap} onChange={onToggleSnap} />

      <label
        style={{
          fontSize: 12,
          display: "flex",
          gap: 6,
          alignItems: "center",
          color: "var(--fg-secondary)",
        }}
      >
        格大小
        <input
          className="input"
          type="number"
          value={grid.size}
          onChange={(e) => onGridSizeChange(Number(e.target.value) || 10)}
          style={{ width: 64 }}
        />
      </label>

      <label
        style={{
          fontSize: 12,
          display: "flex",
          gap: 6,
          alignItems: "center",
          color: "var(--fg-secondary)",
        }}
      >
        宽
        <input
          className="input"
          type="number"
          value={width}
          onChange={(e) => onWidthChange(Number(e.target.value) || 1200)}
          style={{ width: 72 }}
        />
      </label>

      <label
        style={{
          fontSize: 12,
          display: "flex",
          gap: 6,
          alignItems: "center",
          color: "var(--fg-secondary)",
        }}
      >
        高
        <input
          className="input"
          type="number"
          value={height}
          onChange={(e) => onHeightChange(Number(e.target.value) || 800)}
          style={{ width: 72 }}
        />
      </label>

      <button className="btn" onClick={onOpenBgPicker} style={{ fontSize: 12 }}>
        {hasBackground ? "更换背景" : "设置背景"}
      </button>
      <button
        className="btn"
        onClick={onOpenAddFromGroup}
        style={{ fontSize: 12 }}
      >
        从卡组导入
      </button>
      <button className="btn" onClick={onOpenAddPile} style={{ fontSize: 12 }}>
        从卡组加卡盒
      </button>
      <button
        className="btn btn-primary"
        onClick={onOpenCardPicker}
        style={{ fontSize: 12 }}
      >
        + 添加卡片
      </button>
      <button
        className="btn"
        onClick={onAddPlaceholder}
        style={{ fontSize: 12 }}
        title="在棋盘上添加一个空白占位"
      >
        + 占位
      </button>
      {hasBackground && (
        <button
          className="btn"
          onClick={onClearBackground}
          style={{ fontSize: 12 }}
        >
          清除背景
        </button>
      )}

      <div
        style={{
          display: "flex",
          gap: 2,
          alignItems: "center",
          marginLeft: "auto",
        }}
      >
        <button
          className="btn btn-icon"
          onClick={() => onZoomChange(Math.max(0.25, zoom / 1.2))}
          title="缩小"
        >
          −
        </button>
        <span
          style={{
            minWidth: 48,
            textAlign: "center",
            fontSize: 12,
            fontFamily: "var(--font-mono)",
            color: "var(--fg-secondary)",
          }}
        >
          {Math.round(zoom * 100)}%
        </span>
        <button
          className="btn btn-icon"
          onClick={() => onZoomChange(Math.min(4, zoom * 1.2))}
          title="放大"
        >
          +
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => onZoomChange(1)}
          style={{ fontSize: 11, padding: "2px 6px" }}
          title="重置为 100%"
        >
          100%
        </button>
      </div>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      style={{
        fontSize: 12,
        display: "flex",
        gap: 4,
        alignItems: "center",
        color: "var(--fg-secondary)",
        cursor: "pointer",
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ accentColor: "var(--accent-gold)" }}
      />
      {label}
    </label>
  );
}
