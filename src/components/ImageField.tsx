import { useEffect, useState } from "react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { ipc } from "../core/ipc/ipc";

interface Props {
  value: string | null | undefined;
  onChange: (v: string | null) => void;
}

export function ImageField({ value, onChange }: Props) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!value) {
      setDataUrl(null);
      return;
    }
    let cancelled = false;
    ipc
      .readImageDataUrl(value)
      .then((u) => {
        if (cancelled) return;

        setDataUrl(u);
      })
      .catch((e) => {
        if (cancelled) return;
        setDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [value]);

  async function pick() {
    const src = await openDialog({
      multiple: false,
      filters: [
        {
          name: "图片",
          extensions: ["png", "jpg", "jpeg", "gif", "webp", "svg"],
        },
      ],
      title: "选择图片",
    });
    if (!src || Array.isArray(src)) return;

    try {
      const relative = await ipc.importImage(src);
      onChange(relative);
    } catch (e) {
      alert("导入图片失败: " + e);
    }
  }

  function clearRef() {
    if (!value) return;
    if (!confirm("移除该图片引用？文件保留在 assets/ 中。")) return;
    onChange(null);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", gap: 6 }}>
        <button className="btn" onClick={pick} style={{ fontSize: 11 }}>
          {value ? "更换图片" : "选择图片"}
        </button>
        {value && (
          <button
            className="btn btn-danger"
            onClick={clearRef}
            style={{ fontSize: 11 }}
          >
            移除引用
          </button>
        )}
      </div>

      {value && (
        <div
          style={{
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-md)",
            background: "var(--bg-surface)",
            padding: 6,
            maxWidth: 220,
          }}
        >
          {!dataUrl && (
            <div
              style={{
                fontSize: 11,
                color: "var(--fg-muted)",
                padding: 12,
                textAlign: "center",
              }}
            >
              加载中…
            </div>
          )}
          {dataUrl && (
            <img
              src={dataUrl}
              alt=""
              style={{
                maxWidth: "100%",
                maxHeight: 180,
                display: "block",
                margin: "0 auto",
                borderRadius: "var(--radius-sm)",
              }}
            />
          )}
          <div
            style={{
              fontSize: 10,
              color: "var(--fg-muted)",
              fontFamily: "var(--font-mono)",
              marginTop: 6,
              wordBreak: "break-all",
            }}
          >
            {value}
          </div>
        </div>
      )}
    </div>
  );
}
