import type { ScriptLine } from "../../script/types";
import { VNStageBackground } from "./VNStageBackground";
import { VNStageChoice } from "./VNStageChoice";
import { VNStageDialogue } from "./VNStageDialogue";
import { VNStageEnding } from "./VNStageEnding";

interface Props {
  currentLine: ScriptLine | null;
  currentBg: string | null;
  ended: boolean;
  isEnding: boolean;
  endingName: string | null;
  choices: { label: string; index: number }[];
  onAdvance: () => void;
  onChoose: (index: number) => void;
  scenarioName: string;
  knot: string | null;
}

export function VNStage({
  currentLine,
  currentBg,
  ended,
  isEnding,
  endingName,
  choices,
  onAdvance,
  onChoose,
  scenarioName,
  knot,
}: Props) {
  const showChoices = choices.length > 0;
  const showEnd = ended;
  // 仅停在可显示行、无选项未结束时点击推进
  const advanceable = Boolean(currentLine) && !showChoices && !showEnd;

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
        <div
          style={{
            padding: "8px 16px",
            fontSize: 10,
            color: "var(--fg-muted)",
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          {scenarioName}
          {knot ? ` · ${knot}` : ""}
        </div>

        {currentLine ? (
          <>
            <div
              onClick={advanceable ? onAdvance : undefined}
              style={{
                flex: 1,
                cursor: advanceable ? "pointer" : "default",
              }}
            />

            {showEnd ? (
              isEnding && <VNStageEnding name={endingName} />
            ) : showChoices ? (
              <VNStageChoice choices={choices} onChoose={onChoose} />
            ) : (
              <VNStageDialogue line={currentLine} onAdvance={onAdvance} />
            )}
          </>
        ) : (
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
            {showEnd ? "剧情结束" : "…"}
          </div>
        )}
      </div>
    </div>
  );
}
