import { useProjectStore } from "../../../stores/projectStore";
import type { Card, Scenario } from "../../../core/ipc";
import { usePlayState } from "./usePlayState";
import { VariablePanel } from "./VariablePanel";
import { SceneCard } from "./SceneCard";
import { BranchList } from "./BranchList";

interface Props {
  scenario: Scenario;
}

export function PlayView({ scenario }: Props) {
  const cards = useProjectStore((s) => s.cards) ?? [];
  const relations = useProjectStore((s) => s.relations) ?? [];
  const relationKinds = useProjectStore((s) => s.relationKinds) ?? [];
  const currentSessionId = useProjectStore((s) => s.currentSessionId);

  const {
    values,
    setValue,
    currentId,
    history,
    edgeStates,
    lastRolls,
    outgoing,
    advance,
    back,
    reset,
    resetVars,
  } = usePlayState(scenario, cards, relations, currentSessionId);

  const currentCard: Card | null = currentId
    ? (cards.find((c) => c.id === currentId) ?? null)
    : null;

  if (!currentId || !currentCard) {
    return (
      <div
        style={{
          padding: 24,
          color: "var(--fg-muted)",
          fontSize: 13,
        }}
      >
        该剧情没有入口节点。去「设置」里指定。
      </div>
    );
  }

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
      <VariablePanel
        scenario={scenario}
        values={values}
        onChangeValue={setValue}
        onResetVars={resetVars}
        history={history}
        cards={cards}
      />

      <div
        style={{
          flex: 1,
          minWidth: 0,
          padding: 16,
          overflow: "auto",
        }}
      >
        <SceneCard card={currentCard} cards={cards} lastRolls={lastRolls} />

        <div style={{ marginBottom: 12, display: "flex", gap: 8 }}>
          <button
            className="btn"
            onClick={back}
            disabled={history.length === 0}
          >
            回退
          </button>
          <button className="btn" onClick={reset}>
            重置
          </button>
        </div>

        <BranchList
          outgoing={outgoing}
          edgeStates={edgeStates}
          cards={cards}
          relationKinds={relationKinds}
          onAdvance={advance}
        />
      </div>
    </div>
  );
}
