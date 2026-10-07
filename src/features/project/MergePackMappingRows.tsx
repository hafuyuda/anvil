import type { CardType, RelationKind, TypeMapAction } from "../../core/ipc";

/**
 * 把 select 的字符串值解析成 TypeMapAction。
 * 格式：`new` | `skip` | `existing:<uuid>`
 */
function parseMapActionValue(v: string): TypeMapAction {
  if (v === "new") return { action: "new" };
  if (v === "skip") return { action: "skip" };
  if (v.startsWith("existing:")) {
    return { action: "existing", target_id: v.slice(9) };
  }
  return { action: "new" };
}

function actionToValue(a: TypeMapAction): string {
  return a.action === "existing" ? `existing:${a.target_id}` : a.action;
}

// ── 卡牌类型映射行 ──

export function TypeMapRow({
  sourceName,
  sourceCount,
  action,
  localTypes,
  onChange,
}: {
  sourceName: string;
  sourceCount: number;
  action: TypeMapAction;
  localTypes: CardType[];
  onChange: (a: TypeMapAction) => void;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr",
        gap: 8,
        alignItems: "center",
        padding: "6px 10px",
        borderBottom: "1px solid var(--border-subtle)",
        fontSize: 12,
      }}
    >
      <span style={{ color: "var(--fg-primary)" }}>
        {sourceName}{" "}
        <span style={{ color: "var(--fg-muted)", fontSize: 11 }}>
          ({sourceCount} 张)
        </span>
      </span>
      <span style={{ color: "var(--fg-muted)" }}>→</span>
      <select
        className="select"
        value={actionToValue(action)}
        onChange={(e) => onChange(parseMapActionValue(e.target.value))}
        style={{ fontSize: 12 }}
      >
        <option value="new">新建类型</option>
        <option value="skip">跳过</option>
        {localTypes.length > 0 && (
          <optgroup label="映射到现有类型">
            {localTypes.map((t) => (
              <option key={t.id} value={`existing:${t.id}`}>
                {t.name}
              </option>
            ))}
          </optgroup>
        )}
      </select>
    </div>
  );
}

// ── 关系类型映射行 ──

export function KindMapRow({
  sourceName,
  action,
  localKinds,
  onChange,
}: {
  sourceName: string;
  action: TypeMapAction;
  localKinds: RelationKind[];
  onChange: (a: TypeMapAction) => void;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr",
        gap: 8,
        alignItems: "center",
        padding: "6px 10px",
        borderBottom: "1px solid var(--border-subtle)",
        fontSize: 12,
      }}
    >
      <span style={{ color: "var(--fg-primary)" }}>{sourceName}</span>
      <span style={{ color: "var(--fg-muted)" }}>→</span>
      <select
        className="select"
        value={actionToValue(action)}
        onChange={(e) => onChange(parseMapActionValue(e.target.value))}
        style={{ fontSize: 12 }}
      >
        <option value="new">新建</option>
        <option value="skip">跳过</option>
        {localKinds.length > 0 && (
          <optgroup label="映射到现有">
            {localKinds.map((k) => (
              <option key={k.id} value={`existing:${k.id}`}>
                {k.name}
              </option>
            ))}
          </optgroup>
        )}
      </select>
    </div>
  );
}