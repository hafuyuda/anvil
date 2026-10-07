import { useEffect, useState } from "react";
import { useProjectStore } from "../../../stores/projectStore";
import { ScaledCardFrame } from "../../../components/ScaledCardFrame";
import type { CardType } from "../../../core/ipc";

interface Props {
  cardType: CardType;
}

export function CardTypePreview({ cardType }: Props) {
  const cards = useProjectStore((s) => s.cards) ?? [];
  const sampleCards = cards.filter((c) => c.type_id === cardType.id);

  const [sampleId, setSampleId] = useState<string | null>(
    sampleCards[0]?.id ?? null,
  );

  useEffect(() => {
    setSampleId(sampleCards[0]?.id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardType.id]);

  const sample =
    sampleCards.find((c) => c.id === sampleId) ?? sampleCards[0] ?? null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div
        style={{
          fontSize: 10,
          color: "var(--fg-muted)",
          textTransform: "uppercase",
          letterSpacing: 1,
        }}
      >
        卡框预览
      </div>

      {!sample ? (
        <div
          style={{
            padding: 16,
            border: "1px dashed var(--border-default)",
            borderRadius: "var(--radius-md)",
            color: "var(--fg-muted)",
            fontSize: 12,
            textAlign: "center",
            lineHeight: 1.6,
          }}
        >
          该类型还没有卡
          <br />
          新建一张卡后这里会显示预览
        </div>
      ) : (
        <>
          {sampleCards.length > 1 && (
            <select
              className="select"
              value={sampleId ?? ""}
              onChange={(e) => setSampleId(e.target.value)}
              style={{ fontSize: 12 }}
            >
              {sampleCards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}

          <ScaledCardFrame card={sample} cardType={cardType} foil={true} />
        </>
      )}

      <div
        style={{
          fontSize: 11,
          color: "var(--fg-muted)",
          textAlign: "center",
        }}
      >
        共 {sampleCards.length} 张卡
      </div>
    </div>
  );
}
