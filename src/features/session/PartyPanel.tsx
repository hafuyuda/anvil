import type {
  Card,
  CardType,
  Session,
  SessionViewMode,
} from "../../core/ipc";
import { nowMs } from "../../lib/time";
import { useCountUp } from "../../hooks/useCountUp";
import { hpRatio, listNumberStats, readHp, type CardStat } from "./cardStats";

interface Props {
  session: Session;
  cards: Card[];
  cardTypes: CardType[];
  selectedTokenId: string | null;
  onSelectToken: (id: string | null) => void;
  /** 改动 HP 要写回卡牌 —— 数据只存在卡上 */
  onUpdateCard: (card: Card) => void;
  onQuickCheck: (stat: CardStat, card: Card) => void;
  view: SessionViewMode;
  /** 提供则在头部显示折叠按钮，折叠由父级控制 */
  onCollapse?: () => void;
}

interface Row {
  tokenId: string;
  card: Card;
  cardType: CardType | null;
}

export function PartyPanel({
  session,
  cards,
  cardTypes,
  selectedTokenId,
  onSelectToken,
  onUpdateCard,
  onQuickCheck,
  view,
  onCollapse,
}: Props) {
  // 去重：同一张卡可能有多个 token 指向它
  const seen = new Set<string>();
  const entries: Row[] = [];

  for (const t of session.tokens) {
    if (!t.card_id || seen.has(t.card_id)) continue;
    const c = cards.find((x) => x.id === t.card_id);
    if (!c) continue;
    seen.add(t.card_id);
    entries.push({
      tokenId: t.id,
      card: c,
      cardType: cardTypes.find((x) => x.id === c.type_id) ?? null,
    });
  }

  const readOnly = view === "player";

  return (
    <div
      style={{
        width: 240,
        borderLeft: "1px solid var(--border-subtle)",
        background: "var(--bg-panel)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          padding: "8px 8px 8px 12px",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 10,
          color: "var(--fg-muted)",
          textTransform: "uppercase",
          letterSpacing: 1,
          flexShrink: 0,
        }}
      >
        <span>在场角色（{entries.length}）</span>
        {onCollapse && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onCollapse}
            title="折叠队伍面板"
            style={{ padding: "2px 6px", fontSize: 12, lineHeight: 1 }}
          >
            ⟨
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 4 }}>
        {entries.length === 0 && (
          <div
            style={{
              padding: 12,
              fontSize: 12,
              color: "var(--fg-muted)",
              textAlign: "center",
              lineHeight: 1.6,
            }}
          >
            没有角色
            <br />
            从卡片墙加 Token 到棋盘
          </div>
        )}

        {entries.map((e) => (
          <Entry
            key={e.tokenId}
            row={e}
            active={selectedTokenId === e.tokenId}
            readOnly={readOnly}
            onSelect={() => onSelectToken(e.tokenId)}
            onUpdateCard={onUpdateCard}
            onQuickCheck={onQuickCheck}
          />
        ))}
      </div>

      {entries.length > 0 && !readOnly && (
        <div
          style={{
            padding: "6px 10px",
            borderTop: "1px solid var(--border-subtle)",
            fontSize: 10,
            color: "var(--fg-muted)",
            lineHeight: 1.5,
          }}
        >
          HP 读写卡上的 hp / max_hp 字段
          <br />
          点属性名即对该值发起检定
        </div>
      )}
    </div>
  );
}

