import { useState } from "react";
import type { Scenario } from "../../../core/ipc";
import { usePlayState } from "./usePlayState";
import { VariablePanel } from "./panels/VariablePanel";
import { VNStage } from "./vn/VNStage";
import { useSceneAudio } from "./useSceneAudio";

interface Props {
  scenario: Scenario;
}

export function PlayView({ scenario }: Props) {
  const {
    loading,
    loadError,
    entryError,
    hasContent,
    state,
    values,
    setValue,
    resetVars,
    variables,
    history,
    currentKnot,
    currentBg,
    currentBgm,
    currentSfx,
    choices,
    currentLine,
    ended,
    isEnding,
    endingName,
    advance,
    choose,
    back,
    reset,
  } = usePlayState(scenario);

  useSceneAudio(currentKnot, currentBgm, currentSfx);

  const [showVariables, setShowVariables] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  if (loading) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--fg-muted)",
          fontSize: 13,
        }}
      >
        加载剧本…
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={{ padding: 24, color: "var(--warning)", fontSize: 13 }}>
        剧本加载失败：{loadError}
      </div>
    );
  }

  if (entryError || !hasContent || !state) {
    return (
      <div style={{ padding: 24, color: "var(--fg-muted)", fontSize: 13 }}>
        {entryError ?? "该剧情还没有剧本文件。"}
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
        currentLine={currentLine}
        currentBg={currentBg}
        ended={ended}
        isEnding={isEnding}
        endingName={endingName}
        choices={choices}
        onAdvance={advance}
        onChoose={choose}
        scenarioName={scenario.name}
        knot={currentKnot}
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
            variables={variables}
            values={values}
            onChangeValue={setValue}
            onResetVars={resetVars}
            history={history.map((h) => h.knot ?? "")}
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
            {history.map((h, i) => (
              <li
                key={i}
                style={{
                  color: "var(--fg-secondary)",
                  padding: "2px 0",
                }}
              >
                {h.knot ?? "—"}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
