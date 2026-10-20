import type { RefClearMode, RefHit, RefTargetKind } from "../core/ipc";

/**
 * 带引用提示的删除确认。
 *
 * 与 confirmDialog 同构：调用方 await，宿主组件通过 subscribe 渲染。
 * 区别是它有三个出口——移除引用 / 保留引用者 / 取消，
 * 而 confirmDialog 只有确定与取消。
 */

export interface RefConfirmOptions {
  targetKind: RefTargetKind;
  targetId: string;
  targetName: string;
  /** 谁在引用它。为空时不该调用本确认框，直接用 confirmDialog */
  hits: RefHit[];
}

export type RefConfirmResult = RefClearMode | null;

interface RefConfirmRequest extends RefConfirmOptions {
  id: string;
  resolve: (r: RefConfirmResult) => void;
}

type Listener = (req: RefConfirmRequest) => void;

const listeners = new Set<Listener>();

let seq = 0;
function nextId(): string {
  seq += 1;
  return `r${seq}-${Date.now().toString(36)}`;
}

export function confirmRefDelete(opts: RefConfirmOptions): Promise<RefConfirmResult> {
  return new Promise((resolve) => {
    const req: RefConfirmRequest = { ...opts, id: nextId(), resolve };
    let handled = false;
    for (const fn of listeners) {
      if (!handled) {
        fn(req);
        handled = true;
      }
    }
    if (!handled) {
      // 没有宿主组件时退化成二选一，总比卡死强
      const ok = window.confirm(
        `${opts.targetName} 还有 ${opts.hits.length} 处引用，一并清理？`,
      );
      resolve(ok ? "remove" : null);
    }
  });
}

export function subscribeRefConfirm(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** 目标种类的中文名与名词 */
export const TARGET_NOUN: Record<RefTargetKind, string> = {
  card: "卡牌",
  board: "棋盘",
  card_group: "卡组",
};
