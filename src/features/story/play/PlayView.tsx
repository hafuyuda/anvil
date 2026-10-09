import { useState } from "react";
import { useProjectStore } from "../../../stores/projectStore";
import type { Card, Scenario } from "../../../core/ipc";
import { usePlayState } from "./usePlayState";
import { VariablePanel } from "./VariablePanel";
import { VNStage } from "./VNStage";
import { useSceneAudio } from "./useSceneAudio";

interface Props {
  scenario: Scenario;
}

export function PlayView({ scenario }: Props) {
  const cards = useProjectStore((s) => s.cards) ?? [];
  const relations = useProjectStore((s) => s.relations) ?? [];
  const relationKinds = useProjectStore((s) => s.relationKinds) ?? [];

  const {
    values,
    setValue,
    currentId,
    history,
    edgeStates,
    outgoing,
    advance,
    back,
    reset,
    resetVars,
    scriptLoading,
    advanceLine,
    atEnd,
    hasScript,
    lineIndex,
    currentLine,
    currentBg,
    currentBgm,
    currentSfx,
    isEnding,
    endingName,
  } = usePlayState(scenario, cards, relations);
  
  useSceneAudio(currentId, lineIndex, currentBgm, currentSfx);

  const [showVariables, setShowVariables] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

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
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        position: "relative",
      }}
    >
      <VNStage
        scriptLoading={scriptLoading}
        hasScript={hasScript}
        currentLine={currentLine}
        currentBg={currentBg}
        atEnd={atEnd}
        onAdvanceLine={advanceLine}
        outgoing={outgoing}
        edgeStates={edgeStates}
        cards={cards}
        relationKinds={relationKinds}
        onAdvance={advance}
        fallbackCard={currentCard}
        scenario={scenario}
        isEnding={isEnding}
        endingName={endingName}
      />

      {/* 右上角工具栏 */}
      <div
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          display: "flex",
          gap: 6,
          zIndex: 10,
        }}
      >
        <button
          className="btn"
          onClick={() => {
            setShowVariables((v) => !v);
            setShowHistory(false);
          }}
          style={{ fontSize: 11 }}
        >
          变量
        </button>
        <button
          className="btn"
          onClick={() => {
            setShowHistory((v) => !v);
            setShowVariables(false);
          }}
          style={{ fontSize: 11 }}
        >
          历史（{history.length}）
        </button>
        <button
          className="btn"
          onClick={back}
          disabled={history.length === 0}
          style={{ fontSize: 11 }}
        >
          回退
        </button>
        <button className="btn" onClick={reset} style={{ fontSize: 11 }}>
          重置
        </button>
      </div>

      {/* 变量浮层 */}
      {showVariables && (
        <div
          style={{
            position: "absolute",
            top: 48,
            right: 12,
            width: 240,
            maxHeight: "60vh",
            overflowY: "auto",
            background: "var(--bg-panel)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-md)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
            zIndex: 20,
          }}
        >
          <VariablePanel
            scenario={scenario}
            values={values}
            onChangeValue={setValue}
            onResetVars={resetVars}
            history={history}
            cards={cards}
          />
        </div>
      )}

      {/* 历史浮层 */}
      {showHistory && (
        <div
          style={{
            position: "absolute",
            top: 48,
            right: 12,
            width: 200,
            maxHeight: "60vh",
            overflowY: "auto",
            background: "var(--bg-panel)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-md)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
            padding: 10,
            zIndex: 20,
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: "var(--fg-muted)",
              textTransform: "uppercase",
              letterSpacing: 1,
              marginBottom: 6,
            }}
          >
            历史
          </div>
          {history.length === 0 && (
            <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>无</div>
          )}
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              fontSize: 12,
            }}
          >
            {history.map((id, i) => {
              const c = cards.find((x) => x.id === id);
              return (
                <li
                  key={i}
                  style={{
                    color: "var(--fg-secondary)",
                    padding: "2px 0",
                  }}
                >
                  {c?.name ?? id.slice(0, 8)}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
