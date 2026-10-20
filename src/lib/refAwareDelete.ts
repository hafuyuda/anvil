import { ipc, type RefClearMode, type RefHit, type RefTargetKind } from "../core/ipc";
import { confirmDialog } from "./confirm";
import { confirmRefDelete, TARGET_NOUN } from "./refConfirm";

export interface RefDeleteTarget {
  kind: RefTargetKind;
  id: string;
  name: string;
}

async function scanFor(targets: RefDeleteTarget[]): Promise<RefHit[]> {
  try {
    if (targets.length === 1) {
      const t = targets[0];
      switch (t.kind) {
        case "card":
          return await ipc.scanCardRefs(t.id);
        case "board":
          return await ipc.scanBoardRefs(t.id);
        case "card_group":
          return await ipc.scanCardGroupRefs(t.id);
      }
    }
    // 批量删除只支持卡牌（卡墙多选）。一次遍历，不逐个扫。
    return await ipc.scanCardRefsBatch(targets.map((t) => t.id));
  } catch {
    // 扫描失败不该挡住删除：少一条提示，好过删不掉东西
    return [];
  }
}

/** 同一处引用被多张卡命中时（例如一个卡盒里有两张待删的牌），只显示一次 */
function dedupe(hits: RefHit[]): RefHit[] {
  const seen = new Set<string>();
  const out: RefHit[] = [];
  for (const h of hits) {
    const key = `${h.kind}|${h.owner_id}|${h.label}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(h);
  }
  return out;
}

/**
 * 删除前的统一关卡。
 *
 * 没有引用 → 普通的二选一确认框（和以前一样）。
 * 有引用   → 三选一：移除引用者 / 保留引用者 / 取消。
 *
 * 返回 null 表示用户取消。
 */
export async function confirmRefAwareDelete(
  targets: RefDeleteTarget[],
): Promise<RefClearMode | null> {
  if (targets.length === 0) return null;
  const noun = TARGET_NOUN[targets[0].kind];
  const hits = await scanFor(targets);

  if (hits.length === 0) {
    const what =
      targets.length === 1
        ? `确认删除${noun}「${targets[0].name}」？`
        : `确认删除这 ${targets.length} 张${noun}？`;
    const ok = await confirmDialog({
      message: `${what}可用 Ctrl+Z 撤销。`,
      confirmLabel: "删除",
      danger: true,
    });
    return ok ? "remove" : null;
  }

  return await confirmRefDelete({
    targetKind: targets[0].kind,
    targetId: targets[0].id,
    targetName:
      targets.length === 1
        ? targets[0].name
        : `这 ${targets.length} 张${noun}`,
    hits: dedupe(hits),
  });
}
