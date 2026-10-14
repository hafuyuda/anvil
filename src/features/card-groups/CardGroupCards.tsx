import type { Card, CardType } from "../../core/ipc";
import { getCardGroupView } from "./views/registry";

interface Props {
  cardIds: string[];
  cardById: Map<string, Card>;
  typeById: Map<string, CardType>;
  view: string;
  onReorder: (next: string[]) => void;
  onRemoveOne: (cardId: string) => void;
}

export function CardGroupCards({
  cardIds,
  cardById,
  typeById,
  view,
  onReorder,
  onRemoveOne,
}: Props) {
  if (cardIds.length === 0) {
    return (
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
        还没有卡牌。点「+ 添加卡牌」开始。
      </div>
    );
  }

  const def = getCardGroupView(view);
  const ViewComponent = def.Component;

  return (
    <ViewComponent
      cardIds={cardIds}
      cardById={cardById}
      typeById={typeById}
      onReorder={onReorder}
      onRemoveOne={onRemoveOne}
    />
  );
}
