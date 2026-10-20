import type { ChatPayload, OutcomeLevel } from "../../../core/ipc";
import { Avatar, NameLine } from "./ChatBubbles";
import { getRuleSet, outcomeTone, type RuleSetId } from "../ruleset";

const OUTCOME_LABELS: Record<OutcomeLevel, string> = {
  critical: "大成功",
  extreme: "极限成功",
  hard: "困难成功",
  success: "成功",
  failure: "失败",
  fumble: "大失败",
};

function toneColor(tone: string): string {
  switch (tone) {
    case "positive":
      return "var(--chat-roll-good)";
    case "negative":
      return "var(--chat-roll-bad)";
    case "warn":
      return "var(--chat-roll-warn)";
    default:
      return "var(--fg-muted)";
  }
}

export function RollMessage({
  payload,
  authorName,
  color,
  cardId,
}: {
  payload: ChatPayload;
  authorName: string;
  color: string;
  cardId?: string | null;
}) {
  const roll = payload.roll;
  const outcome = roll?.outcome ?? null;
  const ruleSetId = (roll?.rule_set ?? "generic") as RuleSetId;
  const def = getRuleSet(roll?.rule_set);
  const target = roll?.target ?? null;
  const tone = outcome ? outcomeTone(outcome) : "neutral";

  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
      <Avatar name={authorName} color={color} cardId={cardId} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <NameLine name={authorName} color={color} />
        <div
          style={{
            fontSize: 12,
            fontFamily: "var(--font-mono)",
            background: "var(--chat-roll-bg)",
            borderRadius: "var(--radius-md)",
            padding: "6px 8px",
            border: "1px solid var(--chat-roll-border)",
            color: "var(--fg-primary)",
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span>{payload.content}</span>
            {roll && (
              <span
                style={{
                  color:
                    outcome && tone !== "neutral"
                      ? toneColor(tone)
                      : "var(--chat-roll-accent)",
                  fontWeight: 600,
                }}
              >
                = {roll.result}
              </span>
            )}
            {outcome && (
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: 11,
                  padding: "1px 6px",
                  borderRadius: "var(--radius-sm)",
                  color: toneColor(tone),
                  border: `1px solid ${toneColor(tone)}`,
                }}
              >
                {OUTCOME_LABELS[outcome]}
              </span>
            )}
          </div>

          {roll && (
            <div
              style={{
                color: "var(--fg-muted)",
                fontSize: 11,
                marginTop: 2,
              }}
            >
              {roll.expr}
              {roll.detail.length > 0 && ` → [${roll.detail.join(", ")}]`}
              {roll.dropped && roll.dropped.length > 0 &&
                ` 弃 [${roll.dropped.join(", ")}]`}
            </div>
          )}

          {/* 只说明「对什么判定」，绝不推断「命中了吗」 */}
          {target != null && (
            <div style={{ color: "var(--fg-muted)", fontSize: 11 }}>
              {def.targetLabel} {target}
            </div>
          )}
          <div style={{ color: "var(--fg-muted)", fontSize: 10, opacity: 0.7 }}>
            {def.name}
            {ruleSetId === "coc7" && roll?.natural != null && " · 裸骰 "}
            {ruleSetId === "coc7" && roll?.natural != null && roll.natural}
          </div>
        </div>
      </div>
    </div>
  );
}
