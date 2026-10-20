import { useProjectStore } from "../stores/projectStore";
import { makeUndoId } from "../lib/id";

interface UndoableDeleteOptions {
  /** 撤销/重做时显示在按钮上的标签 */
  label: string;
  /** 执行删除。应该同时改磁盘和 store */
  do: () => Promise<void>;
  /** 恢复。应该同时改磁盘和 store */
  restore: () => Promise<void>;
  /**
   * 重做。默认复用 do。
   * do 里闭包的是动作那一刻的旧状态时，必须自己提供 redo ——
   * 否则重做会把用户在此期间的编辑整个吞掉。
   */
  redo?: () => Promise<void>;
}

/**
 * 包装一个删除操作，自动 push 一条 undo entry。
 * 调用者只需在删除时调用本 hook 返回的函数即可。
 *
 * restore / redo 里要读「当前」状态时，一律走
 * `useProjectStore.getState()`，不要用组件渲染时捕获的旧对象。
 */
export function useDeleteUndo() {
  const pushUndo = useProjectStore((s) => s.pushUndo);

  return async function deleteWithUndo(opts: UndoableDeleteOptions) {
    // 先执行删除
    await opts.do();

    // 记录撤销点
    pushUndo({
      id: makeUndoId(),
      label: opts.label,
      undo: opts.restore,
      redo: opts.redo ?? opts.do,
    });
  };
}
