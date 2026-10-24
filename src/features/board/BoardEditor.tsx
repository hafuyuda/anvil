import { useEffect, useState } from "react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { ipc, type Board, type Relation } from "../../core/ipc";
import { useProjectStore } from "../../stores/projectStore";
import { DEFAULT_GRID } from "./constants";
import { invalidateAsset } from "../../lib/assetCache";
import { BoardToolbar } from "./BoardToolbar";
import { BoardCanvas } from "./BoardCanvas";
import { BoardDialogs } from "./BoardDialogs";
import { BoardBottomBar } from "./BoardBottomBar";
import { useBoardActions } from "./useBoardActions";
import { useBoardEvents } from "./useBoardEvents";
import { BoardHistoryPanel } from "./BoardHistoryPanel";
import { BoardReplayView } from "./BoardReplayView";
import { RelationFilterDialog } from "./RelationFilterDialog";
import { usePileActions } from "./usePileActions";
import { syncPileWithGroup } from "./pileSync";
import {
  flipPayload,
  layerPayload,
  movePayload,
  pilePayload,
  placePayload,
} from "./delta";
import { confirmDialog } from "../../lib/confirm";
import { runWithError } from "../../lib/runWithError";
import { useContextMenu, type MenuEntry } from "../../components/ui/ContextMenu";
import { newId } from "../../lib/id";
import { nowMs } from "../../lib/time";
import { PickerDialog } from "../../components/overlay/PickerDialog";
import type { Token } from "../../core/ipc";

interface Props {
  board: Board;
}

