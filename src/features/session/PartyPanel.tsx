import { clamp01 } from "../../lib/math";
import type { Card, CardType } from "../../core/ipc";
import { nowMs } from "../../lib/time";
import { useCountUp } from "../../hooks/useCountUp";
import { hpRatio, listNumberStats, readHp, type CardStat } from "./cardStats";

interface Props {
  /** 队伍成员。来自会话绑定的卡组 —— 会话只持有引用，数据仍在卡上 */
  party: Card[];
  cardTypes: CardType[];
  /** HP 等数值改动要写回卡牌本身 */
  onUpdateCard: (card: Card) => void;
  onQuickCheck: (stat: CardStat, card: Card) => void;
}

export function PartyPanel({
  party,
  cardTypes,
  onUpdateCard,
  onQuickCheck,
}: Props) {
  return (
    <div
      style={{
        width: 240,
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
          fontSize: 10,
          color: "var(--fg-muted)",
          textTransform: "uppercase",
          letterSpacing: 1,
          flexShrink: 0,
        }}
      >
        队伍（{party.length}）
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 4 }}>
        {party.length === 0 && (
          <div
            style={{
              padding: 12,
              fontSize: 12,
              color: "var(--fg-muted)",
              textAlign: "center",
              lineHeight: 1.6,
            }}
          >
            没有成员
            <br />
            在顶栏为本次会话选一个卡组
          </div>
        )}

        {party.map((card) => (
          <Entry
            key={card.id}
            card={card}
            cardType={cardTypes.find((x) => x.id === card.type_id) ?? null}
            onUpdateCard={onUpdateCard}
            onQuickCheck={onQuickCheck}
          />
        ))}
      </div>

      {party.length > 0 && (
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
  card,
  cardType,
  onUpdateCard,
  onQuickCheck,
}: {
  card: Card;
  cardType: CardType | null;
  onUpdateCard: (card: Card) => void;
  onQuickCheck: (stat: CardStat, card: Card) => void;
}) {
  const hp = readHp(card);
  const ratio = hpRatio(hp.hp, hp.max);
  const stats = listNumberStats(card, cardType);
  const accent = cardType?.color ?? "var(--fg-secondary)";
  // 无上限时不会画血条，滚个 0 没有副作用
  const hpDisplay = useCountUp(hp.hp ?? 0);
  // 条宽也跟着同一个滚动值走：CSS width 过渡与 rAF 是两条时间线，
  // 一起跑会错位（条先到位、数字还在滚）。统一交给 rAF 驱动即天然同步。
  const barRatio =
    hp.max && hp.max > 0 ? clamp01(hpDisplay / hp.max) : null;

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
        marginBottom: 2,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          userSelect: "none",
        }}
      >
        <Avatar name={card.name} color={accent} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 12,
              color: "var(--fg-secondary)",
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
              style={{
                fontSize: 10,
                padding: "1px 5px",
                color: "var(--fg-secondary)",
              }}
              title={`为 ${s.label} ${s.value} 掷骰`}
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
