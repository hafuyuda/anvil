import type { Card, Relation, RelationKind, Scenario } from "../../../core/ipc";
import { VNStageChoice } from "./VNStageChoice";

export function VNStageFallback({
  card,
  scenario,
  outgoing,
  edgeStates,
  cards,
  relationKinds,
  onAdvance,
}: {
  card: Card | null;
  scenario: Scenario;
  outgoing: Relation[];
  edgeStates: Record<string, { ok: boolean; error?: string }>;
  cards: Card[];
  relationKinds: RelationKind[];
  onAdvance: (relationId: string, toId: string) => void;
}) {
  if (!card) return null;

  const description = (card.values?.description as string) ?? "";

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        overflowY: "auto",
        padding: 16,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: "var(--fg-muted)",
          textTransform: "uppercase",
          letterSpacing: 1,
          marginBottom: 6,
        }}
      >
        {scenario.name}
      </div>
      <div
        style={{
          fontSize: 22,
          fontFamily: "var(--font-title)",
          fontWeight: 600,
          color: "var(--accent-gold)",
          marginBottom: 12,
        }}
      >
        {card.name}
      </div>

      {description && (
        <div
          style={{
            fontSize: 13,
            lineHeight: 1.7,
            color: "var(--fg-primary)",
            whiteSpace: "pre-wrap",
            marginBottom: 16,
          }}
        >
          {description}
        </div>
      )}

      <div
        style={{
          fontSize: 11,
          color: "var(--fg-muted)",
          padding: 8,
          background: "var(--bg-surface)",
          border: "1px dashed var(--border-subtle)",
          borderRadius: "var(--radius-md)",
          marginBottom: 12,
          lineHeight: 1.5,
        }}
      >
        该场景还没有剧本。去「剧本」tab 写内容，这里会显示视觉小说演出。
      </div>

      <VNStageChoice
        outgoing={outgoing}
        edgeStates={edgeStates}
        cards={cards}
        relationKinds={relationKinds}
        onAdvance={onAdvance}
      />
    </div>
  );
}
