/**
 * 键盘辅助。
 *
 * 跨模块的重复逻辑：命令修饰键判定、可编辑上下文判定。集中一处，避免
 * 各处复制 `e.ctrlKey || e.metaKey` 与 INPUT/TEXTAREA/SELECT/isContentEditable 判断。
 */

/** 是否按下了命令修饰键（Ctrl 或 ⌘）。 */
export function isModified(
  e: KeyboardEvent | WheelEvent | PointerEvent | { ctrlKey: boolean; metaKey: boolean },
): boolean {
  return e.ctrlKey || e.metaKey;
}

/** 事件目标是否处于可编辑上下文（输入框 / 文本域 / 下拉 / contentEditable）。 */
export function isEditableTarget(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  if (!el || !el.tagName) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    el.isContentEditable
  );
}
