import { useEffect, useRef, useState } from "react";
import { useProjectStore } from "../stores/projectStore";
import { CardFrame } from "./CardFrame";

interface Props {
  cardId: string;
  children: React.ReactNode;
  /**
   * - "follow-mouse"（默认）：浮层跟随鼠标右下，用于句子里的文本引用
   * - "anchor-right"：浮层锚定触发元素右侧，用于头像等固定锚点
   */
  position?: "follow-mouse" | "anchor-right";
}

const ENTER_DELAY = 200;
const LEAVE_DELAY = 300;
const OFFSET = 8;
const CARD_W = 140;
const CARD_H = 205;

export function HoverPreview({
  cardId,
  children,
  position = "follow-mouse",
}: Props) {
  const card = useProjectStore((s) => s.cards.find((c) => c.id === cardId));
  const cardType = useProjectStore((s) =>
    card ? s.cardTypes.find((t) => t.id === card.type_id) : undefined,
  );

  const containerRef = useRef<HTMLSpanElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const enterTimer = useRef<number | null>(null);
  const leaveTimer = useRef<number | null>(null);

  function clearEnter() {
    if (enterTimer.current !== null) {
      window.clearTimeout(enterTimer.current);
      enterTimer.current = null;
    }
  }
  function clearLeave() {
    if (leaveTimer.current !== null) {
      window.clearTimeout(leaveTimer.current);
      leaveTimer.current = null;
    }
  }

  useEffect(() => {
    return () => {
      clearEnter();
      clearLeave();
    };
  }, []);

  function computeFollowMouse(x: number, y: number) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let px = x + OFFSET;
    let py = y + OFFSET;
    if (px + CARD_W > vw - 8) px = x - CARD_W - OFFSET;
    if (py + CARD_H > vh - 8) py = y - CARD_H - OFFSET;
    px = Math.max(8, px);
    py = Math.max(8, py);
    return { x: px, y: py };
  }

  function computeAnchorRight(): { x: number; y: number } | null {
    const el = containerRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let px = rect.right + OFFSET;
    let py = rect.top + rect.height / 2 - CARD_H / 2;
    if (px + CARD_W > vw - 8) {
      px = rect.left - CARD_W - OFFSET;
    }
    py = Math.max(8, Math.min(vh - CARD_H - 8, py));
    return { x: px, y: py };
  }

  function handleEnter(e: React.MouseEvent) {
    if (!card || !cardType) return;
    clearEnter();
    clearLeave();
    const mx = e.clientX;
    const my = e.clientY;
    enterTimer.current = window.setTimeout(() => {
      const p =
        position === "anchor-right"
          ? computeAnchorRight()
          : computeFollowMouse(mx, my);
      if (p) {
        setPos(p);
        setVisible(true);
      }
    }, ENTER_DELAY);
  }

  function handleLeave() {
    clearEnter();
    leaveTimer.current = window.setTimeout(() => {
      setVisible(false);
    }, LEAVE_DELAY);
  }

  function handlePreviewEnter() {
    clearLeave();
  }

  function handlePreviewLeave() {
    leaveTimer.current = window.setTimeout(() => {
      setVisible(false);
    }, LEAVE_DELAY);
  }

  if (!card || !cardType) {
    return <>{children}</>;
  }

  return (
    <>
      <span
        ref={containerRef}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        style={{
          display: position === "anchor-right" ? "inline-block" : undefined,
        }}
      >
        {children}
      </span>
      {visible && (
        <div
          onMouseEnter={handlePreviewEnter}
          onMouseLeave={handlePreviewLeave}
          style={{
            position: "fixed",
            left: pos.x,
            top: pos.y,
            zIndex: 3000,
            pointerEvents: "auto",
            filter: "drop-shadow(0 8px 20px rgba(0,0,0,0.6))",
          }}
        >
          <CardFrame card={card} cardType={cardType} size="small" />
        </div>
      )}
    </>
  );
}
