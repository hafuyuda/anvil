import type { Card, CardType, Token } from "../../core/ipc";
import { CardFrame } from "../../components/CardFrame";
import { CardBack } from "../../components/CardFrame/CardBack";
import { PileToken } from "./PileToken";

const DEFAULT_TOKEN_W = 140;
const DEFAULT_TOKEN_H = 205;

interface Props {
  token: Token;
  card: Card | null;
  cardType: CardType | null;
  selected: boolean;
  isDragging: boolean;
  onPointerDown: (e: React.PointerEvent, t: Token) => void;
  onDoubleClick: (e: React.MouseEvent, t: Token) => void;
}

/**
 * 单个 Token 的渲染。接收已解析好的 card / cardType，不负责查找。
 * 交互（拖拽、双击）由父组件通过回调提供。
 */
export function BoardToken({
  token: t,
  card,
  cardType,
  selected,
  isDragging,
  onPointerDown,
  onDoubleClick,
}: Props) {
  const w = t.w ?? DEFAULT_TOKEN_W;
  const h = t.h ?? DEFAULT_TOKEN_H;
  const scale = w / DEFAULT_TOKEN_W;

  return (
    <div
      data-token-id={t.id}
      style={{
        position: "absolute",
        left: t.x,
        top: t.y,
        width: w,
        height: h,
        zIndex: t.layer + 1,
        cursor: isDragging ? "grabbing" : "grab",
        transition: isDragging ? "none" : "filter 0.15s, transform 0.15s",
        transform: `rotate(${t.rotation}deg)`,
        transformOrigin: "center center",
        filter: selected
          ? "drop-shadow(0 0 0 var(--accent-gold)) drop-shadow(0 4px 12px rgba(0,0,0,0.5))"
          : undefined,
        userSelect: "none",
        outline: selected ? "2px solid var(--accent-gold)" : "none",
        outlineOffset: 2,
        borderRadius: "var(--radius-md)",
      }}
      onPointerDown={(e) => onPointerDown(e, t)}
      onDoubleClick={(e) => onDoubleClick(e, t)}
    >
      <div
        style={{
          width: DEFAULT_TOKEN_W,
          height: DEFAULT_TOKEN_H,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          pointerEvents: "none",
        }}
      >
        {t.pile ? (
          <PileToken
            remaining={t.pile.remaining.length}
            total={t.pile.total}
            size="small"
          />
        ) : t.face_down === true ? (
          <CardBack path={cardType?.card_back ?? null} size="small" />
        ) : card && cardType ? (
          <CardFrame card={card} cardType={cardType} size="small" />
        ) : (
          <PlaceholderToken
            label={t.name_override ?? "Token"}
            selected={false}
          />
        )}
      </div>

      {t.name_override && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: -18,
            textAlign: "center",
            fontSize: 11,
            color: "var(--fg-secondary)",
            pointerEvents: "none",
            textShadow: "0 1px 2px rgba(0,0,0,0.8)",
          }}
        >
          {t.name_override}
        </div>
      )}
    </div>
  );
}

function PlaceholderToken({
  label,
  selected,
}: {
  label: string;
  selected: boolean;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: "var(--radius-md)",
        background: "var(--bg-surface)",
        border: `2px solid ${
          selected ? "var(--accent-gold)" : "var(--border-default)"
        }`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 12,
        color: "var(--fg-secondary)",
        textAlign: "center",
        padding: 8,
      }}
    >
      {label}
    </div>
  );
}
