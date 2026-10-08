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
    drawFromPile,
    shufflePile,
    resetPile,
    deleteSelectedTokens,
  } = useBoardActions({ board: normalized, upsertBoard, pushUndo });

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
    try {
      const images = await ipc.listImages();
      if (images.length === 0) {
        const proceed = confirm("项目里还没有图片。要现在导入一张吗？");
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
    } catch (e) {
      alert("读取图片列表失败: " + e);
    }
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

      <BoardBottomBar
        count={selectedTokenIds.length}
        onClear={clearTokenSelection}
        onDelete={() => {
          const ids = selectedTokenIds;
          if (ids.length === 0) return;
          if (!confirm(`删除选中的 ${ids.length} 个 Token？可用 Ctrl+Z 撤销。`))
            return;
          void deleteSelectedTokens(ids).then(() => clearTokenSelection());
        }}
      />
    </div>
  );
}
