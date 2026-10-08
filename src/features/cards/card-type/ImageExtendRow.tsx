import type { ImageExtend } from "../../../core/ipc";

interface Props {
  value: ImageExtend | null;
  onChange: (v: ImageExtend | null) => void;
}

const DEFAULT: ImageExtend = { top: 0, bottom: 0, left: 0, right: 0 };

const DIRS: { key: keyof ImageExtend; label: string }[] = [
  { key: "top", label: "上" },
  { key: "bottom", label: "下" },
  { key: "left", label: "左" },
  { key: "right", label: "右" },
];

export function ImageExtendRow({ value, onChange }: Props) {
  const extend = value ?? DEFAULT;

  function setDir(dir: keyof ImageExtend, v: number) {
    const next = { ...extend, [dir]: v };
    const allZero =
      next.top === 0 &&
      next.bottom === 0 &&
      next.left === 0 &&
      next.right === 0;
    onChange(allZero ? null : next);
  }

  function reset() {
    onChange(null);
  }

  const isDefault =
    extend.top === 0 &&
    extend.bottom === 0 &&
    extend.left === 0 &&
    extend.right === 0;

  return (
    <div
      style={{
        padding: 10,
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-md)",
        background: "var(--bg-surface)",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ fontSize: 12, color: "var(--fg-secondary)" }}>
          图像出框
        </span>
        <button
          className="btn btn-ghost"
          onClick={reset}
          disabled={isDefault}
          style={{ fontSize: 11, padding: "1px 8px" }}
        >
          重置
        </button>
      </div>

      <div
        style={{
          fontSize: 11,
          color: "var(--fg-muted)",
          lineHeight: 1.5,
        }}
      >
        图像向四方向扩张，最多撑满内层边界。数值为图像区尺寸的百分比。
      </div>

      {DIRS.map(({ key, label }) => (
        <div
          key={key}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span
            style={{
              width: 20,
              fontSize: 12,
              color: "var(--fg-muted)",
              flexShrink: 0,
            }}
          >
            {label}
          </span>
          <input
            type="range"
            min={0}
            max={2}
            step={0.05}
            value={extend[key]}
            onChange={(e) => setDir(key, Number(e.target.value))}
            style={{
              flex: 1,
              accentColor: "var(--accent-gold)",
            }}
          />
          <span
            style={{
              width: 44,
              textAlign: "right",
              fontSize: 11,
              fontFamily: "var(--font-mono)",
              color: "var(--fg-secondary)",
              flexShrink: 0,
            }}
          >
            {Math.round(extend[key] * 100)}%
          </span>
        </div>
      ))}
    </div>
  );
}
