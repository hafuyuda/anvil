import type { CardType } from "../../../core/ipc";

export function FoilTriggerRow({
  cardType,
  fieldKey,
  values,
  onChange,
}: {
  cardType: CardType;
  fieldKey: string | null;
  values: string[];
  onChange: (patch: {
    foil_field?: string | null;
    foil_values?: string[];
  }) => void;
}) {
  const fields = cardType.fields.filter((f) => !f.deprecated);

  const field = fieldKey ? fields.find((f) => f.key === fieldKey) : null;
  const fieldMissing = Boolean(fieldKey) && !field;

  const options: string[] | null =
    field && (field.ty.kind === "enum" || field.ty.kind === "multi_enum")
      ? field.ty.options
      : null;

  return (
    <div
      style={{
        padding: 10,
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-md)",
        background: "var(--bg-surface)",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div style={{ fontSize: 12, color: "var(--fg-secondary)" }}>闪卡触发</div>
      <div
        style={{
          fontSize: 11,
          color: "var(--fg-muted)",
          lineHeight: 1.5,
        }}
      >
        指定某字段命中某些值时，卡片呈现闪卡效果。
        <br />
        需视图层显式启用（卡片墙、检查器预览）。
      </div>

      {fields.length === 0 ? (
        <div
          style={{
            fontSize: 11,
            color: "var(--fg-muted)",
            padding: "6px 0",
            lineHeight: 1.5,
          }}
        >
          该类型暂无字段。先去「字段」tab 添加，再回来配置闪卡触发。
        </div>
      ) : (
        <>
          <label
            style={{
              fontSize: 12,
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <span style={{ color: "var(--fg-muted)" }}>触发字段</span>
            <select
              className="select"
              value={fieldKey ?? ""}
              onChange={(e) => {
                const v = e.target.value || null;
                onChange({ foil_field: v, foil_values: [] });
              }}
            >
              <option value="">— 不启用 —</option>
              {fields.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}（{f.key}）
                </option>
              ))}
              {fieldMissing && fieldKey && (
                <option value={fieldKey}>（已失效：{fieldKey}）</option>
              )}
            </select>
          </label>

          {fieldKey && (
            <>
              {options ? (
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--fg-muted)",
                      marginBottom: 4,
                    }}
                  >
                    触发值（勾选）
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {options.length === 0 && (
                      <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>
                        该字段没有选项
                      </span>
                    )}
                    {options.map((o) => (
                      <label
                        key={o}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: 12,
                          color: "var(--fg-secondary)",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={values.includes(o)}
                          onChange={(e) => {
                            if (e.target.checked)
                              onChange({ foil_values: [...values, o] });
                            else
                              onChange({
                                foil_values: values.filter((x) => x !== o),
                              });
                          }}
                          style={{ accentColor: "var(--accent-gold)" }}
                        />
                        {o}
                      </label>
                    ))}
                  </div>
                </div>
              ) : (
                <label
                  style={{
                    fontSize: 12,
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                  }}
                >
                  <span style={{ color: "var(--fg-muted)" }}>
                    触发值（逗号分隔）
                  </span>
                  <input
                    className="input"
                    value={values.join(", ")}
                    onChange={(e) =>
                      onChange({
                        foil_values: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder="例如：传说, 稀有"
                    style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}
                  />
                  <span
                    style={{
                      fontSize: 10,
                      color: "var(--fg-muted)",
                      marginTop: 2,
                      lineHeight: 1.5,
                    }}
                  >
                    数字填 7，布尔填 true，多选字段填其中任一值
                  </span>
                </label>
              )}

              {fieldMissing && (
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--warning)",
                    lineHeight: 1.5,
                  }}
                >
                  字段「{fieldKey}
                  」已失效（被删除或改名）。闪卡不会触发，可清空映射或改选其它字段。
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
