import { useEffect, useState } from "react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { ipc } from "../../core/ipc";
import { useProjectStore } from "../../stores/projectStore";
import { loadImage, invalidateImage } from "../../lib/imageCache";
import { useSyncExternalStore } from "react";
import { subscribeImageCache, getCachedImage } from "../../lib/imageCache";
import { toast } from "../../lib/toast";
import { confirmDialog } from "../../lib/confirm";

function basename(p: string): string {
  const parts = p.split("/");
  return parts[parts.length - 1] ?? p;
}

export function AssetsTab() {
  const cards = useProjectStore((s) => s.cards) ?? [];
  const cardTypes = useProjectStore((s) => s.cardTypes) ?? [];

  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [unused, setUnused] = useState<string[] | null>(null);
  const [checking, setChecking] = useState(false);

  async function refresh() {
    try {
      const list = await ipc.listImages();
      setImages(list);
    } catch {
      setImages([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  // 统计每张图被多少张卡引用
  const usageMap = buildUsageMap(cards, cardTypes);

  async function handleImport() {
    const src = await openDialog({
      multiple: false,
      filters: [
        {
          name: "图片",
          extensions: ["png", "jpg", "jpeg", "gif", "webp", "svg"],
        },
      ],
      title: "导入图片",
    });
    if (!src || Array.isArray(src)) return;
    try {
      const relative = await ipc.importImage(src);
      invalidateImage(relative);
      await refresh();
    } catch (e) {
      toast.error("导入失败: " + e);
    }
  }

  async function handleDelete(relative: string) {
    const count = usageMap.get(relative) ?? 0;
    if (count > 0) {
      if (
        !(await confirmDialog({
          message: `这张图被 ${count} 张卡引用。删除后那些卡会显示空白。继续？`,
          confirmLabel: "删除",
          danger: true,
        }))
      )
        return;
    } else {
      if (
        !(await confirmDialog({
          message: `删除 ${basename(relative)}？`,
          confirmLabel: "删除",
          danger: true,
        }))
      )
        return;
    }
    try {
      await ipc.deleteImage(relative);
      invalidateImage(relative);
      await refresh();
    } catch (e) {
      toast.error("删除失败: " + e);
    }
  }

  async function handleCheckUnused() {
    setChecking(true);
    try {
      const list = await ipc.listUnusedImages();
      setUnused(list);
      if (list.length === 0) {
        toast.info("没有未引用的图片。");
      }
    } catch (e) {
      toast.error("扫描失败: " + e);
    } finally {
      setChecking(false);
    }
  }

  async function handleCleanup() {
    if (!unused || unused.length === 0) return;
    if (
      !(await confirmDialog({
        message: `删除 ${unused.length} 张未引用的图片？`,
        confirmLabel: "删除",
        danger: true,
      }))
    )
      return;
    try {
      const deleted = await ipc.cleanupUnusedImages();
      for (const p of deleted) invalidateImage(p);
      setUnused(null);
      await refresh();
      toast.success(`已删除 ${deleted.length} 张图片。`);
    } catch (e) {
      toast.error("清理失败: " + e);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontSize: 12,
            color: "var(--fg-secondary)",
            marginRight: "auto",
          }}
        >
          共 {images.length} 张图片
        </span>
        <button className="btn" onClick={handleImport}>
          导入图片
        </button>
        <button className="btn" onClick={handleCheckUnused} disabled={checking}>
          {checking ? "扫描中…" : "扫描未引用"}
        </button>
        {unused && unused.length > 0 && (
          <button className="btn btn-danger" onClick={handleCleanup}>
            清理 {unused.length} 张
          </button>
        )}
      </div>

      {loading && (
        <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>加载中…</div>
      )}

      {!loading && images.length === 0 && (
        <div
          style={{
            padding: 24,
            textAlign: "center",
            color: "var(--fg-muted)",
            fontSize: 12,
            border: "1px dashed var(--border-default)",
            borderRadius: "var(--radius-md)",
          }}
        >
          还没有图片。点「导入图片」开始。
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: 10,
        }}
      >
        {images.map((p) => (
          <AssetCell
            key={p}
            path={p}
            usage={usageMap.get(p) ?? 0}
            isUnused={unused?.includes(p) ?? false}
            onDelete={() => handleDelete(p)}
          />
        ))}
      </div>
    </div>
  );
}

function AssetCell({
  path,
  usage,
  isUnused,
  onDelete,
}: {
  path: string;
  usage: number;
  isUnused: boolean;
  onDelete: () => void;
}) {
  const url = useSyncExternalStore(
    subscribeImageCache,
    () => getCachedImage(path),
    () => null,
  );

  useEffect(() => {
    if (!url) {
      void loadImage(path).catch(() => {});
    }
  }, [path, url]);

  return (
    <div
      style={{
        position: "relative",
        border: `1px solid ${
          isUnused ? "var(--warning)" : "var(--border-subtle)"
        }`,
        borderRadius: "var(--radius-md)",
        background: "var(--bg-surface)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          height: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg-panel)",
          overflow: "hidden",
        }}
      >
        {url ? (
          <img
            src={url}
            alt=""
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
              display: "block",
            }}
          />
        ) : (
          <span style={{ fontSize: 10, color: "var(--fg-muted)" }}>
            加载中…
          </span>
        )}
      </div>
      <div
        style={{
          padding: "4px 6px",
          fontSize: 10,
          fontFamily: "var(--font-mono)",
          color: "var(--fg-muted)",
          wordBreak: "break-all",
          maxHeight: 32,
          overflow: "hidden",
        }}
        title={path}
      >
        {basename(path)}
      </div>
      <div
        style={{
          padding: "2px 6px 6px",
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 10,
        }}
      >
        <span
          style={{
            color: usage === 0 ? "var(--warning)" : "var(--fg-muted)",
            flex: 1,
          }}
        >
          {usage === 0 ? "未引用" : `${usage} 处引用`}
        </span>
        <button
          className="btn btn-ghost"
          onClick={onDelete}
          style={{
            padding: "1px 6px",
            fontSize: 11,
            color: "var(--danger)",
          }}
          title="删除"
        >
          ×
        </button>
      </div>
    </div>
  );
}

/** 建 path -> 引用次数 的映射 */
function buildUsageMap(
  cards: { type_id: string; values: Record<string, unknown> }[],
  cardTypes: { id: string; fields: { key: string; ty: { kind: string } }[] }[],
): Map<string, number> {
  const imageFields = new Map<string, string[]>();
  for (const ct of cardTypes) {
    const keys: string[] = [];
    for (const f of ct.fields) {
      if (f.ty.kind === "image") keys.push(f.key);
    }
    imageFields.set(ct.id, keys);
  }
  const map = new Map<string, number>();
  for (const c of cards) {
    const keys = imageFields.get(c.type_id);
    if (!keys) continue;
    for (const k of keys) {
      const v = c.values[k];
      if (typeof v === "string" && v.trim()) {
        map.set(v, (map.get(v) ?? 0) + 1);
      }
    }
  }
  return map;
}
