import type { ScriptKnot } from "../types";

/** 跨面板共用的小零件。都是纯展示，没有自己的状态。 */

export function PanelHeader({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: "8px 12px 4px",
        fontSize: 10,
        color: "var(--fg-muted)",
        textTransform: "uppercase",
        letterSpacing: 1,
        flexShrink: 0,
      }}
    >
      {children}
    </div>
  );
}

export function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className="btn btn-ghost"
      onClick={onClick}
      style={{
        fontWeight: active ? 600 : 400,
        color: active ? "var(--fg-primary)" : "var(--fg-secondary)",
        borderBottom: active
          ? "2px solid var(--accent-gold)"
          : "2px solid transparent",
        borderRadius: 0,
        padding: "4px 12px",
      }}
    >
      {children}
    </button>
  );
}

/** 搜索命中里的片段。命中词用 `[[...]]` 标出，逐段渲染。 */
export function SnippetText({ snippet }: { snippet: string }) {
  const parts: React.ReactNode[] = [];
  let rest = snippet;
  let key = 0;
  while (rest.length > 0) {
    const start = rest.indexOf("[[");
    if (start === -1) {
      parts.push(rest);
      break;
    }
    if (start > 0) parts.push(rest.slice(0, start));
    const end = rest.indexOf("]]", start + 2);
    if (end === -1) {
      parts.push(rest.slice(start));
      break;
    }
    parts.push(
      <mark
        key={key++}
        style={{
          background: "var(--accent-gold)",
          color: "var(--bg-app)",
          borderRadius: 2,
          padding: "0 2px",
        }}
      >
        {rest.slice(start + 2, end)}
      </mark>,
    );
    rest = rest.slice(end + 2);
  }
  return <>{parts}</>;
}

export interface OutlineGroup {
  file: string;
  knots: ScriptKnot[];
}