export function BoardEditor({ board }: Props) {
  const upsertBoard = useProjectStore((s) => s.upsertBoard);
  const setCurrentBoard = useProjectStore((s) => s.setCurrentBoard);
  const pushUndo = useProjectStore((s) => s.pushUndo);
  const cards = useProjectStore((s) => s.cards) ?? [];
  const cardTypes = useProjectStore((s) => s.cardTypes) ?? [];
  const cardGroups = useProjectStore((s) => s.cardGroups) ?? [];
  const selectedTokenIds = useProjectStore((s) => s.selectedTokenIds) ?? [];
  const clearTokenSelection = useProjectStore((s) => s.clearTokenSelection);
  const selectToken = useProjectStore((s) => s.selectToken);
  const setActiveModule = useProjectStore((s) => s.setActiveModule);
  const selectCard = useProjectStore((s) => s.selectCard);
  const relationKinds = useProjectStore((s) => s.relationKinds) ?? [];
  const upsertRelation = useProjectStore((s) => s.upsertRelation);

  const normalized: Board = {
    ...board,
    grid: board.grid ?? DEFAULT_GRID,
    tokens: board.tokens ?? [],
  };

  // 落子历史（牌谱）——挂在棋盘自己的 events.jsonl 上
  const {
    events: boardEvents,
    logEvent,
    deleteEvent: deleteBoardEvent,
  } = useBoardEvents(normalized.id);

  const {
    savePatch,
    addCardsToBoard,
    addPlaceholder,
    importFromGroup,
    addPile,
    deleteSelectedTokens,
  } = useBoardActions({ board: normalized, upsertBoard, pushUndo, logEvent });

  const { drawFromPile, shufflePile, resetPile, syncPile } = usePileActions({
    tokens: normalized.tokens ?? [],
    applyTokens: (next, label) => savePatch({ tokens: next }, label),
    bounds: { width: normalized.width, height: normalized.height },
  });
  const [name, setName] = useState(normalized.name);
  const [zoom, setZoom] = useState(1);
  const [bgPickerOpen, setBgPickerOpen] = useState(false);
  const [imageOptions, setImageOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [addFromGroupOpen, setAddFromGroupOpen] = useState(false);
  const [addPileOpen, setAddPileOpen] = useState(false);
  const [cardPickerOpen, setCardPickerOpen] = useState(false);
  const [pileDrawTokenId, setPileDrawTokenId] = useState<string | null>(null);

  const [relationFilterOpen, setRelationFilterOpen] = useState(false);
  const [measureMode, setMeasureMode] = useState(false);
  const [historyMode, setHistoryMode] = useState(false);
  const [replayMode, setReplayMode] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);

  /** 按 token id 取显示名：卡盒用名字，卡牌用卡名，都没有就是占位。 */
  function tokenName(id: string) {
    const t = normalized.tokens.find((x) => x.id === id);
    if (!t) return "未知";
    if (t.pile) return t.name_override ?? "卡盒";
    if (t.name_override) return t.name_override;
    if (t.card_id) {
      return cards.find((c) => c.id === t.card_id)?.name ?? "未知卡牌";
    }
    return "占位";
  }

  // ── 右键菜单 ──
  const ctx = useContextMenu();

  function flipToken(t: Token) {
    const faceDown = !(t.face_down ?? false);
    const next = normalized.tokens.map((x) =>
      x.id === t.id ? { ...x, face_down: faceDown } : x,
    );
    void savePatch({ tokens: next }, "翻转");
    void logEvent(
      "board.flip",
      flipPayload({
        tokenIds: [t.id],
        faceDown,
        summary: `翻${faceDown ? "扣" : "开"}「${tokenName(t.id)}」`,
      }),
    );
  }

  function setTokenLayer(t: Token, where: "front" | "back") {
    const label = where === "front" ? "置顶" : "置底";
    const layers = normalized.tokens.map((x) => x.layer);
    const target =
      where === "front" ? Math.max(...layers) + 1 : Math.min(...layers) - 1;
    const next = normalized.tokens.map((x) =>
      x.id === t.id ? { ...x, layer: target } : x,
    );
    void savePatch({ tokens: next }, label);
    void logEvent(
      "board.layer",
      layerPayload({
        tokens: next.filter((x) => x.id === t.id),
        where,
        summary: `${label}「${tokenName(t.id)}」`,
      }),
    );
  }

  /** 批量翻转选中 token（检查器里的翻转只针对单枚）。 */
  function flipTokens(ids: string[]) {
    if (ids.length === 0) return;
    const set = new Set(ids);
    // 各枚独立取反，记历史时以第一枚的结果作代表
    const faceDown = !(
      normalized.tokens.find((x) => x.id === ids[0])?.face_down ?? false
    );
    const next = normalized.tokens.map((x) =>
      set.has(x.id) ? { ...x, face_down: !(x.face_down ?? false) } : x,
    );
    void savePatch({ tokens: next }, "批量翻转");
    void logEvent(
      "board.flip",
      flipPayload({
        tokenIds: ids,
        faceDown,
        summary: `翻${faceDown ? "扣" : "开"} ${ids.length} 枚 Token`,
      }),
    );
  }

  /** 批量置顶 / 置底，保持选中集合内部相对次序。 */
  function setTokensLayer(ids: string[], where: "front" | "back") {
    if (ids.length === 0) return;
    const set = new Set(ids);
    const layers = normalized.tokens.map((x) => x.layer);
    let next: Token[];
    if (where === "front") {
      const base = Math.max(...layers) + 1;
      let i = 0;
      next = normalized.tokens.map((x) =>
        set.has(x.id) ? { ...x, layer: base + i++ } : x,
      );
      void savePatch({ tokens: next }, "批量置顶");
    } else {
      const base = Math.min(...layers) - 1;
      let i = 0;
      next = normalized.tokens.map((x) =>
        set.has(x.id) ? { ...x, layer: base - i++ } : x,
      );
      void savePatch({ tokens: next }, "批量置底");
    }
    void logEvent(
      "board.layer",
      layerPayload({
        tokens: next.filter((x) => set.has(x.id)),
        where,
        summary: `${where === "front" ? "置顶" : "置底"} ${ids.length} 枚 Token`,
      }),
    );
  }

  // 连线前置：恰好选中 2 枚、且都关联了卡牌
  const connectableCards = (() => {
    if (selectedTokenIds.length !== 2) return null;
    const ts = selectedTokenIds
      .map((id) => normalized.tokens.find((t) => t.id === id))
      .filter((t): t is Token => !!t && !!t.card_id);
    return ts.length === 2 ? (ts.map((t) => t.card_id!) as [string, string]) : null;
  })();

  async function createRelation(kindId: string) {
    setConnectOpen(false);
    const cards = connectableCards;
    if (!cards) return;
    const relation: Relation = {
      id: newId(),
      from: cards[0],
      to: cards[1],
      kind: kindId,
      label: null,
      meta: {},
      created_at: nowMs(),
    };
    await runWithError(async () => {
      await ipc.upsertRelation(relation);
      upsertRelation(relation);
      if (!normalized.show_relations) {
        savePatch({ show_relations: true }, "显示关系");
      }
    }, "连线失败");
  }

  function duplicateToken(t: Token) {
    const maxLayer = normalized.tokens.reduce((m, x) => Math.max(m, x.layer), -1);
    const copy: Token = {
      ...t,
      id: newId(),
      x: t.x + 24,
      y: t.y + 24,
      layer: maxLayer + 1,
    };
    void savePatch({ tokens: [...normalized.tokens, copy] }, "复制 Token");
    void logEvent(
      "board.place",
      placePayload({
        tokens: [copy],
        source: "duplicate",
        summary: `复制「${tokenName(t.id)}」`,
      }),
    );
  }

  // ── 卡盒动作：抽 / 洗 / 重置，顺手记牌谱 ──
  async function drawPile(tokenId: string, count: number) {
    const r = await drawFromPile(tokenId, count);
    if (!r) return;
    void logEvent(
      "board.pile",
      pilePayload({
        action: "draw",
        pileTokenId: tokenId,
        count,
        placed: r.placed,
        pileAfter: r.pileAfter,
        summary: `从「${tokenName(tokenId)}」抽 ${count} 张`,
      }),
    );
  }

  async function shufflePileToken(tokenId: string) {
    const r = await shufflePile(tokenId);
    if (!r) return;
    void logEvent(
      "board.pile",
      pilePayload({
        action: "shuffle",
        pileTokenId: tokenId,
        pileAfter: r.pileAfter,
        summary: `洗牌「${tokenName(tokenId)}」`,
      }),
    );
  }

  async function resetPileToken(tokenId: string) {
    const r = await resetPile(tokenId);
    if (!r) return;
    void logEvent(
      "board.pile",
      pilePayload({
        action: "reset",
        pileTokenId: tokenId,
        pileAfter: r.pileAfter,
        summary: `重置卡盒「${tokenName(tokenId)}」`,
      }),
    );
  }

  /**
   * 卡组 → 卡盒同步（只补不删，设计见 DESIGN §4.7 / §13）。组里新增的卡补进卡盒，
   * 组里移除的不管——棋盘上的删除只能是用户显式动作。
   * 卡组已被删（pile.group_id 悬空）时静默返回，卡盒保持原样。
   */
  async function syncPileToken(tokenId: string) {
    const t = normalized.tokens.find((x) => x.id === tokenId);
    const group = t?.pile
      ? cardGroups.find((g) => g.id === t.pile!.group_id)
      : undefined;
    if (!group) return;
    const { added, pileAfter } = await syncPile(tokenId, group.card_ids);
    if (added.length === 0) return;
    void logEvent(
      "board.pile",
      pilePayload({
        action: "sync",
        pileTokenId: tokenId,
        count: added.length,
        pileAfter,
        summary: `同步卡组「${group.name}」+${added.length} 张`,
      }),
    );
  }

  /**
   * 画布改动提交。
   *
   * 拖拽移动和双击翻转都从这里进，靠 diff 坐标 / 翻面状态把它们分开记牌谱 ——
   * 两条路都只给一个「新的 tokens」，光看 patch 分不出来。
   */
  function handleCanvasChange(patch: Partial<Board>) {
    if (!patch.tokens) {
      savePatch(patch);
      return;
    }
    savePatch({ tokens: patch.tokens }, "移动 Token");

    const moved: string[] = [];
    const flipped: string[] = [];
    for (const nt of patch.tokens) {
      const old = normalized.tokens.find((o) => o.id === nt.id);
      if (!old) continue;
      if (old.x !== nt.x || old.y !== nt.y) moved.push(nt.id);
      if ((old.face_down ?? false) !== (nt.face_down ?? false)) {
        flipped.push(nt.id);
      }
    }

    if (moved.length > 0) {
      const set = new Set(moved);
      void logEvent(
        "board.move",
        movePayload({
          before: normalized.tokens.filter((t) => set.has(t.id)),
          after: patch.tokens.filter((t) => set.has(t.id)),
          summary:
            moved.length === 1
              ? `移动「${tokenName(moved[0])}」`
              : `移动 ${moved.length} 枚 Token`,
        }),
      );
    }
    if (flipped.length > 0) {
      const faceDown = !!patch.tokens.find((t) => t.id === flipped[0])
        ?.face_down;
      if (flipped.length === 1) {
        void logEvent(
          "board.flip",
          flipPayload({
            tokenIds: flipped,
            faceDown,
            summary: `翻${faceDown ? "扣" : "开"}「${tokenName(flipped[0])}」`,
          }),
        );
      } else {
        // 双击翻转会一次翻一组，各枚独立取反后状态未必一致 ——
        // 逐枚各记一条，回放才不会把整组抹成同一个状态
        for (const id of flipped) {
          const fd = !!patch.tokens.find((t) => t.id === id)?.face_down;
          void logEvent(
            "board.flip",
            flipPayload({
              tokenIds: [id],
              faceDown: fd,
              summary: `翻${fd ? "扣" : "开"}「${tokenName(id)}」`,
            }),
          );
        }
      }
    }
  }

  async function deleteToken(t: Token) {
    const sel = useProjectStore.getState().selectedTokenIds ?? [];
    const ids = sel.includes(t.id) && sel.length > 1 ? sel : [t.id];
    if (ids.length === 1) selectToken(t.id);
    const ok = await confirmDialog({
      message: `删除 ${ids.length > 1 ? `${ids.length} 个` : "该"} Token？可用 Ctrl+Z 撤销。`,
      confirmLabel: "删除",
      danger: true,
    });
    if (!ok) return;
    await deleteSelectedTokens(ids);
    if (ids.length === 1) clearTokenSelection();
  }

  /**
   * 卡盒右键菜单里的「同步卡组」项。实时算差额（多重集语义）：
   * 有新卡 → 「同步卡组（+N）」可点；组里没新卡或组已被删 → 禁用项，
   * 状态写在 label 里，不让用户猜为什么点不动。
   */
  function syncMenuEntry(t: Token): MenuEntry {
    const group = cardGroups.find((g) => g.id === t.pile?.group_id);
    const n = group
      ? syncPileWithGroup(t.pile!, group.card_ids).added.length
      : 0;
    if (!group) {
      return { label: "同步卡组（卡组已删除）", disabled: true, onClick: () => {} };
    }
    return {
      label: n > 0 ? `同步卡组（+${n}）` : "同步卡组（无新卡）",
      disabled: n === 0,
      onClick: () => void syncPileToken(t.id),
    };
  }

  function handleTokenContextMenu(e: React.MouseEvent, t: Token) {
    const sel = useProjectStore.getState().selectedTokenIds ?? [];
    if (!sel.includes(t.id)) selectToken(t.id);

    const items: MenuEntry[] = t.pile
      ? [
          { label: "抽 1 张", onClick: () => void drawPile(t.id, 1) },
          { label: "抽 3 张", onClick: () => void drawPile(t.id, 3) },
          { label: "抽 5 张", onClick: () => void drawPile(t.id, 5) },
          { type: "divider" },
          { label: "洗牌", onClick: () => void shufflePileToken(t.id) },
          { label: "重置卡盒", onClick: () => void resetPileToken(t.id) },
          syncMenuEntry(t),
          { type: "divider" },
          { label: "删除卡盒", danger: true, onClick: () => void deleteToken(t) },
        ]
      : [
          { label: "翻转", onClick: () => flipToken(t) },
          { label: "置顶", onClick: () => setTokenLayer(t, "front") },
          { label: "置底", onClick: () => setTokenLayer(t, "back") },
          { label: "复制", onClick: () => duplicateToken(t) },
          {
            label: "打开卡牌",
            disabled: !t.card_id,
            onClick: () => {
              if (t.card_id) {
                setActiveModule("world");
                selectCard(t.card_id);
              }
            },
          },
          { type: "divider" },
          { label: "删除", danger: true, onClick: () => void deleteToken(t) },
        ];
    ctx.open(e, items);
  }

  function handleBoardContextMenu(e: React.MouseEvent) {
    const items: MenuEntry[] = [
      { label: "添加占位", onClick: () => void addPlaceholder() },
      { label: "添加卡牌…", onClick: () => setCardPickerOpen(true) },
      { label: "从卡组导入…", onClick: () => setAddFromGroupOpen(true) },
      { label: "创建卡盒…", onClick: () => setAddPileOpen(true) },
    ];
    ctx.open(e, items);
  }


  useEffect(() => {
    setZoom(1);
  }, [normalized.id]);

  useEffect(() => {
    setCurrentBoard(normalized.id);
    return () => {
      setCurrentBoard(null);
    };
  }, [normalized.id, setCurrentBoard]);

  function commitName() {
    if (name !== normalized.name) {
      savePatch({ name }, "重命名棋盘");
    }
  }

  async function openBgPicker() {
    await runWithError(async () => {
      const images = await ipc.listImages();
      if (images.length === 0) {
        const proceed = await confirmDialog({
          message: "项目里还没有图片。要现在导入一张吗？",
          confirmLabel: "导入",
        });
        if (proceed) {
          const src = await openDialog({
            multiple: false,
            filters: [
              {
                name: "图片",
                extensions: ["png", "jpg", "jpeg", "gif", "webp"],
              },
            ],
          });
          if (src && !Array.isArray(src)) {
            const relative = await ipc.importImage(src);
            invalidateAsset(relative);
            await savePatch({ background: relative }, "设置棋盘背景");
          }
        }
        return;
      }
      setImageOptions(
        images.map((p) => ({
          value: p,
          label: p.replace("assets/images/", ""),
        })),
      );
      setBgPickerOpen(true);
    }, "读取图片列表失败");
  }

  async function clearBackground() {
    await savePatch({ background: null }, "清除棋盘背景");
  }

  const grid = normalized.grid;

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        padding: 12,
        gap: 8,
      }}
    >
      {/*
        回放是只读模态：工具栏里全是会改棋盘的入口，留着会让人以为能边看边改
        （点了也看不到结果 —— 画布区已经被回放视图顶掉了）。所以整个隐掉，
        回放条自带退出按钮。
      */}
      {!replayMode && (
      <BoardToolbar
        name={name}
        setName={setName}
        onCommitName={commitName}
        grid={grid}
        onToggleGrid={(v) =>
          savePatch({ grid: { ...grid, visible: v } }, "切换网格")
        }
        onToggleSnap={(v) =>
          savePatch({ grid: { ...grid, snap: v } }, "切换吸附")
        }
        onGridSizeChange={(s) =>
          savePatch({ grid: { ...grid, size: s } }, "修改格大小")
        }
        onGridOffsetChange={(x, y) =>
          savePatch({ grid: { ...grid, offset_x: x, offset_y: y } }, "修改网格偏移")
        }
        width={normalized.width}
        height={normalized.height}
        onWidthChange={(w) => savePatch({ width: w }, "修改棋盘宽度")}
        onHeightChange={(h) => savePatch({ height: h }, "修改棋盘高度")}
        hasBackground={Boolean(normalized.background)}
        onOpenBgPicker={openBgPicker}
        onClearBackground={clearBackground}
        onOpenAddFromGroup={() => setAddFromGroupOpen(true)}
        onOpenAddPile={() => setAddPileOpen(true)}
        onOpenCardPicker={() => setCardPickerOpen(true)}
        onAddPlaceholder={() => void addPlaceholder()}
        zoom={zoom}
        onZoomChange={setZoom}
        showRelations={normalized.show_relations ?? false}
        onToggleRelations={(v) =>
          savePatch({ show_relations: v }, "切换关系显示")
        }
        onOpenRelationFilter={() => setRelationFilterOpen(true)}
        relationFilterCount={(normalized.visible_relation_kinds ?? []).length}
        onShapeChange={(shape) =>
          savePatch({ grid: { ...grid, shape } }, "修改网格形状")
        }
        measureMode={measureMode}
        onToggleMeasure={setMeasureMode}
        historyMode={historyMode}
        onToggleHistory={setHistoryMode}
        replayMode={replayMode}
        onToggleReplay={(v) => {
          setReplayMode(v);
          // 回放是只读模态，进来就顺带打开历史面板，好对照每一步的摘要
          if (v) setHistoryMode(true);
        }}
        canReplay={boardEvents.length > 0}
      />
      )}

      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
          overflow: "hidden",
          background: "var(--bg-app)",
        }}
      >
        {replayMode ? (
          <BoardReplayView
            board={normalized}
            events={boardEvents}
            onExit={() => setReplayMode(false)}
          />
        ) : (
          <BoardCanvas
            board={normalized}
            zoom={zoom}
            onZoomChange={setZoom}
            measureMode={measureMode}
            onPileClick={(id) => setPileDrawTokenId(id)}
            onTokenContextMenu={handleTokenContextMenu}
            onBoardContextMenu={handleBoardContextMenu}
            onChange={handleCanvasChange}
          />
        )}

        {historyMode && (
          <BoardHistoryPanel
            events={boardEvents}
            onDelete={(seq) => void deleteBoardEvent(seq)}
            onClose={() => setHistoryMode(false)}
          />
        )}
      </div>

      <BoardDialogs
        bgPickerOpen={bgPickerOpen}
        imageOptions={imageOptions}
        onCloseBg={() => setBgPickerOpen(false)}
        onPickBg={(v) => savePatch({ background: v || null }, "设置棋盘背景")}
        addFromGroupOpen={addFromGroupOpen}
        onCloseAddFromGroup={() => setAddFromGroupOpen(false)}
        onImportFromGroup={(group, shuffleOn) => {
          void importFromGroup(group, shuffleOn);
        }}
        addPileOpen={addPileOpen}
        cardGroups={cardGroups}
        onCloseAddPile={() => setAddPileOpen(false)}
        onPickPileGroup={(id) => {
          const g = cardGroups.find((x) => x.id === id);
          if (g) void addPile(g);
        }}
        pileDrawTokenId={pileDrawTokenId}
        tokens={normalized.tokens}
        onClosePileDraw={() => setPileDrawTokenId(null)}
        onDrawPile={(n) => {
          if (pileDrawTokenId) void drawPile(pileDrawTokenId, n);
        }}
        onShufflePile={() => {
          if (pileDrawTokenId) void shufflePileToken(pileDrawTokenId);
        }}
        onResetPile={() => {
          if (pileDrawTokenId) void resetPileToken(pileDrawTokenId);
        }}
        cardPickerOpen={cardPickerOpen}
        cards={cards}
        cardTypes={cardTypes}
        onCloseCardPicker={() => setCardPickerOpen(false)}
        onPickCards={(ids) => {
          void addCardsToBoard(ids);
          setCardPickerOpen(false);
        }}
      />

      {relationFilterOpen && (
        <RelationFilterDialog
          relationKinds={relationKinds}
          selected={normalized.visible_relation_kinds ?? []}
          onChange={(kinds) =>
            savePatch({ visible_relation_kinds: kinds }, "修改关系过滤")
          }
          onClose={() => setRelationFilterOpen(false)}
        />
      )}

      <BoardBottomBar
        count={selectedTokenIds.length}
        onClear={clearTokenSelection}
        onDelete={() => {
          const ids = selectedTokenIds;
          if (ids.length === 0) return;
          void (async () => {
            const ok = await confirmDialog({
              message: `删除选中的 ${ids.length} 个 Token？可用 Ctrl+Z 撤销。`,
              confirmLabel: "删除",
              danger: true,
            });
            if (!ok) return;
            await deleteSelectedTokens(ids);
            clearTokenSelection();
          })();
        }}
        onFlip={() => flipTokens(selectedTokenIds)}
        onBringToFront={() => setTokensLayer(selectedTokenIds, "front")}
        onSendToBack={() => setTokensLayer(selectedTokenIds, "back")}
        onConnect={
          connectableCards ? () => setConnectOpen(true) : undefined
        }
      />

      {ctx.node}

      {connectOpen && (
        <PickerDialog
          title="选择关系类型"
          options={relationKinds.map((k) => ({ value: k.id, label: k.name }))}
          onPick={(id) => void createRelation(id)}
          onClose={() => setConnectOpen(false)}
        />
      )}
    </div>
  );
}
