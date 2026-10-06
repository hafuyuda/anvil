import type { Card, Relation, RelationKind } from "../../../core/ipc";
import { parseEffects } from "../effects";

interface Props {
  outgoing: Relation[];
  edgeStates: Record<string, { ok: boolean; error?: string }>;
  cards: Card[];
  relationKinds: RelationKind[];
  onAdvance: (relationId: string, toId: string) => void;
}

export function BranchList({
  outgoing,
  edgeStates,
  cards,
  relationKinds,
  onAdvance,
}: Props) {
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          color: "var(--fg-muted)",
          textTransform: "uppercase",
          letterSpacing: 1,
          marginBottom: 6,
        }}
      >
        可走的分支（{outgoing.length}）
      </div>

      {outgoing.length === 0 && (
        <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>没有出边</div>
      )}

      {outgoing.map((r) => {
        const state = edgeStates[r.id];
        const kind = relationKinds.find((k) => k.id === r.kind);
        const reachable = state?.ok ?? false;
        const err = state?.error;
        const target = cards.find((c) => c.id === r.to);
        const label = r.label || kind?.name || "继续";

        const effects = parseEffects(r.meta?.effects);
        const effectsText = effects.map((e) => e.raw).join(" · ");

        return (
          <div
            key={r.id}
            onClick={() => reachable && onAdvance(r.id, r.to)}
            style={{
              padding: "10px 12px",
              marginBottom: 6,
              borderRadius: "var(--radius-md)",
              background: reachable ? "var(--bg-surface)" : "var(--bg-panel)",
              border: reachable
                ? "1px solid var(--border-default)"
                : "1px solid var(--border-subtle)",
              opacity: reachable ? 1 : 0.5,
              cursor: reachable ? "pointer" : "not-allowed",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  color: reachable
                    ? "var(--fg-primary)"
                    : "var(--fg-secondary)",
                  fontWeight: 600,
                  flex: 1,
                }}
              >
                {label}
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: "var(--fg-secondary)",
                }}
              >
                {target?.name ?? r.to.slice(0, 8)}
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: reachable ? "var(--success)" : "var(--danger)",
                  minWidth: 48,
                  textAlign: "right",
                }}
              >
                {err ? "错误" : reachable ? "可达" : "不可达"}
              </span>
            </div>

            {effectsText && (
              <div
                style={{
                  marginTop: 4,
                  fontSize: 11,
                  color: "var(--fg-muted)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                效果：{effectsText}
              </div>
            )}
          </div>
        );
      })}

      {outgoing.some((r) => edgeStates[r.id]?.error) && (
        <div
          style={{
            marginTop: 8,
            fontSize: 11,
            color: "var(--danger)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {outgoing
            .filter((r) => edgeStates[r.id]?.error)
            .map((r) => (
              <div key={r.id}>
                {r.label ?? r.id.slice(0, 8)}: {edgeStates[r.id].error}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
