import { useMemo } from "react";
import type { Card } from "../../../core/ipc";
import type { LastRoll } from "./usePlayState";
import { SectionLabel } from "../../../components/SectionLabel";

interface Props {
  card: Card;
  cards: Card[];
  lastRolls: LastRoll[];
}

export function SceneCard({ card, cards, lastRolls }: Props) {
  const sceneTime = (card.values?.time as string) ?? null;
  const sceneMood = (card.values?.mood as string) ?? null;
  const sceneLocationId = (card.values?.location as string) ?? null;
  const sceneLocation = sceneLocationId
    ? (cards.find((c) => c.id === sceneLocationId) ?? null)
    : null;

  const participantIds: string[] = useMemo(() => {
    const raw = card.values?.participants;
    if (Array.isArray(raw)) return raw as string[];
    if (typeof raw === "string" && raw) return [raw];
    return [];
  }, [card]);

  const participants = participantIds
    .map((id) => cards.find((c) => c.id === id))
    .filter(Boolean) as Card[];

  const sceneDescription = (card.values?.description as string) ?? "";
  const sceneDialogue = (card.values?.dialogue as string) ?? "";

  return (
    <div
      style={{
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-md)",
        background: "var(--bg-panel)",
        padding: 16,
        marginBottom: 16,
      }}
    >
      <SectionLabel variant="block" style={{ marginBottom: 6 }}>
        当前场景
      </SectionLabel>
      
      <div
        style={{
          fontSize: 20,
          fontFamily: "var(--font-title)",
          fontWeight: 600,
          color: "var(--accent-gold)",
          marginBottom: 8,
        }}
      >
        {card.name}
      </div>

      {lastRolls.length > 0 && (
        <div
          style={{
            marginBottom: 12,
            padding: "8px 10px",
            background: "var(--bg-surface)",
            border: "1px solid var(--border-accent)",
            borderRadius: "var(--radius-md)",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
          }}
        >
          {lastRolls.map((r, i) => (
            <div key={i} style={{ color: "var(--fg-primary)" }}>
              <span style={{ color: "var(--accent-gold)" }}>🎲</span> {r.raw}{" "}
              {r.detail.length > 0 && (
                <span style={{ color: "var(--fg-muted)" }}>
                  [{r.detail.join(", ")}]
                </span>
              )}{" "}
              → <span style={{ fontWeight: 600 }}>{String(r.resolved)}</span>
            </div>
          ))}
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          fontSize: 12,
          color: "var(--fg-secondary)",
          marginBottom: 10,
        }}
      >
        {sceneLocation && (
          <span>
            <span style={{ color: "var(--fg-muted)" }}>地点</span>{" "}
            {sceneLocation.name}
          </span>
        )}
        {sceneTime && (
          <span>
            <span style={{ color: "var(--fg-muted)" }}>时间</span> {sceneTime}
          </span>
        )}
        {sceneMood && (
          <span>
            <span style={{ color: "var(--fg-muted)" }}>氛围</span> {sceneMood}
          </span>
        )}
      </div>

      {participants.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            marginBottom: 12,
          }}
        >
          {participants.map((p) => (
            <span
              key={p.id}
              style={{
                padding: "2px 8px",
                background: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-sm)",
                fontSize: 11,
                color: "var(--fg-primary)",
              }}
            >
              {p.name}
            </span>
          ))}
        </div>
      )}

      {sceneDescription && (
        <div
          style={{
            fontSize: 13,
            lineHeight: 1.6,
            color: "var(--fg-primary)",
            marginBottom: 12,
            whiteSpace: "pre-wrap",
          }}
        >
          {sceneDescription}
        </div>
      )}

      {sceneDialogue && (
        <details style={{ fontSize: 12 }}>
          <summary
            style={{
              color: "var(--fg-muted)",
              cursor: "pointer",
              marginBottom: 6,
            }}
          >
            对白
          </summary>
          <div
            style={{
              padding: "8px 12px",
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              whiteSpace: "pre-wrap",
              lineHeight: 1.7,
              color: "var(--fg-primary)",
            }}
          >
            {sceneDialogue}
          </div>
        </details>
      )}
    </div>
  );
}
