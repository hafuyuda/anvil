import type { Card, Scenario } from "../../../../core/ipc";
import type { ScriptLine } from "../../script/types";
import { VNStageBackground } from "./VNStageBackground";
import { VNStageChoice } from "./VNStageChoice";
import { VNStageDialogue } from "./VNStageDialogue";
import { VNStageEnding } from "./VNStageEnding";
import { VNStageFallback } from "./VNStageFallback";
import { VNStagePortrait } from "./VNStagePortrait";

interface Props {
  scriptLoading: boolean;
  hasScript: boolean;
  currentLine: ScriptLine | null;
  currentBg: string | null;
  atEnd: boolean;
  onAdvanceLine: () => void;

  jumps: { target: string }[];
  onChoose: (target: string) => void;
  cards: Card[];

  fallbackCard: Card | null;
  scenario: Scenario;

  isEnding: boolean;
  endingName: string | null;
}

export function VNStage({
  scriptLoading,
  hasScript,
  currentLine,
  currentBg,
  atEnd,
  onAdvanceLine,
  jumps,
  onChoose,
  cards,
  fallbackCard,
  scenario,
  isEnding,
  endingName,
}: Props) {
  if (scriptLoading) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg-app)",
          color: "var(--fg-muted)",
          fontSize: 13,
        }}
      >
        加载剧本…
      </div>
    );
  }

  // 有选项（停在 jump 列表）或走到底（结局 / 无选项）时显示选择面板
  const showChoices = jumps.length > 0 || atEnd;
  // 仅停在可显示行、无选项时点击推进
  const advanceable = hasScript && Boolean(currentLine) && !showChoices;

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        position: "relative",
        background: "var(--bg-app)",
        overflow: "hidden",
      }}
    >
      {/* 背景层 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: currentBg
            ? "var(--bg-surface)"
            : "linear-gradient(180deg, #1a1612 0%, #2a231a 100%)",
          zIndex: 0,
        }}
      >
        {currentBg && <VNStageBackground path={currentBg} />}
      </div>

      {/* 立绘层 */}
      {hasScript && currentLine && (
        <VNStagePortrait line={currentLine} cards={cards} />
      )}

      {/* 内容层 */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {hasScript && currentLine ? (
          <>
            <div
              onClick={advanceable ? onAdvanceLine : undefined}
              style={{
                flex: 1,
                cursor: advanceable ? "pointer" : "default",
              }}
            />

            {showChoices ? (
              <>
                {atEnd && isEnding && <VNStageEnding name={endingName} />}
                <VNStageChoice jumps={jumps} onChoose={onChoose} />
              </>
            ) : (
              <VNStageDialogue line={currentLine} onAdvance={onAdvanceLine} />
            )}
          </>
        ) : (
          <VNStageFallback
            card={fallbackCard}
            scenario={scenario}
            jumps={jumps}
            onChoose={onChoose}
          />
        )}
      </div>
    </div>
  );
}
