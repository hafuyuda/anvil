import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { CropRect } from "../../../core/ipc";
import { useImageUrl } from "../../../hooks/useImageUrl";

interface Props {
  value: CropRect | null;
  onChange: (crop: CropRect | null) => void;
  imagePath: string | null | undefined;
}

const MIN_SIZE = 0.05;
const CONTAINER_HEIGHT = 220;
const DEFAULT_CROP: CropRect = { x: 0, y: 0, w: 1, h: 1 };

type DragMode =
  "move" | "top" | "bottom" | "left" | "right" | "tl" | "tr" | "bl" | "br";

interface DragState {
  mode: DragMode;
  startX: number;
  startY: number;
  startCrop: CropRect;
  displayW: number;
  displayH: number;
}

export function CropEditor({ value, onChange, imagePath }: Props) {
  const url = useImageUrl(imagePath);
  const imgRef = useRef<HTMLImageElement>(null);
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);
  const [containerW, setContainerW] = useState(0);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [local, setLocal] = useState<CropRect | null>(value);

  const dragRef = useRef<DragState | null>(null);
  const localRef = useRef(local);
  localRef.current = local;

  // 外部 value 变化时同步（无拖拽时）
  useEffect(() => {
    if (!dragRef.current) setLocal(value);
  }, [value]);

  // 容器尺寸监听（callback ref，处理动态渲染）
  useEffect(() => {
    if (!containerEl) return;
    const update = () => setContainerW(containerEl.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(containerEl);
    return () => ro.disconnect();
  }, [containerEl]);

  // 图片尺寸检测（data URL 命中缓存时 onLoad 不触发，主动轮询）
  useEffect(() => {
    setNatural(null);
  }, [url]);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    let raf = 0;

    function tick() {
      if (cancelled) return;
      const el = imgRef.current;
      if (el && el.complete && el.naturalWidth > 0) {
        setNatural({ w: el.naturalWidth, h: el.naturalHeight });
        return;
      }
      raf = requestAnimationFrame(tick);
    }

    tick();
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [url]);

  // 全局 pointer 监听（拖拽时）
  useEffect(() => {
    function onMove(e: PointerEvent) {
      const d = dragRef.current;
      if (!d) return;
      const dx = (e.clientX - d.startX) / d.displayW;
      const dy = (e.clientY - d.startY) / d.displayH;
      const s = d.startCrop;
      let { x, y, w, h } = s;

      const m = d.mode;
      if (m === "move") {
        x = Math.max(0, Math.min(1 - s.w, s.x + dx));
        y = Math.max(0, Math.min(1 - s.h, s.y + dy));
      } else {
        if (m === "left" || m === "tl" || m === "bl") {
          const nx = Math.max(0, Math.min(s.x + s.w - MIN_SIZE, s.x + dx));
          x = nx;
          w = s.x + s.w - nx;
        }
        if (m === "right" || m === "tr" || m === "br") {
          w = Math.max(MIN_SIZE, Math.min(1 - s.x, s.w + dx));
        }
        if (m === "top" || m === "tl" || m === "tr") {
          const ny = Math.max(0, Math.min(s.y + s.h - MIN_SIZE, s.y + dy));
          y = ny;
          h = s.y + s.h - ny;
        }
        if (m === "bottom" || m === "bl" || m === "br") {
          h = Math.max(MIN_SIZE, Math.min(1 - s.y, s.h + dy));
        }
      }
      setLocal({ x, y, w, h });
    }
    function onUp() {
      if (!dragRef.current) return;
      dragRef.current = null;
      const l = localRef.current;
      if (l) onChange(l);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [onChange]);

  // 无图片
  if (!imagePath) {
    return (
      <div
        style={{
          fontSize: 11,
          color: "var(--fg-muted)",
          padding: 10,
          background: "var(--bg-surface)",
          border: "1px dashed var(--border-default)",
          borderRadius: "var(--radius-md)",
          lineHeight: 1.6,
        }}
      >
        该类型暂无可预览的图片。先给一张卡配图，再回来调裁剪。
      </div>
    );
  }

  if (!url) {
    return (
      <div
        style={{
          fontSize: 11,
          color: "var(--fg-muted)",
          padding: 10,
          textAlign: "center",
        }}
      >
        图片加载中…
      </div>
    );
  }

  // 计算图片在容器内的显示区域
  let displayW = 0;
  let displayH = 0;
  let offsetX = 0;
  let offsetY = 0;
  if (natural && containerW > 0) {
    const scale = Math.min(
      containerW / natural.w,
      CONTAINER_HEIGHT / natural.h,
    );
    displayW = natural.w * scale;
    displayH = natural.h * scale;
    offsetX = (containerW - displayW) / 2;
    offsetY = (CONTAINER_HEIGHT - displayH) / 2;
  }

  const crop = local ?? DEFAULT_CROP;
  const boxLeft = offsetX + crop.x * displayW;
  const boxTop = offsetY + crop.y * displayH;
  const boxW = crop.w * displayW;
  const boxH = crop.h * displayH;

  const isFull = crop.x === 0 && crop.y === 0 && crop.w === 1 && crop.h === 1;

  function startDrag(e: React.PointerEvent, mode: DragMode) {
    e.preventDefault();
    e.stopPropagation();
    if (!displayW || !displayH) return;
    dragRef.current = {
      mode,
      startX: e.clientX,
      startY: e.clientY,
      startCrop: crop,
      displayW,
      displayH,
    };
  }

  function reset() {
    setLocal(null);
    onChange(null);
  }

  return (
    <div>
      <div
        ref={setContainerEl}
        style={{
          position: "relative",
          width: "100%",
          height: CONTAINER_HEIGHT,
          background: "var(--bg-app)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-md)",
          overflow: "hidden",
          userSelect: "none",
          touchAction: "none",
        }}
      >
        <img
          ref={imgRef}
          src={url}
          alt=""
          draggable={false}
          onLoad={(e) => {
            const img = e.currentTarget;
            setNatural({ w: img.naturalWidth, h: img.naturalHeight });
          }}
          style={{
            position: "absolute",
            left: offsetX,
            top: offsetY,
            width: displayW || "auto",
            height: displayH || "auto",
            pointerEvents: "none",
            userSelect: "none",
          }}
        />

        {natural && displayW > 0 && (
          <div
            onPointerDown={(e) => startDrag(e, "move")}
            style={{
              position: "absolute",
              left: boxLeft,
              top: boxTop,
              width: boxW,
              height: boxH,
              border: "2px solid var(--accent-gold)",
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
              boxSizing: "border-box",
              cursor: "move",
            }}
          >
            <CropHandle pos="tl" onDown={(e) => startDrag(e, "tl")} />
            <CropHandle pos="tr" onDown={(e) => startDrag(e, "tr")} />
            <CropHandle pos="bl" onDown={(e) => startDrag(e, "bl")} />
            <CropHandle pos="br" onDown={(e) => startDrag(e, "br")} />
            <CropHandle pos="t" onDown={(e) => startDrag(e, "top")} />
            <CropHandle pos="b" onDown={(e) => startDrag(e, "bottom")} />
            <CropHandle pos="l" onDown={(e) => startDrag(e, "left")} />
            <CropHandle pos="r" onDown={(e) => startDrag(e, "right")} />
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          gap: 6,
          alignItems: "center",
          marginTop: 6,
        }}
      >
        <span
          style={{
            fontSize: 11,
            color: "var(--fg-muted)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {isFull
            ? "整图"
            : `x ${Math.round(crop.x * 100)}% · y ${Math.round(crop.y * 100)}% · ${Math.round(crop.w * 100)}% × ${Math.round(crop.h * 100)}%`}
        </span>
        <button
          className="btn btn-ghost"
          onClick={reset}
          disabled={isFull}
          style={{ fontSize: 11, padding: "1px 8px", marginLeft: "auto" }}
        >
          重置
        </button>
      </div>
    </div>
  );
}

type HandlePos = "tl" | "tr" | "bl" | "br" | "t" | "b" | "l" | "r";

function CropHandle({
  pos,
  onDown,
}: {
  pos: HandlePos;
  onDown: (e: React.PointerEvent) => void;
}) {
  const size = 12;
  const half = size / 2;
  const positions: Record<HandlePos, CSSProperties> = {
    tl: { left: -half, top: -half, cursor: "nwse-resize" },
    tr: { right: -half, top: -half, cursor: "nesw-resize" },
    bl: { left: -half, bottom: -half, cursor: "nesw-resize" },
    br: { right: -half, bottom: -half, cursor: "nwse-resize" },
    t: { left: "50%", top: -half, marginLeft: -half, cursor: "ns-resize" },
    b: { left: "50%", bottom: -half, marginLeft: -half, cursor: "ns-resize" },
    l: { left: -half, top: "50%", marginTop: -half, cursor: "ew-resize" },
    r: { right: -half, top: "50%", marginTop: -half, cursor: "ew-resize" },
  };
  return (
    <div
      onPointerDown={onDown}
      style={{
        position: "absolute",
        width: size,
        height: size,
        background: "var(--accent-gold)",
        border: "2px solid #fff",
        borderRadius: 2,
        boxSizing: "border-box",
        ...positions[pos],
      }}
    />
  );
}
