import { useEffect, useState } from "react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { ipc, type Board, Token } from "../../core/ipc";
import { useProjectStore } from "../../stores/projectStore";
import { BoardCanvas } from "./BoardCanvas";
import { DEFAULT_GRID } from "./constants";
import { nowMs } from "../../lib/time";
import { PickerDialog } from "../../components/PickerDialog";
import { invalidateImage } from "../../lib/imageCache";
import { newId } from "../../lib/id";

interface Props {
  board: Board;
}

export function BoardEditor({ board }: Props) {
  const upsertBoard = useProjectStore((s) => s.upsertBoard);
  const setCurrentBoard = useProjectStore((s) => s.setCurrentBoard);
  const pushUndo = useProjectStore((s) => s.pushUndo);

  const [cardPickerOpen, setCardPickerOpen] = useState(false);

  const normalized: Board = {
    ...board,
    grid: board.grid ?? DEFAULT_GRID,
    tokens: board.tokens ?? [],
  };

  const [name, setName] = useState(normalized.name);
  const [bgPickerOpen, setBgPickerOpen] = useState(false);
  const [imageOptions, setImageOptions] = useState<
    { value: string; label: string }[]
  >([]);

  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    setZoom(1);
  }, [normalized.id]);

  useEffect(() => {
    setCurrentBoard(normalized.id);
    return () => {
      setCurrentBoard(null);
    };
  }, [normalized.id, setCurrentBoard]);

  async function persist(b: Board) {
    await ipc.upsertBoard(b);
    upsertBoard(b);
  }

  async function savePatch(patch: Partial<Board>, undoLabel?: string) {
    const before = normalized;
    const after: Board = {
      ...before,
      ...patch,
      updated_at: nowMs(),
    };
    try {
      await ipc.upsertBoard(after);
      upsertBoard(after);
      if (undoLabel) {
        pushUndo({
          id: `${Date.now()}-${newId().slice(2, 8)}`,
          label: undoLabel,
          undo: async () => {
            await persist(before);
          },
          redo: async () => {
            await persist(after);
          },
        });
      }
    } catch (e) {
      alert("保存失败: " + e);
    }
  }

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

  async function addCardToBoard(cardId: string) {
    const tokens = normalized.tokens ?? [];
    const count = tokens.length;
    const gx = 100 + (count % 8) * 180;
    const gy = 100 + Math.floor(count / 8) * 240;

    const newToken: Token = {
      id: Math.random().toString(36).slice(2) + Date.now().toString(36),
      card_id: cardId,
      name_override: null,
      value_overrides: {},
      x: gx,
      y: gy,
      w: 140,
      h: 205,
      rotation: 0,
      layer: count,
      visible: true,
    };

    const next: Board = {
      ...normalized,
      tokens: [...tokens, newToken],
      updated_at: Date.now(),
    };
    await ipc.upsertBoard(next);
    upsertBoard(next);
  }

  const cards = useProjectStore((s) => s.cards) ?? [];
  const cardTypes = useProjectStore((s) => s.cardTypes) ?? [];

  const selectedTokenIds = useProjectStore((s) => s.selectedTokenIds) ?? [];
  const clearTokenSelection = useProjectStore((s) => s.clearTokenSelection);

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
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          flexShrink: 0,
          flexWrap: "wrap",
        }}
      >
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          style={{
            flex: 1,
            minWidth: 160,
            fontWeight: 600,
            fontSize: 14,
            fontFamily: "var(--font-title)",
          }}
        />

        <Toggle
          label="显示网格"
          checked={grid.visible}
          onChange={(v) =>
            savePatch({ grid: { ...grid, visible: v } }, "切换网格")
          }
        />
        <Toggle
          label="吸附"
          checked={grid.snap}
          onChange={(v) =>
            savePatch({ grid: { ...grid, snap: v } }, "切换吸附")
          }
        />

        <label
          style={{
            fontSize: 12,
            display: "flex",
            gap: 6,
            alignItems: "center",
            color: "var(--fg-secondary)",
          }}
        >
          格大小
          <input
            className="input"
            type="number"
            value={grid.size}
            onChange={(e) =>
              savePatch(
                { grid: { ...grid, size: Number(e.target.value) || 10 } },
                "修改格大小",
              )
            }
            style={{ width: 64 }}
          />
        </label>
        <label
          style={{
            fontSize: 12,
            display: "flex",
            gap: 6,
            alignItems: "center",
            color: "var(--fg-secondary)",
          }}
        >
          宽
          <input
            className="input"
            type="number"
            value={normalized.width}
            onChange={(e) =>
              savePatch(
                { width: Number(e.target.value) || 1200 },
                "修改棋盘宽度",
              )
            }
            style={{ width: 72 }}
          />
        </label>
        <label
          style={{
            fontSize: 12,
            display: "flex",
            gap: 6,
            alignItems: "center",
            color: "var(--fg-secondary)",
          }}
        >
          高
          <input
            className="input"
            type="number"
            value={normalized.height}
            onChange={(e) =>
              savePatch(
                { height: Number(e.target.value) || 800 },
                "修改棋盘高度",
              )
            }
            style={{ width: 72 }}
          />
        </label>
        <button className="btn" onClick={openBgPicker} style={{ fontSize: 12 }}>
          {normalized.background ? "更换背景" : "设置背景"}
        </button>
        <button
          className="btn btn-primary"
          onClick={() => setCardPickerOpen(true)}
          style={{ fontSize: 12 }}
        >
          + 添加卡片
        </button>
        {normalized.background && (
          <button
            className="btn"
            onClick={clearBackground}
            style={{ fontSize: 12 }}
          >
            清除背景
          </button>
        )}
        <div
          style={{
            display: "flex",
            gap: 2,
            alignItems: "center",
            marginLeft: "auto",
          }}
        >
          <button
            className="btn btn-icon"
            onClick={() => setZoom((z) => Math.max(0.25, z / 1.2))}
            title="缩小"
          >
            −
          </button>
          <span
            style={{
              minWidth: 48,
              textAlign: "center",
              fontSize: 12,
              fontFamily: "var(--font-mono)",
              color: "var(--fg-secondary)",
            }}
          >
            {Math.round(zoom * 100)}%
          </span>
          <button
            className="btn btn-icon"
            onClick={() => setZoom((z) => Math.min(4, z * 1.2))}
            title="放大"
          >
            +
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => setZoom(1)}
            style={{ fontSize: 11, padding: "2px 6px" }}
            title="重置为 100%"
          >
            100%
          </button>
        </div>
      </div>

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
          onChange={(patch) => {
            if (patch.tokens) {
              savePatch({ tokens: patch.tokens }, "移动 Token");
            } else {
              savePatch(patch);
            }
          }}
        />
      </div>

      {bgPickerOpen && (
        <PickerDialog
          title="选择背景图"
          options={[{ value: "", label: "— 无背景 —" }, ...imageOptions]}
          onPick={(v) => savePatch({ background: v || null }, "设置棋盘背景")}
          onClose={() => setBgPickerOpen(false)}
        />
      )}

      {cardPickerOpen && (
        <PickerDialog
          title="添加卡片到棋盘"
          options={cards.map((c) => ({
            value: c.id,
            label: `${c.name} · ${cardTypes.find((t) => t.id === c.type_id)?.name ?? "?"}`,
          }))}
          onPick={(id) => {
            void addCardToBoard(id);
          }}
          onClose={() => setCardPickerOpen(false)}
        />
      )}

      {selectedTokenIds.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: 6,
            alignItems: "center",
            padding: "4px 8px",
            background: "var(--bg-raised)",
            borderRadius: "var(--radius-md)",
            marginLeft: "auto",
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: "var(--accent-gold)",
              fontWeight: 600,
            }}
          >
            已选 {selectedTokenIds.length}
          </span>
          <button
            className="btn"
            onClick={clearTokenSelection}
            style={{ fontSize: 11, padding: "2px 8px" }}
          >
            取消
          </button>
          <button
            className="btn btn-danger"
            onClick={async () => {
              if (!confirm(`删除选中的 ${selectedTokenIds.length} 个 Token？`))
                return;
              const next: Board = {
                ...normalized,
                tokens: normalized.tokens.filter(
                  (t) => !selectedTokenIds.includes(t.id),
                ),
                updated_at: nowMs(),
              };
              await ipc.upsertBoard(next);
              upsertBoard(next);
              clearTokenSelection();
            }}
            style={{ fontSize: 11, padding: "2px 8px" }}
          >
            删除
          </button>
        </div>
      )}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      style={{
        fontSize: 12,
        display: "flex",
        gap: 4,
        alignItems: "center",
        color: "var(--fg-secondary)",
        cursor: "pointer",
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ accentColor: "var(--accent-gold)" }}
      />
      {label}
    </label>
  );
}
