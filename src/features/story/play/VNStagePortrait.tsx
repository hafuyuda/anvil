import { useEffect, useState } from "react";
import type { Card } from "../../../core/ipc";
import { loadImage } from "../../../lib/imageCache";
import type { ScriptLine } from "../script/types";

export function VNStagePortrait({
  line,
  cards,
}: {
  line: ScriptLine;
  cards: Card[];
}) {
  // 只有 say 行且指定了说话人有立绘
  if (line.type !== "say") return null;

  const speaker = line.speaker;
  const portrait = line.portrait;
  if (!portrait) return null;

  // 找卡
  const card = cards.find((c) => c.name === speaker);
  if (!card) return null;

  // 找 portrait_<表情> 字段
  const key = `portrait_${portrait}`;
  const value = card.values[key];
  if (typeof value !== "string" || !value.trim()) return null;

  return <PortraitImage path={value} />;
}

function PortraitImage({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadImage(path)
      .then((u) => {
        if (!cancelled) setUrl(u);
      })
      .catch(() => {
        if (!cancelled) setUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  if (!url) return null;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 180,
        left: "50%",
        transform: "translateX(-50%)",
        maxHeight: "60%",
        maxWidth: "60%",
        zIndex: 2,
        pointerEvents: "none",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <img
        src={url}
        alt=""
        draggable={false}
        style={{
          maxHeight: "100%",
          maxWidth: "100%",
          display: "block",
          userSelect: "none",
          filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.6))",
        }}
      />
    </div>
  );
}
