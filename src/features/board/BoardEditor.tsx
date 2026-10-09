import { useEffect, useState } from "react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { ipc, type Board } from "../../core/ipc";
import { useProjectStore } from "../../stores/projectStore";
import { DEFAULT_GRID } from "./constants";
import { invalidateImage } from "../../lib/imageCache";
import { BoardToolbar } from "./BoardToolbar";
import { BoardCanvas } from "./BoardCanvas";
import { BoardDialogs } from "./BoardDialogs";
import { BoardBottomBar } from "./BoardBottomBar";
import { useBoardActions } from "./useBoardActions";
import { RelationFilterDialog } from "./RelationFilterDialog";
import { usePileActions } from "./usePileActions";
import { confirmDialog } from "../../lib/confirm";
import { runWithError } from "../../lib/runWithError";

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

  const normalized: Board = {
    ...board,
    grid: board.grid ?? DEFAULT_GRID,
    tokens: board.tokens ?? [],
  };

  const {
    savePatch,
    addCardToBoard,
    addPlaceholder,
    importFromGroup,
    addPile,
    deleteSelectedTokens,
  } = useBoardActions({ board: normalized, upsertBoard, pushUndo });

  const { drawFromPile, shufflePile, resetPile } = usePileActions({
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
            invalidateImage(relative);
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

  const relationKinds = useProjectStore((s) => s.relationKinds) ?? [];

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
      />

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
        <BoardCanvas
          board={normalized}
          zoom={zoom}
          onZoomChange={setZoom}
          onPileClick={(id) => setPileDrawTokenId(id)}
          onChange={(patch) => {
            if (patch.tokens) {
              savePatch({ tokens: patch.tokens }, "移动 Token");
            } else {
              savePatch(patch);
            }
          }}
        />
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
          if (pileDrawTokenId) void drawFromPile(pileDrawTokenId, n);
        }}
        onShufflePile={() => {
          if (pileDrawTokenId) void shufflePile(pileDrawTokenId);
        }}
        onResetPile={() => {
          if (pileDrawTokenId) void resetPile(pileDrawTokenId);
        }}
        cardPickerOpen={cardPickerOpen}
        cards={cards}
        cardTypes={cardTypes}
        onCloseCardPicker={() => setCardPickerOpen(false)}
        onPickCard={(id) => void addCardToBoard(id)}
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
      />
    </div>
  );
}
