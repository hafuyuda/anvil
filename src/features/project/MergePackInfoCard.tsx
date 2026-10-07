import type { PackInspection } from "../../core/ipc";

export function MergePackInfoCard({
  inspection,
}: {
  inspection: PackInspection;
}) {
  return (
    <div
      style={{
        padding: 10,
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-md)",
        fontSize: 12,
      }}
    >
      <div
        style={{
          fontSize: 14,
          fontFamily: "var(--font-title)",
          fontWeight: 600,
          color: "var(--accent-gold)",
          marginBottom: 4,
        }}
      >
        {inspection.manifest.name}
      </div>
      <div style={{ color: "var(--fg-secondary)" }}>
        {inspection.total_cards} 张卡 · {inspection.total_relations} 条关系 ·{" "}
        {inspection.card_types.length} 个类型
      </div>
      {inspection.manifest.author && (
        <div style={{ color: "var(--fg-muted)", marginTop: 2 }}>
          作者：{inspection.manifest.author}
        </div>
      )}
    </div>
  );
}