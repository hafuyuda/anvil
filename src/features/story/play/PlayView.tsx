import { useEffect, useState } from "react";
import type { Scenario } from "../../../core/ipc";
import { usePlayState } from "./usePlayState";
import { VariablePanel } from "./panels/VariablePanel";
import { VNStage } from "./vn/VNStage";
import { SceneCard } from "./SceneCard";
import { useSceneAudio } from "./useSceneAudio";
import { isEditableTarget } from "../../../lib/keyboard";

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
    lastRolls,
    ended,
    isEnding,
    endingName,
    portrait,
    portraitLookup,
    cards,
    currentSceneCard,
    duplicates,
    advance,
    choose,
    back,
    reset,
  } = usePlayState(scenario);

  useSceneAudio(currentKnot, currentBgm, currentSfx);

  const [showVariables, setShowVariables] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showScene, setShowScene] = useState(false);

  // 键盘操作：Space/Enter 推进，1-9 选择选项；输入框聚焦时不拦截
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (isEditableTarget(e.target)) return;
      if (e.key === " " || e.key === "Enter") {
        if (currentLine && choices.length === 0 && !ended) {
          e.preventDefault();
          advance();
        }
      } else if (/^[1-9]$/.test(e.key)) {
        const idx = Number(e.key) - 1;
        if (choices.length > 0 && idx < choices.length) {
          e.preventDefault();
          choose(idx);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance, choose, choices, ended, currentLine]);

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
        portrait={portrait}
        portraitLookup={portraitLookup}
      />

      {/* 重名 knot 警示 */}
      {duplicates.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            right: 220,
            zIndex: 10,
            padding: "6px 12px",
            background: "var(--bg-panel)",
            border: "1px solid var(--warning)",
            borderRadius: "var(--radius-md)",
            color: "var(--warning)",
            fontSize: 11,
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
          }}
        >
          重名 knot（后者覆盖前者，跳转可能指向非预期目标）：
          {duplicates.map((d) => `「${d}」`).join("、")}
        </div>
      )}

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
            setShowScene((v) => !v);
            setShowVariables(false);
            setShowHistory(false);
          }}
          style={{ fontSize: 11 }}
        >
          场景
        </button>
        <button
          className="btn"
          onClick={() => {
            setShowVariables((v) => !v);
            setShowScene(false);
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
            setShowScene(false);
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

      {/* 场景信息浮层（复用已写好的 SceneCard 组件） */}
      {showScene && (
        <div
          style={{
            position: "absolute",
            top: 48,
            right: 12,
            width: 300,
            maxHeight: "70vh",
            overflowY: "auto",
            background: "var(--bg-panel)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-md)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
            padding: 12,
            zIndex: 20,
          }}
        >
          {currentSceneCard ? (
            <SceneCard
              card={currentSceneCard}
              cards={cards}
              lastRolls={lastRolls}
            />
          ) : (
            <div className="muted">
              当前无场景卡（用 @scene 场景卡名 标记）
            </div>
          )}
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
            <div className="muted">无</div>
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
