import { useState } from "react";
import { AssetsTab } from "../project/AssetsTab";
import { AudioTab } from "../project/AudioTab";

type Segment = "images" | "audio";

export function ProjectResourcesPanel() {
  const [segment, setSegment] = useState<Segment>("images");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        style={{
          display: "flex",
          gap: 2,
          borderBottom: "1px solid var(--border-subtle)",
          paddingBottom: 4,
        }}
      >
        <SegButton active={segment === "images"} onClick={() => setSegment("images")}>
          图片
        </SegButton>
        <SegButton active={segment === "audio"} onClick={() => setSegment("audio")}>
          音频
        </SegButton>
      </div>

      {segment === "images" && <AssetsTab />}
      {segment === "audio" && <AudioTab />}
    </div>
  );
}

function SegButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className="btn btn-ghost"
      onClick={onClick}
      style={{
        fontWeight: active ? 600 : 400,
        color: active ? "var(--fg-primary)" : "var(--fg-secondary)",
        borderBottom: active
          ? "2px solid var(--accent-gold)"
          : "2px solid transparent",
        borderRadius: 0,
        padding: "4px 12px",
      }}
    >
      {children}
    </button>
  );
}