import type { ScriptKnot } from "../types";
import { PanelHeader } from "./primitives";

export interface ScriptVar {
  key: string;
  literal: string;
}

interface Props {
  entryKnot: string | null;
  allKnotNames: string[];
  allVars: ScriptVar[];
  /** 光标所在的 knot；null 表示不在任何 knot 里 */
  currentKnot: ScriptKnot | null;
  onEntryKnot: (v: string) => void;
}

/** 右栏检查器：入口 knot、变量表、当前 knot 摘要。 */
export function ScriptInspectorPanel({
  entryKnot,
  allKnotNames,
  allVars,
  currentKnot,
  onEntryKnot,
}: Props) {
  return (
    <div
      style={{
        width: 280,
        flexShrink: 0,
        borderLeft: "1px solid var(--border-subtle)",
        background: "var(--bg-panel)",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        padding: 12,
      }}
    >
      <section>
        <PanelHeader>剧情设置</PanelHeader>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <span style={{ fontSize: 11, color: "var(--fg-secondary)" }}>
            入口 knot
          </span>
          <select
            className="select"
            value={entryKnot ?? ""}
            onChange={(e) => onEntryKnot(e.target.value)}
            style={{ fontSize: 12 }}
          >
            <option value="">默认（第一个 knot）</option>
            {allKnotNames.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
            {entryKnot &&
            entryKnot !== "END" &&
            !allKnotNames.includes(entryKnot) ? (
              <option value={entryKnot}>{entryKnot}（未找到）</option>
            ) : null}
          </select>
        </div>
      </section>

      <section>
        <PanelHeader>
          变量（只读）
          <span style={{ color: "var(--fg-muted)", marginLeft: 4 }}>
            {allVars.length}
          </span>
        </PanelHeader>
        {allVars.length === 0 ? (
          <div style={{ fontSize: 11, color: "var(--fg-muted)" }}>
            剧本中还没有 VAR 行
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--fg-secondary)",
            }}
          >
            {allVars.map((v) => (
              <div key={v.key} style={{ padding: "2px 0" }}>
                <span style={{ color: "var(--fg-muted)" }}>VAR </span>
                {v.key} = {v.literal}
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <PanelHeader>当前 knot</PanelHeader>
        {currentKnot ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
              fontSize: 12,
            }}
          >
            <span
              style={{
                fontWeight: 600,
                color: "var(--fg-primary)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {currentKnot.name}
            </span>
            {currentKnot.scene && (
              <span style={{ color: "var(--fg-secondary)", fontSize: 11 }}>
                <span style={{ color: "var(--fg-muted)" }}>@scene </span>
                {currentKnot.scene}
              </span>
            )}
            {currentKnot.actors.map((a) => (
              <span
                key={a}
                style={{ color: "var(--fg-secondary)", fontSize: 11 }}
              >
                <span style={{ color: "var(--fg-muted)" }}>@actor </span>
                {a}
              </span>
            ))}
            {!currentKnot.scene && currentKnot.actors.length === 0 && (
              <span style={{ color: "var(--fg-muted)", fontSize: 11 }}>
                无 @scene / @actor
              </span>
            )}
          </div>
        ) : (
          <div style={{ fontSize: 11, color: "var(--fg-muted)" }}>—</div>
        )}
      </section>
    </div>
  );
}
