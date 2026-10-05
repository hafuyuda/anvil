import { useState } from "react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import {
  ipc,
  type CardType,
  type MergeOptions,
  type PackInspection,
  type RelationKind,
  type TypeMapAction,
} from "../../core/ipc";
import { Modal } from "../../components/Modal";
import { useProjectStore } from "../../stores/projectStore";

interface Props {
  onClose: () => void;
}

export function MergePackDialog({ onClose }: Props) {
  const cardTypes = useProjectStore((s) => s.cardTypes) ?? [];
  const relationKinds = useProjectStore((s) => s.relationKinds) ?? [];
  const projectPath = useProjectStore((s) => s.projectPath);
  const refreshProject = useProjectStore((s) => s.refreshProject);

  const [src, setSrc] = useState<string | null>(null);
  const [inspection, setInspection] = useState<PackInspection | null>(null);
  const [loading, setLoading] = useState(false);
  const [merging, setMerging] = useState(false);

  const [cardTypeMap, setCardTypeMap] = useState<Record<string, TypeMapAction>>(
    {},
  );
  const [relationKindMap, setRelationKindMap] = useState<
    Record<string, TypeMapAction>
  >({});

  const [includeScenarios, setIncludeScenarios] = useState<string[]>([]);
  const [includeBoards, setIncludeBoards] = useState<string[]>([]);
  const [includeSessions, setIncludeSessions] = useState<string[]>([]);

  const [typesOnly, setTypesOnly] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  async function pickPack() {
    const picked = await openDialog({
      multiple: false,
      filters: [{ name: "Anvil Pack", extensions: ["anvilpack", "zip"] }],
      title: "选择要合并的资源包",
    });
    if (!picked || Array.isArray(picked)) return;

    setSrc(picked);
    setInspection(null);
    setLoading(true);
    try {
      const insp = await ipc.inspectPack(picked);
      setInspection(insp);

      // 默认映射：同名类型 → 现有；否则 → 新建
      const ctMap: Record<string, TypeMapAction> = {};
      for (const it of insp.card_types) {
        const same = cardTypes.find((t) => t.name === it.name);
        ctMap[it.id] = same
          ? { action: "existing", target_id: same.id }
          : { action: "new" };
      }
      setCardTypeMap(ctMap);

      const rkMap: Record<string, TypeMapAction> = {};
      for (const rk of insp.relation_kinds) {
        const same = relationKinds.find((k) => k.name === rk.name);
        rkMap[rk.id] = same
          ? { action: "existing", target_id: same.id }
          : { action: "new" };
      }
      setRelationKindMap(rkMap);

      setIncludeScenarios(insp.scenarios.map((s) => s.id));
      setIncludeBoards(insp.boards.map((b) => b.id));
      setIncludeSessions(insp.sessions.map((s) => s.id));
    } catch (e) {
      alert("读取资源包失败: " + e);
      setSrc(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleMerge() {
    if (!src || !inspection) return;

    const options: MergeOptions = {
      types_only: typesOnly,
      card_type_map: cardTypeMap,
      relation_kind_map: relationKindMap,
      include_scenarios: includeScenarios,
      include_boards: includeBoards,
      include_sessions: includeSessions,
    };

    setMerging(true);
    try {
      const result = await ipc.mergePack(src, options);
      const lines = [
        `导入类型 ${result.imported_types}`,
        `导入卡牌 ${result.imported_cards}`,
        `导入关系 ${result.imported_relations}`,
      ];
      if (!typesOnly) {
        lines.push(
          `导入剧情 ${result.imported_scenarios}`,
          `导入棋盘 ${result.imported_boards}`,
          `导入会话 ${result.imported_sessions}`,
          `导入图片 ${result.imported_assets}`,
        );
      }
      if (result.skipped_types.length > 0) {
        lines.push(`跳过类型：${result.skipped_types.join("、")}`);
      }
      alert("合并完成\n\n" + lines.join("\n"));

      if (projectPath) {
        try {
          const snap = await ipc.reloadProject();
          refreshProject({
            cards: snap.cards,
            cardTypes: snap.card_types,
            relationKinds: snap.relation_kinds,
            relations: snap.relations,
            scenarios: snap.scenarios,
            boards: snap.boards,
            sessions: snap.sessions,
          });
        } catch {
          // 忽略
        }
      }
      onClose();
    } catch (e) {
      alert("合并失败: " + e);
    } finally {
      setMerging(false);
    }
  }

  return (
    <Modal
      title="合并资源包"
      width={640}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose} disabled={merging}>
            取消
          </button>
          <button
            className="btn btn-primary"
            onClick={handleMerge}
            disabled={!inspection || merging}
          >
            {merging ? "合并中…" : "合并"}
          </button>
        </>
      }
    >
      {/* 选择文件 */}
      {!inspection && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            alignItems: "center",
            padding: "24px 0",
          }}
        >
          <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>
            选择一个 .anvilpack 文件合并进当前项目
          </div>
          <button className="btn btn-primary" onClick={pickPack}>
            选择资源包
          </button>
          {loading && (
            <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>
              读取中…
            </div>
          )}
        </div>
      )}

      {inspection && (
        <>
          {/* 包信息 */}
          <div
            style={{
              padding: 10,
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              fontSize: 12,
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontFamily: "var(--font-title)",
                fontWeight: 600,
                color: "var(--accent-gold)",
                marginBottom: 4,
              }}
            >
              {inspection.manifest.name}
            </div>
            <div style={{ color: "var(--fg-secondary)" }}>
              {inspection.total_cards} 张卡 · {inspection.total_relations}{" "}
              条关系 · {inspection.card_types.length} 个类型
            </div>
            {inspection.manifest.author && (
              <div style={{ color: "var(--fg-muted)", marginTop: 2 }}>
                作者：{inspection.manifest.author}
              </div>
            )}
          </div>

          {/* 卡牌类型映射 */}
          <div>
            <div
              style={{
                fontSize: 10,
                color: "var(--fg-muted)",
                textTransform: "uppercase",
                letterSpacing: 1,
                marginBottom: 6,
              }}
            >
              卡牌类型映射（{inspection.card_types.length}）
            </div>
            <div
              style={{
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                maxHeight: 240,
                overflowY: "auto",
              }}
            >
              {inspection.card_types.map((it) => (
                <TypeMapRow
                  key={it.id}
                  sourceName={it.name}
                  sourceCount={it.card_count}
                  action={cardTypeMap[it.id] ?? { action: "new" }}
                  localTypes={cardTypes}
                  onChange={(a) =>
                    setCardTypeMap((m) => ({ ...m, [it.id]: a }))
                  }
                />
              ))}
            </div>
          </div>

          {/* 关系类型映射 */}
          {inspection.relation_kinds.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: 10,
                  color: "var(--fg-muted)",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  marginBottom: 6,
                }}
              >
                关系类型映射（{inspection.relation_kinds.length}）
              </div>
              <div
                style={{
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  maxHeight: 200,
                  overflowY: "auto",
                }}
              >
                {inspection.relation_kinds.map((rk) => (
                  <KindMapRow
                    key={rk.id}
                    sourceName={rk.name}
                    action={relationKindMap[rk.id] ?? { action: "new" }}
                    localKinds={relationKinds}
                    onChange={(a) =>
                      setRelationKindMap((m) => ({ ...m, [rk.id]: a }))
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {/* 只导类型 */}
          <label
            style={{
              display: "flex",
              gap: 6,
              alignItems: "center",
              fontSize: 12,
              color: "var(--fg-secondary)",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={typesOnly}
              onChange={(e) => setTypesOnly(e.target.checked)}
              style={{ accentColor: "var(--accent-gold)" }}
            />
            只导入类型，不导入卡片、关系、剧情等
          </label>

          {/* 高级设置 */}
          {!typesOnly && (
            <details
              open={advancedOpen}
              onToggle={(e) =>
                setAdvancedOpen((e.target as HTMLDetailsElement).open)
              }
            >
              <summary
                style={{
                  fontSize: 11,
                  color: "var(--fg-muted)",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                高级设置 · 选择性导入
              </summary>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  marginTop: 10,
                }}
              >
                <IncludeList
                  label="剧情"
                  items={inspection.scenarios}
                  selected={includeScenarios}
                  onChange={setIncludeScenarios}
                />
                <IncludeList
                  label="棋盘"
                  items={inspection.boards}
                  selected={includeBoards}
                  onChange={setIncludeBoards}
                />
                <IncludeList
                  label="会话"
                  items={inspection.sessions}
                  selected={includeSessions}
                  onChange={setIncludeSessions}
                />
              </div>
            </details>
          )}
        </>
      )}
    </Modal>
  );
}

function TypeMapRow({
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
  const value =
    action.action === "existing"
      ? `existing:${action.target_id}`
      : action.action;

  function handleChange(v: string) {
    if (v === "new") onChange({ action: "new" });
    else if (v === "skip") onChange({ action: "skip" });
    else if (v.startsWith("existing:")) {
      onChange({ action: "existing", target_id: v.slice(9) });
    }
  }

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
        value={value}
        onChange={(e) => handleChange(e.target.value)}
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

function KindMapRow({
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
  const value =
    action.action === "existing"
      ? `existing:${action.target_id}`
      : action.action;

  function handleChange(v: string) {
    if (v === "new") onChange({ action: "new" });
    else if (v === "skip") onChange({ action: "skip" });
    else if (v.startsWith("existing:")) {
      onChange({ action: "existing", target_id: v.slice(9) });
    }
  }

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
        value={value}
        onChange={(e) => handleChange(e.target.value)}
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

function IncludeList({
  label,
  items,
  selected,
  onChange,
}: {
  label: string;
  items: { id: string; name: string }[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          color: "var(--fg-muted)",
          marginBottom: 4,
        }}
      >
        {label}（{selected.length} / {items.length}）
      </div>
      <div
        style={{
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
          padding: 6,
          background: "var(--bg-surface)",
          maxHeight: 120,
          overflowY: "auto",
        }}
      >
        {items.map((it) => (
          <label
            key={it.id}
            style={{
              display: "flex",
              gap: 6,
              alignItems: "center",
              fontSize: 12,
              color: "var(--fg-secondary)",
              cursor: "pointer",
              padding: "2px 0",
            }}
          >
            <input
              type="checkbox"
              checked={selected.includes(it.id)}
              onChange={(e) => {
                if (e.target.checked) onChange([...selected, it.id]);
                else onChange(selected.filter((x) => x !== it.id));
              }}
              style={{ accentColor: "var(--accent-gold)" }}
            />
            {it.name}
          </label>
        ))}
      </div>
    </div>
  );
}
