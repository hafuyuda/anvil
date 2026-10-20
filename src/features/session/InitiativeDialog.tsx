import { useMemo, useState } from "react";
import { Modal } from "../../components/ui/Modal";
import type { InitiativeEntry } from "../../core/ipc";
import { rollDice } from "../../lib/dice";
import { getRuleSet, type RuleSetId } from "./ruleset";

interface Candidate {
  tokenId: string | null;
  cardId: string | null;
  name: string;
  isPc: boolean;
}

interface Props {
  candidates: Candidate[];
  existing: InitiativeEntry[];
  ruleSet: RuleSetId;
  onApply: (entries: InitiativeEntry[]) => void;
  onClose: () => void;
}

export function InitiativeDialog({
  candidates,
  existing,
  ruleSet,
  onApply,
  onClose,
}: Props) {
  const def = useMemo(() => getRuleSet(ruleSet), [ruleSet]);
  const canRoll = def.initiativeExpr !== null;

  // 已经在场的用已有先攻值做初值，避免重复加入时丢数据
  const [selected, setSelected] = useState<Set<string>>(() => {
    const s = new Set<string>();
    for (const c of candidates) {
      if (existing.some((e) => e.card_id && e.card_id === c.cardId)) {
        s.add(keyOf(c));
      }
    }
    return s;
  });
  const [values, setValues] = useState<Record<string, string>>(() => {
    const v: Record<string, string> = {};
    for (const c of candidates) {
      const found = existing.find((e) => e.card_id && e.card_id === c.cardId);
      v[keyOf(c)] = found ? String(found.value) : "";
    }
    return v;
  });

  // PC / NPC 由 KP 现场判定 —— 卡上没有也不该有这个标记
  const [pc, setPc] = useState<Record<string, boolean>>(() => {
    const m: Record<string, boolean> = {};
    for (const c of candidates) m[keyOf(c)] = c.isPc;
    return m;
  });

  function toggle(k: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }

  function rollOne(k: string) {
    if (!def.initiativeExpr) return;
    const r = rollDice(def.initiativeExpr);
    if (!r) return;
    setValues((prev) => ({ ...prev, [k]: String(r.result) }));
  }

  function rollAll() {
    if (!def.initiativeExpr) return;
    const next: Record<string, string> = { ...values };
    for (const k of selected) {
      const r = rollDice(def.initiativeExpr);
      if (r) next[k] = String(r.result);
    }
    setValues(next);
  }

  function apply() {
    const entries: InitiativeEntry[] = [];
    for (const c of candidates) {
      if (!selected.has(keyOf(c))) continue;
      const raw = values[keyOf(c)]?.trim() ?? "";
      const n = raw === "" ? 0 : Number(raw);
      entries.push({
        token_id: c.tokenId,
        card_id: c.cardId,
        name: c.name,
        value: Number.isFinite(n) ? Math.round(n) : 0,
        is_pc: pc[keyOf(c)] ?? c.isPc,
      });
    }
    // 先攻值相同时维持原顺序，避免每次保存顺序乱跳
    entries.sort((a, b) => b.value - a.value);
    onApply(entries);
  }

  return (
    <Modal
      title="设置先攻"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            取消
          </button>
          {canRoll && (
            <button className="btn" onClick={rollAll} disabled={selected.size === 0}>
              为选中者掷骰
            </button>
          )}
          <button className="btn btn-primary" onClick={apply}>
            开始战斗
          </button>
        </>
      }
    >
      {!canRoll && (
        <div style={{ fontSize: 12, color: "var(--fg-muted)", marginBottom: 8 }}>
          {def.name} 的先攻不靠掷骰（按 DEX 排序），请手工录入数值。
        </div>
      )}

      {candidates.length === 0 && (
        <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>
          没有可加入的角色。先在棋盘上放置角色 Token。
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {candidates.map((c) => {
          const k = keyOf(c);
          const on = selected.has(k);
          return (
            <div
              key={k}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "4px 6px",
                borderRadius: "var(--radius-sm)",
                background: on ? "var(--bg-raised)" : "transparent",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  flex: 1,
                  minWidth: 0,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggle(k)}
                />
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {c.name}
                </span>
              </label>

              <button
                className="btn"
                onClick={() =>
                  setPc((prev) => ({ ...prev, [k]: !prev[k] }))
                }
                disabled={!on}
                style={{
                  fontSize: 10,
                  padding: "1px 5px",
                  width: 40,
                  color: pc[k]
                    ? "var(--initiative-pc-accent)"
                    : "var(--initiative-npc-accent)",
                }}
                title="切换玩家角色 / 非玩家角色"
              >
                {pc[k] ? "PC" : "NPC"}
              </button>

              <input
                className="input"
                value={values[k] ?? ""}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, [k]: e.target.value }))
                }
                placeholder="先攻值"
                inputMode="numeric"
                disabled={!on}
                style={{ width: 90, fontFamily: "var(--font-mono)" }}
              />

              {canRoll && (
                <button
                  className="btn"
                  onClick={() => rollOne(k)}
                  disabled={!on}
                  style={{ fontSize: 11, padding: "2px 6px" }}
                  title={`掷 ${def.initiativeExpr}`}
                >
                  掷
                </button>
              )}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

/**
 * 候选者身份键。没有卡也没有 token 的参与者（如 KP 自己）用名字兜底。
 */
function keyOf(c: Candidate): string {
  return c.cardId ?? c.tokenId ?? `name:${c.name}`;
}
