import { useProjectStore } from "../stores/projectStore";

interface UndoableDeleteOptions {
  /** 撤销/重做时显示在按钮上的标签 */
  label: string;
  /** 执行删除。应该同时改磁盘和 store */
  do: () => Promise<void>;
  /** 恢复。应该同时改磁盘和 store */
  restore: () => Promise<void>;
}

/**
 * 包装一个删除操作，自动 push 一条 undo entry。
 * 调用者只需在删除时调用本 hook 返回的函数即可。
 */
export function useDeleteUndo() {
  const pushUndo = useProjectStore((s) => s.pushUndo);

  return async function deleteWithUndo(opts: UndoableDeleteOptions) {
    // 先执行删除
    await opts.do();

    // 记录撤销点
    pushUndo({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      label: opts.label,
      undo: opts.restore,
      redo: opts.do,
    });
  };
}
