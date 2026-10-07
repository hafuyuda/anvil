import { useState } from "react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import {
  ipc,
  type MergeOptions,
  type PackInspection,
  type TypeMapAction,
} from "../../core/ipc";
import { Modal } from "../../components/Modal";
import { useProjectStore } from "../../stores/projectStore";
import { MergePackInfoCard } from "./MergePackInfoCard";
import { TypeMapRow, KindMapRow } from "./MergePackMappingRows";
import { MergePackIncludeList } from "./MergePackIncludeList";

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
  const [includeCardGroups, setIncludeCardGroups] = useState<string[]>([]);

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
      setIncludeCardGroups(insp.card_groups.map((g) => g.id));
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
      include_card_groups: includeCardGroups,
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
          `导入卡组 ${result.imported_card_groups}`,
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
            cardGroups: snap.card_groups,
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
          <MergePackInfoCard inspection={inspection} />

          {/* 卡牌类型映射 */}
          <div>
            <SectionLabel>
              卡牌类型映射（{inspection.card_types.length}）
            </SectionLabel>
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
              <SectionLabel>
                关系类型映射（{inspection.relation_kinds.length}）
              </SectionLabel>
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
                <MergePackIncludeList
                  label="剧情"
                  items={inspection.scenarios}
                  selected={includeScenarios}
                  onChange={setIncludeScenarios}
                />
                <MergePackIncludeList
                  label="棋盘"
                  items={inspection.boards}
                  selected={includeBoards}
                  onChange={setIncludeBoards}
                />
                <MergePackIncludeList
                  label="会话"
                  items={inspection.sessions}
                  selected={includeSessions}
                  onChange={setIncludeSessions}
                />
                <MergePackIncludeList
                  label="卡组"
                  items={inspection.card_groups}
                  selected={includeCardGroups}
                  onChange={setIncludeCardGroups}
                />
              </div>
            </details>
          )}
        </>
      )}
    </Modal>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        color: "var(--fg-muted)",
        textTransform: "uppercase",
        letterSpacing: 1,
        marginBottom: 6,
      }}
    >
      {children}
    </div>
  );
}
