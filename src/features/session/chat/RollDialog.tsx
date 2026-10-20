import { useMemo, useState } from "react";
import { Modal } from "../../../components/ui/Modal";
import type { RollInfo } from "../../../core/ipc";
import {
  DICE_ERROR_HINT,
  rollDice,
  validateDiceExpression,
} from "../../../lib/dice";
import { getRuleSet, judge, type RuleSetId } from "../ruleset";

interface Props {
  ruleSet: RuleSetId;
  defaultSecret: boolean;
  /** 快捷检定预填：覆盖规则集默认表达式 */
  initialExpr?: string;
  /** 快捷检定预填：目标值（技能值 / DC） */
  initialTarget?: string;
  /** 快捷检定预填：说明文字 */
  initialNote?: string;
  onRoll: (roll: RollInfo, note: string, secret: boolean) => void;
  onClose: () => void;
}

export function RollDialog({
  ruleSet,
  defaultSecret,
  initialExpr,
  initialTarget,
  initialNote,
  onRoll,
  onClose,
}: Props) {
  const def = useMemo(() => getRuleSet(ruleSet), [ruleSet]);

  const [expr, setExpr] = useState(initialExpr ?? def.defaultExpr);
  const [note, setNote] = useState(initialNote ?? "");
  const [targetRaw, setTargetRaw] = useState(initialTarget ?? "");
  const [secret, setSecret] = useState(defaultSecret);
  const [error, setError] = useState<string | null>(null);

  const target = useMemo(() => {
    const t = targetRaw.trim();
    if (!t) return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }, [targetRaw]);

  const exprValid = useMemo(() => validateDiceExpression(expr) !== null, [expr]);

  function handleRoll() {
    const r = rollDice(expr);
    if (!r) {
      setError(DICE_ERROR_HINT);
      return;
    }
    const outcome = judge({
      ruleSet,
      natural: r.natural,
      result: r.result,
      target,
    });
    onRoll(
      {
        expr: r.expr,
        result: r.result,
        detail: r.detail,
        dropped: r.dropped,
        natural: r.natural,
        target,
        rule_set: ruleSet,
        outcome: outcome?.level ?? null,
      },
      note,
      secret,
    );
    onClose();
  }

  return (
    <Modal
      title="掷骰"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            取消
          </button>
          <button className="btn btn-primary" onClick={handleRoll}>
            掷
          </button>
        </>
      }
    >
      <div
        style={{
          fontSize: 11,
          color: "var(--fg-muted)",
          marginBottom: 8,
        }}
      >
        规则集：{def.name}
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 8, flexWrap: "wrap" }}>
        {def.quick.map((q) => (
          <button
            key={q.expr}
            className="btn"
            onClick={() => {
              setExpr(q.expr);
              setError(null);
            }}
            style={{ fontSize: 12, padding: "3px 8px" }}
            title={q.expr}
          >
            {q.label}
          </button>
        ))}
      </div>

      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span
          style={{
            fontSize: 11,
            color: "var(--fg-muted)",
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          表达式
        </span>
        <input
          className="input"
          value={expr}
          onChange={(e) => {
            setExpr(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleRoll();
          }}
          style={{ fontFamily: "var(--font-mono)", fontSize: 14 }}
          autoFocus
        />
      </label>

      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <label
          style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}
        >
          <span
            style={{
              fontSize: 11,
              color: "var(--fg-muted)",
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            {def.targetLabel}（可选）
          </span>
          <input
            className="input"
            value={targetRaw}
            onChange={(e) => setTargetRaw(e.target.value)}
            placeholder={def.targetPlaceholder}
            inputMode="numeric"
          />
        </label>

        <label
          style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}
        >
          <span
            style={{
              fontSize: 11,
              color: "var(--fg-muted)",
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            说明（可选）
          </span>
          <input
            className="input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="例如：洞察检定"
          />
        </label>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginTop: 8,
        }}
      >
        <button
          className="btn"
          onClick={() => setSecret((v) => !v)}
          style={{
            fontSize: 12,
            padding: "3px 8px",
            background: secret ? "var(--chat-secret-bg)" : "var(--bg-surface)",
            borderColor: secret
              ? "var(--chat-secret-border)"
              : "var(--border-default)",
            borderStyle: secret ? "dashed" : "solid",
            color: secret ? "var(--chat-secret-text)" : "var(--fg-secondary)",
          }}
          title={
            secret
              ? "秘密掷骰：结果只有 KP 视图能看到，可稍后揭示"
              : "公开掷骰：所有人都能看到结果"
          }
        >
          {secret ? "秘密掷骰" : "公开掷骰"}
        </button>
        <span style={{ fontSize: 11, color: "var(--fg-muted)" }}>
          {secret ? "暗骰，玩家看不到点数" : "明骰"}
        </span>
      </div>

      {exprValid && target != null && (
        <div style={{ fontSize: 12, color: "var(--fg-secondary)", marginTop: 6 }}>
          掷出后按 <strong>{def.name}</strong> 对 {def.targetLabel} {target} 判定
          {def.tiered ? "（含困难 / 极限分档）" : ""}
        </div>
      )}

      {error && (
        <div style={{ fontSize: 12, color: "var(--danger)" }}>{error}</div>
      )}

      <div style={{ fontSize: 11, color: "var(--fg-muted)", marginTop: 4 }}>
        支持：1d20、2d6+3、1d8-2、4d6dl1、2d20kh1、1d20+1d4、d%、纯数字
      </div>
    </Modal>
  );
}
