import { useState } from "react";
import type { Card, Scenario } from "../../../core/ipc";
import { useProjectStore } from "../../../stores/projectStore";
import { ScriptEditor } from "./ScriptEditor";

interface Props {
  scenario: Scenario;
}

export function ScriptPanel({ scenario }: Props) {
  const cards = useProjectStore((s) => s.cards) ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(
    scenario.node_ids[0] ?? null,
  );

  // 从 node_ids 里找出实际的场景卡
  const sceneCards: Card[] = scenario.node_ids
    .map((id) => cards.find((c) => c.id === id))
    .filter((c): c is Card => Boolean(c));

  const selected = selectedId
    ? (cards.find((c) => c.id === selectedId) ?? null)
    : null;

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        background: "var(--bg-app)",
      }}
    >
      {/* 左：场景列表 */}
      <div
        style={{
          width: 200,
          borderRight: "1px solid var(--border-subtle)",
          background: "var(--bg-panel)",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            padding: "8px 10px",
            borderBottom: "1px solid var(--border-subtle)",
            fontSize: 10,
            color: "var(--fg-muted)",
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          场景（{sceneCards.length}）
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 4 }}>
          {sceneCards.length === 0 && (
            <div
              style={{
                padding: 12,
                fontSize: 12,
                color: "var(--fg-muted)",
                textAlign: "center",
              }}
            >
              还没有节点。
              <br />
              去「设置」里勾选。
            </div>
          )}
          {sceneCards.map((c) => {
            const active = c.id === selectedId;
            return (
              <div
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                style={{
                  padding: "6px 10px",
                  cursor: "pointer",
                  borderLeft: active
                    ? "2px solid var(--accent-gold)"
                    : "2px solid transparent",
                  background: active ? "var(--bg-raised)" : "transparent",
                  color: active ? "var(--fg-primary)" : "var(--fg-secondary)",
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  userSelect: "none",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {c.name}
              </div>
            );
          })}
        </div>
      </div>

      {/* 右：编辑器 */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {selected ? (
          <ScriptEditor
            key={selected.id}
            cardId={selected.id}
            cardName={selected.name}
          />
        ) : (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--fg-muted)",
              fontSize: 12,
            }}
          >
            选择一个场景
          </div>
        )}
      </div>
    </div>
  );
}
