import { useEffect, useRef, useState } from "react";
import type { Card, CardType, Token } from "../../core/ipc";
import { CardFrame } from "../../components/card/CardFrame";
import { CardBack } from "../../components/card/CardFrame/primitives/CardBack";
import { PileToken } from "./PileToken";
import { useProjectStore } from "../../stores/projectStore";
import { useReducedMotion } from "../../hooks/useReducedMotion";

const DEFAULT_TOKEN_W = 140;
const DEFAULT_TOKEN_H = 205;

/** 翻牌时长。与「啪」地翻一下的手感对齐，再长就觉得拖。 */
const FLIP_MS = 340;
/** 抽牌飞入时长。 */
const FLY_MS = 260;

interface Props {
  token: Token;
  card: Card | null;
  cardType: CardType | null;
  selected: boolean;
  isDragging: boolean;
  /**
   * 抽牌飞入的起点（棋盘坐标）。只有「本次新出现的 token」会被传这个值，
   * 之后清空 —— 它只用来决定第一帧画在哪。
   */
  enterFrom?: { x: number; y: number } | null;
  onPointerDown: (e: React.PointerEvent, t: Token) => void;
  onDoubleClick: (e: React.MouseEvent, t: Token) => void;
}

/**
 * 单个 Token 的渲染。接收已解析好的 card / cardType，不负责查找。
 * 交互（拖拽、双击）由父组件通过回调提供。
 *
 * 三段动画都只动 transform / opacity / left+top（绝对定位元素改 left/top
 * 不触发兄弟节点重排），不碰 width/height：
 *   - 翻牌：preserve-3d + rotateY。**过渡期间才同时渲染正反两面**，
 *     静止时只渲染当前那一面 —— 否则每张扣着的卡都常驻一整个卡背子树。
 *   - 抽牌飞入：从卡盒位置过渡到落点。
 *   - 拖拽：抬升 + 阴影。
 */
export function BoardToken({
  token: t,
  card,
  cardType,
  selected,
  isDragging,
  enterFrom,
  onPointerDown,
  onDoubleClick,
}: Props) {
  const w = t.w ?? DEFAULT_TOKEN_W;
  const h = t.h ?? DEFAULT_TOKEN_H;
  const scale = w / DEFAULT_TOKEN_W;
  const reducedMotion = useReducedMotion();

  // 卡背优先级：类型级 card_back → 项目级 default_card_back → 默认风格 anvil
  const defaultBack = useProjectStore(
    (s) => s.manifest?.default_card_back ?? null,
  );
  const backStyleId = cardType?.card_back ?? defaultBack ?? undefined;

  // ── 翻牌 ──
  // faceDown 由数据驱动；这里只负责「变了就播一次」。
  // flipping 为真时才同时挂两面，动画一结束就回到单面。
  const [flipped, setFlipped] = useState(t.face_down === true);
  const [flipping, setFlipping] = useState(false);
  const flipTimer = useRef<number | null>(null);

  useEffect(() => {
    const next = t.face_down === true;
    if (next === flipped) return;
    setFlipped(next);
    if (reducedMotion) return;
    setFlipping(true);
    if (flipTimer.current !== null) window.clearTimeout(flipTimer.current);
    flipTimer.current = window.setTimeout(() => {
      setFlipping(false);
      flipTimer.current = null;
    }, FLIP_MS);
  }, [t.face_down, flipped, reducedMotion]);

  useEffect(
    () => () => {
      if (flipTimer.current !== null) window.clearTimeout(flipTimer.current);
    },
    [],
  );

  const showFront = !flipped || flipping;
  const showBack = flipped || flipping;

  // ── 抽牌飞入 ──
  // 挂载时若带了起点，先画在起点，两帧后切到落点并加上过渡。
  // 要减少动效时干脆不接过起点 —— 免得先摆到起点再补一帧。
  const [flyFrom, setFlyFrom] = useState(() =>
    reducedMotion ? null : (enterFrom ?? null),
  );
  useEffect(() => {
    if (flyFrom === null) return;
    // 双 rAF：单 rAF 可能和本次样式写入合并，浏览器看不到起始状态就直接跳到终点
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setFlyFrom(null));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [flyFrom]);

  const flying = flyFrom !== null;
  const animating = flying || flipping;

  // 飞入用 translate 而不是改 left/top —— 后者每帧都要重新布局。
  // 位移是「起点 - 落点」，落点不动，动的是附加的那一层 transform。
  const flyDx = flyFrom ? flyFrom.x - t.x : 0;
  const flyDy = flyFrom ? flyFrom.y - t.y : 0;
  const lift = isDragging ? "translateY(-4px) scale(1.03)" : flying ? "scale(0.9)" : "";
  const tokenTransform = `translate(${flyDx}px, ${flyDy}px) rotate(${t.rotation}deg) ${lift}`;

  const front = card && cardType ? (
    <CardFrame card={card} cardType={cardType} size="small" />
  ) : (
    <PlaceholderToken label={t.name_override ?? "Token"} />
  );

  const face = (children: React.ReactNode, rotateY: string, hidden: boolean) => (
    <div
      style={{
        position: "absolute",
        inset: 0,
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
        transform: rotateY,
        pointerEvents: "none",
        opacity: hidden ? 0 : 1,
      }}
    >
      {children}
    </div>
  );

  const body = t.pile ? (
    <PileToken remaining={t.pile.remaining.length} total={t.pile.total} size="small" />
  ) : (
    <div
      style={{
        width: "100%",
        height: "100%",
        perspective: 900,
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          transformStyle: "preserve-3d",
          WebkitTransformStyle: "preserve-3d",
          // 过渡一直挂着，不是「翻的时候才挂」：
          // flipped 与 transform 是同一次提交里改的，若这次提交才把 transition
          // 打开，浏览器看到的起点就是终点，动画直接被吃掉。
          transition: reducedMotion ? "none" : `transform ${FLIP_MS}ms ease`,
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {showFront && face(front, "rotateY(0deg)", false)}
        {showBack &&
          face(
            <CardBack styleId={backStyleId} size="small" />,
            "rotateY(180deg)",
            false,
          )}
      </div>
    </div>
  );

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
        // 拖拽中不过渡 —— 位置每帧都在变，过渡只会让它显得滞后
        transition: isDragging
          ? "none"
          : flying
            ? `transform ${FLY_MS}ms ease-out, filter 0.15s`
            : "transform 0.15s, filter 0.15s",
        // 拖拽中抬升 + 轻微放大；飞入时从卡盒大小长上来
        transform: tokenTransform,
        transformOrigin: "center center",
        // 只在拖拽时挂 filter：drop-shadow 会让每张卡都单独走一遍滤镜管线，
        // 棋盘上几十个 token 常驻就是几十个额外的渲染层。选中态交给 outline。
        filter: isDragging ? "drop-shadow(0 10px 20px rgba(0,0,0,0.55))" : undefined,
        userSelect: "none",
        outline: selected ? "2px solid var(--accent-gold)" : "none",
        outlineOffset: 2,
        borderRadius: "var(--radius-md)",
        // 飞入期间别让指针事件打到半路上的卡
        pointerEvents: animating ? "none" : undefined,
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
        {body}
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

function PlaceholderToken({ label }: { label: string }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: "var(--radius-md)",
        background: "var(--bg-surface)",
        border: "2px solid var(--border-default)",
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