function Entry({
  row,
  active,
  readOnly,
  onSelect,
  onUpdateCard,
  onQuickCheck,
}: {
  row: Row;
  active: boolean;
  readOnly: boolean;
  onSelect: () => void;
  onUpdateCard: (card: Card) => void;
  onQuickCheck: (stat: CardStat, card: Card) => void;
}) {
  const { card, cardType } = row;
  const hp = readHp(card);
  const ratio = hpRatio(hp.hp, hp.max);
  const stats = listNumberStats(card, cardType);
  const accent = cardType?.color ?? "var(--fg-secondary)";
  // 无上限时不会画血条，滚个 0 没有副作用
  const hpDisplay = useCountUp(hp.hp ?? 0);
  // 条宽也跟着同一个滚动值走：CSS width 过渡与 rAF 是两条时间线，
  // 一起跑会错位（条先到位、数字还在滚）。统一交给 rAF 驱动即天然同步。
  const barRatio =
    hp.max && hp.max > 0
      ? Math.min(1, Math.max(0, hpDisplay / hp.max))
      : null;

  function changeHp(delta: number) {
    if (hp.hp == null || !hp.hpKey) return;
    const next = Math.round(hp.hp + delta);
    onUpdateCard({
      ...card,
      values: { ...card.values, [hp.hpKey]: next },
      updated_at: nowMs(),
    });
  }

  return (
    <div
      style={{
        padding: "6px 8px",
        borderRadius: "var(--radius-sm)",
        background: active ? "var(--bg-raised)" : "transparent",
        borderLeft: active
          ? "2px solid var(--accent-gold)"
          : "2px solid transparent",
        marginBottom: 2,
      }}
    >
      <div
        onClick={onSelect}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <Avatar name={card.name} color={accent} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 12,
              color: active ? "var(--fg-primary)" : "var(--fg-secondary)",
              fontWeight: active ? 600 : 400,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {card.name}
          </div>
          <div
            style={{
              fontSize: 10,
              color: "var(--fg-muted)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {cardType?.name ?? "未知类型"}
          </div>
        </div>
      </div>

      {/* 有上限才画血条 —— 没有数据就不假装有 */}
      {ratio != null && barRatio != null && (
        <div style={{ marginTop: 6 }}>
          <div
            style={{
              height: 6,
              borderRadius: 3,
              background: "var(--hp-bar-bg)",
              overflow: "hidden",
            }}
          >
            {/* 用 scaleX 而不是 width：width 每帧都会重排，
                scaleX 走合成层。颜色仍取真实值，掉血时立刻变红。 */}
            <div
              style={{
                height: "100%",
                width: "100%",
                transform: `scaleX(${barRatio})`,
                transformOrigin: "left center",
                background:
                  ratio <= 0.25
                    ? "var(--hp-bar-low)"
                    : ratio <= 0.5
                      ? "var(--hp-bar-warn)"
                      : "var(--hp-bar-fill)",
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              marginTop: 4,
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontFamily: "var(--font-mono)",
                color: "var(--fg-secondary)",
              }}
            >
              {/* 数字跟着血条一起滚，否则「条在滑、数字在跳」反而更难看 */}
              {Math.round(hpDisplay)} / {hp.max}
            </span>
            {!readOnly && (
              <span style={{ marginLeft: "auto", display: "flex", gap: 3 }}>
                <button
                  className="btn"
                  onClick={() => changeHp(-1)}
                  style={{ fontSize: 10, padding: "0 5px" }}
                  title="扣 1 点"
                >
                  −
                </button>
                <button
                  className="btn"
                  onClick={() => changeHp(1)}
                  style={{ fontSize: 10, padding: "0 5px" }}
                  title="加 1 点"
                >
                  +
                </button>
              </span>
            )}
          </div>
        </div>
      )}

      {stats.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 3,
            marginTop: 5,
          }}
        >
          {stats.map((s) => (
            <button
              key={s.key}
              className="btn"
              onClick={() => onQuickCheck(s, card)}
              disabled={readOnly}
              style={{
                fontSize: 10,
                padding: "1px 5px",
                color: "var(--fg-secondary)",
              }}
              title={`对 ${s.label} ${s.value} 发起检定`}
            >
              {s.label} {s.value}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Avatar({ name, color }: { name: string; color?: string | null }) {
  const letter = name.slice(0, 1);
  const c = color ?? "var(--fg-secondary)";
  return (
    <div
      style={{
        width: 24,
        height: 24,
        borderRadius: "50%",
        background: `${c}33`,
        border: `1px solid ${c}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 11,
        fontWeight: 600,
        color: "var(--fg-primary)",
        flexShrink: 0,
      }}
      title={name}
    >
      {letter}
    </div>
  );
}
