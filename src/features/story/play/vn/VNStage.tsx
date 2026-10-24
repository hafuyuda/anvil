import type { ScriptLine } from "../../script/types";
import { useAppSettings } from "../../../../hooks/useAppSettings";
import { hashString } from "../../../../lib/color";
import { useTypewriter } from "../useTypewriter";
import { VNStageBackground } from "./VNStageBackground";
import { VNStageChoice } from "./VNStageChoice";
import { VNStageDialogue } from "./VNStageDialogue";
import { VNStageEnding } from "./VNStageEnding";
import { PortraitLayer } from "./PortraitLayer";

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
  /** 当前说话人立绘（说话人 + 表情），由运行时推导 */
  portrait: { speaker: string; emotion?: string } | null;
  /** 卡名 + 表情 → 立绘资源路径（同步映射，URL 由 PortraitLayer 异步加载） */
  portraitLookup: ((speaker: string, emotion?: string | null) => string | null) | null;
}

/** 同一说话人稳定落在同一侧，制造对话左右交替的观感。 */
function sideFor(speaker: string): "left" | "right" {
  return hashString(speaker) % 2 === 0 ? "right" : "left";
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
  portrait,
  portraitLookup,
}: Props) {
  const showChoices = choices.length > 0;
  const showEnd = ended;
  // 仅停在可显示行、无选项未结束时点击推进
  const advanceable = Boolean(currentLine) && !showChoices && !showEnd;

  // 打字机提升到舞台层：大点击区与对话框共用同一 done / skip，行为一致
  const text = currentLine && "text" in currentLine ? currentLine.text : "";
  const { typewriterEnabled, typewriterNarration } = useAppSettings();
  const enabled =
    currentLine?.type === "narration"
      ? typewriterEnabled && typewriterNarration
      : typewriterEnabled;
  const { displayed, done, skip } = useTypewriter(text, { enabled });

  function handleStageClick() {
    if (!advanceable) return;
    if (!done) skip();
    else onAdvance();
  }

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

      {/* 立绘层（位于背景之上、对话框之下，不拦截点击） */}
      {portrait && portraitLookup && (
        <PortraitLayer
          speaker={portrait.speaker}
          emotion={portrait.emotion}
          lookup={portraitLookup}
          side={sideFor(portrait.speaker)}
        />
      )}

      {/* 内容层 */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
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
              onClick={handleStageClick}
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
              <VNStageDialogue
                line={currentLine}
                displayed={displayed}
                done={done}
                skip={skip}
                onAdvance={onAdvance}
              />
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
