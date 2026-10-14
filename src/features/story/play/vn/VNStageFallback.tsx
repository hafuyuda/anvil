import type { Card, Scenario } from "../../../../core/ipc";
import { VNStageChoice } from "./VNStageChoice";

export function VNStageFallback({
  card,
  scenario,
  jumps,
  onChoose,
}: {
  card: Card | null;
  scenario: Scenario;
  jumps: { target: string }[];
  onChoose: (target: string) => void;
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

      <VNStageChoice jumps={jumps} onChoose={onChoose} />
    </div>
  );
}
