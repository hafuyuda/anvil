import { useCallback, useEffect, useRef, useState } from "react";
import { ipc, type Board, type Session, type Token } from "../core/ipc";
import { useProjectStore } from "../stores/projectStore";
import { DEFAULT_INSPECTOR_WIDTH } from "../lib/inspectorPrefs";
import { CardEditor } from "../features/cards/card/CardEditor";
import { TokenInspector } from "../features/board/TokenInspector";
import { CardTypePreview } from "../features/cards/card-type/CardTypePreview";
import { nowMs } from "../lib/time";
import { makeUndoId } from "../lib/id";
import { mergeEntity } from "../lib/undoMerge";
import { ScenarioInspector } from "../features/story/scenario/inspector/ScenarioInspector";
import { PlayerInspector } from "../features/player/PlayerInspector";

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

  const upsertBoard = useProjectStore((s) => s.upsertBoard);
  const upsertSession = useProjectStore((s) => s.upsertSession);
  const pushUndo = useProjectStore((s) => s.pushUndo);
  const selectToken = useProjectStore((s) => s.selectToken);

  const width = useProjectStore((s) => s.inspectorWidth);
  const collapsed = useProjectStore((s) => s.inspectorCollapsed);
  const setWidth = useProjectStore((s) => s.setInspectorWidth);
  const setCollapsed = useProjectStore((s) => s.setInspectorCollapsed);

  const resizingRef = useRef(false);
  const [resizing, setResizing] = useState(false);
  // 折叠态下鼠标移到细条上的临时预览
  const [peek, setPeek] = useState(false);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      resizingRef.current = true;
      setResizing(true);
      const startX = e.clientX;
      const startWidth = width;

      function onMove(ev: MouseEvent) {
        if (!resizingRef.current) return;
        const delta = startX - ev.clientX;
        setWidth(startWidth + delta);
      }
      function onUp() {
        resizingRef.current = false;
        setResizing(false);
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

  /**
   * Token 的写入都走撤销栈。
   *
   * 注意不能把「动作前的整个棋盘」直接写回来：用户在删除之后又拖了下
   * 别的 token，旧快照会把那次拖动吞掉。这里按 id 合并，只回滚本次
   * 改动碰过的那枚 token。
   *
   * 读当前状态一律在回调里现取 —— getState() 的返回值是那一刻的快照，
   * 提到外面会拿到旧数组。
   */
  function pushBoardUndo(before: Board, after: Board, label: string) {
    pushUndo({
      id: makeUndoId(),
      label,
      undo: async () => {
        const store = useProjectStore.getState();
        const cur = store.boards.find((b) => b.id === before.id) ?? null;
        const next = cur ? mergeEntity(before, after, cur) : before;
        await ipc.upsertBoard(next);
        store.upsertBoard(next);
      },
      redo: async () => {
        const store = useProjectStore.getState();
        const cur = store.boards.find((b) => b.id === before.id) ?? null;
        const next = cur ? mergeEntity(after, before, cur) : after;
        await ipc.upsertBoard(next);
        store.upsertBoard(next);
      },
    });
  }

  function pushSessionUndo(before: Session, after: Session, label: string) {
    pushUndo({
      id: makeUndoId(),
      label,
      undo: async () => {
        const store = useProjectStore.getState();
        const cur = store.sessions.find((s) => s.id === before.id) ?? null;
        const next = cur ? mergeEntity(before, after, cur) : before;
        await ipc.upsertSession(next);
        store.upsertSession(next);
      },
      redo: async () => {
        const store = useProjectStore.getState();
        const cur = store.sessions.find((s) => s.id === before.id) ?? null;
        const next = cur ? mergeEntity(after, before, cur) : after;
        await ipc.upsertSession(next);
        store.upsertSession(next);
      },
    });
  }

  async function handleTokenSave(updated: Token) {
    if (board) {
      const before = board;
      const after: Board = {
        ...before,
        tokens: (before.tokens ?? []).map((t) =>
          t.id === updated.id ? updated : t,
        ),
        updated_at: nowMs(),
      };
      await ipc.upsertBoard(after);
      upsertBoard(after);
      pushBoardUndo(before, after, "编辑 Token");
      return;
    }
    if (session) {
      const before = session;
      const after: Session = {
        ...before,
        tokens: (before.tokens ?? []).map((t) =>
          t.id === updated.id ? updated : t,
        ),
        updated_at: nowMs(),
      };
      await ipc.upsertSession(after);
      upsertSession(after);
      pushSessionUndo(before, after, "编辑 Token");
      return;
    }
  }

  async function handleTokenDelete() {
    if (!token) return;
    if (board) {
      const before = board;
      const after: Board = {
        ...before,
        tokens: (before.tokens ?? []).filter((t) => t.id !== token.id),
        updated_at: nowMs(),
      };
      await ipc.upsertBoard(after);
      upsertBoard(after);
      pushBoardUndo(before, after, "删除 Token");
      return;
    }
    if (session) {
      const before = session;
      const after: Session = {
        ...before,
        tokens: (before.tokens ?? []).filter((t) => t.id !== token.id),
        updated_at: nowMs(),
      };
      await ipc.upsertSession(after);
      upsertSession(after);
      pushSessionUndo(before, after, "删除 Token");
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

  /**
   * 选中联动：**检查器跟着「有没有东西可看」自动开合。**
   *
   * story / player 两家的检查器本身就是常驻工作区（剧本大纲、播放列表），
   * 没选中东西也有内容，所以不接管；其余模块里检查器纯粹是「跟随选中」。
   */
  const autoManaged = activeModule !== "story" && activeModule !== "player";

  // 当前被检查的对象。用「谁」而不是「有没有」，
  // 才能区分「换了一个」和「同一个反复重渲染」。
  const subjectKey =
    token?.id ?? edge?.id ?? card?.id ?? previewType?.id ?? null;

  const prevSubjectRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (!autoManaged) {
      // 交还控制权。置回 undefined，回到受管模块时重新判断一次。
      prevSubjectRef.current = undefined;
      return;
    }
    const prev = prevSubjectRef.current;
    prevSubjectRef.current = subjectKey;

    if (subjectKey) {
      // 选中了新东西 → 展开。同一个对象不重复抢用户手动折叠的决定。
      if (subjectKey !== prev && collapsed) setCollapsed(false);
    } else if (!collapsed) {
      // 什么都没选 → 收起来，把宽度还给主区
      setCollapsed(true);
    }
  }, [subjectKey, collapsed, autoManaged, setCollapsed]);

  // 折叠状态一变就收掉预览，否则下次折叠时会带着上次残留的 peek 直接浮出来
  useEffect(() => {
    setPeek(false);
  }, [collapsed]);

  const header =
    activeModule === "types"
      ? "卡框预览"
      : activeModule === "player"
        ? "播放"
        : activeModule === "story"
          ? selectedEdgeId
            ? "分支"
            : "剧情"
          : token
            ? "Token"
            : edge
              ? "关系"
              : "检查器";

  /**
   * 面板主体 —— 展开态和「折叠态的悬停预览」共用同一份内容，
   * 区别只在容器：一个是布局里的一栏，一个是浮在主区之上的浮层。
   */
  const renderPanel = (onCollapse: () => void, collapseTitle: string) => (
    <>
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
          onClick={onCollapse}
          title={collapseTitle}
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

      {activeModule === "player" && <PlayerInspector />}

      {activeModule === "story" && <ScenarioInspector />}

      {/* 其他模块：token / edge / card */}
      {activeModule !== "types" && activeModule !== "player" && (
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
    </>
  );

  // ── 折叠态：一条 28px 的竖条，鼠标移上去浮出预览 ────────────────
  if (collapsed) {
    return (
      <div
        onMouseEnter={() => setPeek(true)}
        onMouseLeave={() => setPeek(false)}
        style={{
          width: 28,
          position: "relative",
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
          onClick={() => setCollapsed(false)}
          title="展开检查器（Ctrl+I）"
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

        {peek && (
          /**
           * 预览浮层必须出离 flex 流：若改成把 28px 拉到 320px，
           * 每帧都在挤压主区，卡片墙/棋盘会跟着重排，既抖又卡。
           * 这里向左浮在主区之上，主区尺寸一动不动。
           * 鼠标仍在这棵子树里（浮层是 28px 条的后代），所以不会闪。
           */
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              right: 0,
              width,
              zIndex: 30,
              borderLeft: "1px solid var(--border-subtle)",
              boxShadow: "-10px 0 24px rgba(0,0,0,0.45)",
              background: "var(--bg-panel)",
              padding: 12,
              overflow: "auto",
              fontSize: 13,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {renderPanel(() => setPeek(false), "关闭预览")}
          </div>
        )}
      </div>
    );
  }

  // ── 展开态 ────────────────────────────────────────────────────
  return (
    <>
      <div
        className={`inspector-resize-handle${resizing ? " is-active" : ""}`}
        onMouseDown={onMouseDown}
        onDoubleClick={() => setWidth(DEFAULT_INSPECTOR_WIDTH)}
        style={{
          width: 6,
          cursor: "col-resize",
          position: "relative",
          flexShrink: 0,
        }}
        title="拖动调整宽度，双击恢复默认"
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: 2,
            background: "var(--border-strong)",
            opacity: 0.5,
          }}
        />
      </div>
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
        {renderPanel(() => setCollapsed(true), "折叠（Ctrl+I）")}
      </div>
    </>
  );
}
