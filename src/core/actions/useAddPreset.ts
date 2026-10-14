import { ipc } from "../core/ipc";
import { toast } from "../lib/toast";
import { runWithError } from "../lib/runWithError";
import { useProjectStore } from "../stores/projectStore";

/**
 * 添加内置预设到当前项目。
 * 成功后刷新项目快照和 manifest，并 toast 导入摘要。
 */
export function useAddPreset() {
  const refreshProject = useProjectStore((s) => s.refreshProject);
  const setManifest = useProjectStore((s) => s.setManifest);

  async function addPreset(presetId: string): Promise<boolean> {
    const r = await runWithError(() => ipc.addPreset(presetId), "添加预设失败");
    if (!r.ok) return false;

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
    const m = await ipc.loadManifest();
    setManifest(m);

    const res = r.value;
    const summary = [
      `${res.imported_types} 类型`,
      `${res.imported_cards} 卡`,
      `${res.imported_relations} 关系`,
      `${res.imported_scenarios} 剧情`,
      `${res.imported_boards} 棋盘`,
      `${res.imported_sessions} 会话`,
      `${res.imported_card_groups} 卡组`,
    ]
      .filter((s) => !s.startsWith("0 "))
      .join(" · ");
    toast.success(`已添加预设：${summary}`);
    return true;
  }

  return addPreset;
}
