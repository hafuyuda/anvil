import { toast } from "./toast";

export type RunResult<T> = { ok: true; value: T } | { ok: false };

/**
 * 执行异步操作，失败时统一 toast 报错。
 *
 * 成功：返回 { ok: true, value }（value 为原返回值）
 * 失败：toast.error(`${label}: ${e}`) 并返回 { ok: false }
 *
 * 用法：
 *   const r = await runWithError(() => ipc.saveCard(next), "保存失败");
 *   if (!r.ok) return;
 *   // 继续
 *
 *   // 需要返回值时：
 *   const r = await runWithError(() => ipc.listThemes(), "读取失败");
 *   if (!r.ok) return;
 *   const themes = r.value;
 */
export async function runWithError<T>(
  fn: () => Promise<T>,
  label: string,
): Promise<RunResult<T>> {
  try {
    return { ok: true, value: await fn() };
  } catch (e) {
    toast.error(`${label}: ${e}`);
    return { ok: false };
  }
}
