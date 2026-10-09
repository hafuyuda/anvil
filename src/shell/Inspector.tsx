import { useCallback, useRef } from "react";
import { ipc, type Board, type Session, type Token } from "../core/ipc";
import { useProjectStore } from "../stores/projectStore";
import { CardEditor } from "../features/cards/card/CardEditor";
import { TokenInspector } from "../features/board/TokenInspector";
import { CardTypePreview } from "../features/cards/card-type/CardTypePreview";
import { nowMs } from "../lib/time";
import { ScenarioInspector } from "../features/story/scenario/inspector/ScenarioInspector";

export function Inspector() {
  const activeModule = useProjectStore((s) => s.activeModule);

  const selectedCardId = useProjectStore((s) => s.selectedCardId);
  const selectedTokenId = useProjectStore((s) => s.selectedTokenId);
  const selectedEdgeId = useProjectStore((s) => s.selectedEdgeId);
  const selectedCardTypeId = useProjectStore((s) => s.selectedCardTypeId);
  const currentBoardId = useProjectStore((s) => s.currentBoardId);
  const currentSessionId = useProjectStore((s) => s.currentSessionId);

  const cards = useProjectStore((s) => s.cards) ?? [];
  const cardTypes = useProjectStore((s) => s.cardTypes) ?? [];
  const boards = useProjectStore((s) => s.boards) ?? [];
  const sessions = useProjectStore((s) => s.sessions) ?? [];
  const relations = useProjectStore((s) => s.relations) ?? [];
  const scenarios = useProjectStore((s) => s.scenarios) ?? [];

  const upsertBoard = useProjectStore((s) => s.upsertBoard);
  const upsertSession = useProjectStore((s) => s.upsertSession);
  const selectToken = useProjectStore((s) => s.selectToken);

  const width = useProjectStore((s) => s.inspectorWidth);
  const collapsed = useProjectStore((s) => s.inspectorCollapsed);
  const setWidth = useProjectStore((s) => s.setInspectorWidth);
  const toggle = useProjectStore((s) => s.toggleInspector);

  const resizingRef = useRef(false);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      resizingRef.current = true;
      const startX = e.clientX;
      const startWidth = width;

      function onMove(ev: MouseEvent) {
        if (!resizingRef.current) return;
        const delta = startX - ev.clientX;
        setWidth(startWidth + delta);
      }
      function onUp() {
        resizingRef.current = false;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [width, setWidth],
  );

  // 根据模块决定 token 来源
  const board =
    activeModule === "board" && currentBoardId
      ? (boards.find((b) => b.id === currentBoardId) ?? null)
      : null;
  const session =
    activeModule === "session" && currentSessionId
      ? (sessions.find((s) => s.id === currentSessionId) ?? null)
      : null;

  const tokenSource: Token[] = board
    ? (board.tokens ?? [])
    : session
      ? (session.tokens ?? [])
      : [];

  const token =
    selectedTokenId != null
      ? (tokenSource.find((t) => t.id === selectedTokenId) ?? null)
      : null;

  async function handleTokenSave(updated: Token) {
    if (board) {
      const next: Board = {
        ...board,
        tokens: (board.tokens ?? []).map((t) =>
          t.id === updated.id ? updated : t,
        ),
        updated_at: nowMs(),
      };
      await ipc.upsertBoard(next);
      upsertBoard(next);
      return;
    }
    if (session) {
      const next: Session = {
        ...session,
        tokens: (session.tokens ?? []).map((t) =>
          t.id === updated.id ? updated : t,
        ),
        updated_at: nowMs(),
      };
      await ipc.upsertSession(next);
      upsertSession(next);
      return;
    }
  }

  async function handleTokenDelete() {
    if (!token) return;
    if (board) {
      const next: Board = {
        ...board,
        tokens: (board.tokens ?? []).filter((t) => t.id !== token.id),
        updated_at: nowMs(),
      };
      await ipc.upsertBoard(next);
      upsertBoard(next);
      return;
    }
    if (session) {
      const next: Session = {
        ...session,
        tokens: (session.tokens ?? []).filter((t) => t.id !== token.id),
        updated_at: nowMs(),
      };
      await ipc.upsertSession(next);
      upsertSession(next);
      return;
    }
  }

  const edge = selectedEdgeId
    ? (relations.find((r) => r.id === selectedEdgeId) ?? null)
    : null;



  const card = cards.find((c) => c.id === selectedCardId) ?? null;
  const cardType = card
    ? (cardTypes.find((t) => t.id === card.type_id) ?? null)
    : null;

  const previewType =
    activeModule === "types" && selectedCardTypeId
      ? (cardTypes.find((t) => t.id === selectedCardTypeId) ?? null)
      : null;

  if (collapsed) {
    return (
      <div
        style={{
          width: 28,
          borderLeft: "1px solid var(--border-subtle)",
          background: "var(--bg-panel)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: 10,
          flexShrink: 0,
        }}
      >
        <button
          onClick={toggle}
          title="展开检查器"
          style={{
            writingMode: "vertical-rl",
            fontSize: 11,
            padding: "6px 2px",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            color: "var(--fg-secondary)",
            letterSpacing: 2,
            fontFamily: "inherit",
          }}
        >
          检查器
        </button>
      </div>
    );
  }

  const header =
    activeModule === "types"
      ? "卡框预览"
      : activeModule === "story"
        ? selectedEdgeId
          ? "分支"
          : "剧情"
        : token
          ? "Token"
          : edge
            ? "关系"
            : "检查器";

  return (
    <>
      <div
        onMouseDown={onMouseDown}
        style={{
          width: 4,
          cursor: "col-resize",
          background: "transparent",
          flexShrink: 0,
        }}
        title="拖动调整宽度"
      />
      <div
        style={{
          width,
          borderLeft: "1px solid var(--border-subtle)",
          background: "var(--bg-panel)",
          padding: 12,
          overflow: "auto",
          fontSize: 13,
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <span
            style={{
              fontSize: 10,
              color: "var(--fg-muted)",
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            {header}
          </span>
          <button
            onClick={toggle}
            title="折叠"
            style={{
              fontSize: 12,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "var(--fg-secondary)",
            }}
          >
            ⇥
          </button>
        </div>

        {/* types 模块：卡框预览 */}
        {activeModule === "types" && (
          <>
            {previewType ? (
              <CardTypePreview cardType={previewType} />
            ) : (
              <p style={{ color: "var(--fg-muted)" }}>
                选择一个卡牌类型查看卡框预览
              </p>
            )}
          </>
        )}

        {activeModule === "story" && <ScenarioInspector />}
        
        {/* 其他模块：token / edge / card */}
        {activeModule !== "types" && (
          <>
            {token && (
              <TokenInspector
                key={token.id}
                token={token}
                onSave={handleTokenSave}
                onDelete={handleTokenDelete}
                onClose={() => selectToken(null)}
              />
            )}

            {!token && !edge && card && !cardType && (
              <p style={{ color: "var(--danger)", fontSize: 12 }}>
                找不到卡牌类型 {card.type_id}
              </p>
            )}

            {!token && !edge && card && cardType && (
              <CardEditor key={card.id} card={card} cardType={cardType} />
            )}

            {!token && !edge && !card && (
              <p style={{ color: "var(--fg-muted)" }}>未选中对象</p>
            )}
          </>
        )}
      </div>
    </>
  );
}
