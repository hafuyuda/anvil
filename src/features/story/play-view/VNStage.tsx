import { useEffect, useState } from "react";
import type { Card, Relation, RelationKind, Scenario } from "../../../core/ipc";
import type { ScriptLine } from "../script/types";
import { parseEffects } from "../effects";
import { loadImage } from "../../../lib/imageCache";

interface Props {
  scriptLoading: boolean;
  hasScript: boolean;
  currentLine: ScriptLine | null;
  currentBg: string | null;
  atEnd: boolean;
  onAdvanceLine: () => void;

  outgoing: Relation[];
  edgeStates: Record<string, { ok: boolean; error?: string }>;
  cards: Card[];
  relationKinds: RelationKind[];
  onAdvance: (relationId: string, toId: string) => void;

  fallbackCard: Card | null;
  scenario: Scenario;
}

export function VNStage({
  scriptLoading,
  hasScript,
  currentLine,
  currentBg,
  atEnd,
  onAdvanceLine,
  outgoing,
  edgeStates,
  cards,
  relationKinds,
  onAdvance,
  fallbackCard,
  scenario,
}: Props) {
  if (scriptLoading) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg-app)",
          color: "var(--fg-muted)",
          fontSize: 13,
        }}
      >
        加载剧本…
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        position: "relative",
        background: "var(--bg-app)",
        overflow: "hidden",
      }}
    >
      {/* 背景层 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: currentBg
            ? "var(--bg-surface)"
            : "linear-gradient(180deg, #1a1612 0%, #2a231a 100%)",
          zIndex: 0,
        }}
      >
        {currentBg && <BackgroundImage path={currentBg} />}
      </div>

      {/* 内容层 */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {hasScript && currentLine ? (
          <>
            <div
              onClick={atEnd ? undefined : onAdvanceLine}
              style={{
                flex: 1,
                cursor: atEnd ? "default" : "pointer",
              }}
            />

            {atEnd ? (
              <ChoicePanel
                outgoing={outgoing}
                edgeStates={edgeStates}
                cards={cards}
                relationKinds={relationKinds}
                onAdvance={onAdvance}
              />
            ) : (
              <DialogueBox line={currentLine} onAdvance={onAdvanceLine} />
            )}
          </>
        ) : (
          <FallbackScene
            card={fallbackCard}
            scenario={scenario}
            outgoing={outgoing}
            edgeStates={edgeStates}
            cards={cards}
            relationKinds={relationKinds}
            onAdvance={onAdvance}
          />
        )}
      </div>
    </div>
  );
}

// ── 背景图 ──

function BackgroundImage({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadImage(path)
      .then((u) => {
        if (!cancelled) setUrl(u);
      })
      .catch(() => {
        if (!cancelled) setUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  if (!url) return null;

  return (
    <img
      src={url}
      alt=""
      draggable={false}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        display: "block",
        userSelect: "none",
        pointerEvents: "none",
      }}
    />
  );
}

// ── 对话框 ──

function DialogueBox({
  line,
  onAdvance,
}: {
  line: ScriptLine;
  onAdvance: () => void;
}) {
  // 防御：指令行不该出现在这里（预处理已抽掉）
  if (line.type === "bg" || line.type === "bgm" || line.type === "sfx") {
    return null;
  }

  // 到这里 line 收窄为 narration | say | action
  return (
    <div
      onClick={onAdvance}
      style={{
        margin: 16,
        padding: "16px 20px",
        background: "var(--bg-panel)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
        minHeight: 120,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        position: "relative",
      }}
    >
      {line.type === "say" && (
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--accent-gold)",
            marginBottom: 6,
            fontFamily: "var(--font-title)",
          }}
        >
          {line.speaker}
        </div>
      )}

      <div
        style={{
          fontSize: 15,
          lineHeight: 1.8,
          color: "var(--fg-primary)",
          whiteSpace: "pre-wrap",
          fontStyle:
            line.type === "narration" || line.type === "action"
              ? "italic"
              : "normal",
          textAlign: line.type === "narration" ? "center" : "left",
        }}
      >
        {line.text}
      </div>

      <div
        style={{
          position: "absolute",
          right: 16,
          bottom: 8,
          fontSize: 11,
          color: "var(--fg-muted)",
        }}
      >
        点击继续 ▼
      </div>
    </div>
  );
}

// ── 选择面板 ──

function ChoicePanel({
  outgoing,
  edgeStates,
  cards,
  relationKinds,
  onAdvance,
}: {
  outgoing: Relation[];
  edgeStates: Record<string, { ok: boolean; error?: string }>;
  cards: Card[];
  relationKinds: RelationKind[];
  onAdvance: (relationId: string, toId: string) => void;
}) {
  return (
    <div
      style={{
        margin: 16,
        padding: 16,
        background: "var(--bg-panel)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
        maxHeight: "60vh",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: "var(--fg-muted)",
          textTransform: "uppercase",
          letterSpacing: 1,
          marginBottom: 8,
        }}
      >
        选择
      </div>

      {outgoing.length === 0 && (
        <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>
          没有可走的选项
        </div>
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
              padding: "10px 14px",
              marginBottom: 6,
              borderRadius: "var(--radius-md)",
              background: reachable ? "var(--bg-surface)" : "var(--bg-app)",
              border: reachable
                ? "1px solid var(--border-default)"
                : "1px solid var(--border-subtle)",
              opacity: reachable ? 1 : 0.4,
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
                  fontSize: 14,
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
                  color: "var(--fg-muted)",
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
    </div>
  );
}

// ── 无剧本回退 ──

function FallbackScene({
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

      <ChoicePanel
        outgoing={outgoing}
        edgeStates={edgeStates}
        cards={cards}
        relationKinds={relationKinds}
        onAdvance={onAdvance}
      />
    </div>
  );
}
